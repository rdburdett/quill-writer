"use client";

/**
 * Project Hook
 * 
 * Manages project state including opening folders, loading/saving
 * the .quill file, and syncing with the filesystem.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import type { QuillProject, FolderNode, Block } from "@/lib/project/types";
import {
	pickDirectory,
	checkPermission,
	requestPermission,
	storeDirectoryHandle,
	retrieveStoredHandle,
	clearStoredHandle,
	createDirectory,
	writeTextFile,
} from "@/lib/filesystem";
import { scanDirectory } from "@/lib/filesystem/scanner";
import {
	loadProject,
	saveProject,
	syncBlocksWithFilesystem,
	loadBlock,
} from "@/lib/project/loader";
import {
	createFileWatcher,
	createDebouncedChangeHandler,
	type FileWatcher,
	type FileChange,
} from "@/lib/filesystem/watcher";

// =============================================================================
// Types
// =============================================================================

export interface ProjectState {
	/** Whether a project is currently open */
	isOpen: boolean;
	/** Whether the project is currently loading */
	isLoading: boolean;
	/** The root directory handle */
	directoryHandle: FileSystemDirectoryHandle | null;
	/** The loaded project data */
	project: QuillProject | null;
	/** The folder tree structure */
	folderTree: FolderNode[];
	/** Any error that occurred */
	error: Error | null;
	/** Whether there are unsaved changes */
	hasUnsavedChanges: boolean;
	/** Whether file watching is active */
	isWatching: boolean;
}

export interface ProjectActions {
	/** Open an existing project folder */
	openProject: () => Promise<void>;
	/** Create a new project with default folder structure */
	createNewProject: () => Promise<void>;
	/** Try to restore the last opened project */
	restoreLastProject: () => Promise<boolean>;
	/** Close the current project */
	closeProject: () => void;
	/** Save the project */
	saveProject: () => Promise<void>;
	/** Refresh the folder tree */
	refreshTree: () => Promise<void>;
	/** Update project data */
	updateProject: (updates: Partial<QuillProject>) => void;
	/** Load a specific block */
	loadBlock: (filePath: string) => Promise<Block | null>;
	/** Start file watching */
	startWatching: () => void;
	/** Stop file watching */
	stopWatching: () => void;
}

// =============================================================================
// Hook
// =============================================================================

export function useProject(): ProjectState & ProjectActions {
	const [state, setState] = useState<ProjectState>({
		isOpen: false,
		isLoading: false,
		directoryHandle: null,
		project: null,
		folderTree: [],
		error: null,
		hasUnsavedChanges: false,
		isWatching: false,
	});

	const watcherRef = useRef<FileWatcher | null>(null);
	const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// ==========================================================================
	// Auto-save on project changes
	// ==========================================================================

	useEffect(() => {
		if (!state.hasUnsavedChanges || !state.directoryHandle || !state.project) {
			return;
		}

		// Debounce saves
		if (saveTimeoutRef.current) {
			clearTimeout(saveTimeoutRef.current);
		}

		saveTimeoutRef.current = setTimeout(async () => {
			try {
				await saveProject(state.directoryHandle!, state.project!);
				setState((prev) => ({ ...prev, hasUnsavedChanges: false }));
			} catch (error) {
				console.error("Failed to auto-save project:", error);
			}
		}, 1000);

		return () => {
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}
		};
	}, [state.hasUnsavedChanges, state.directoryHandle, state.project]);

	// ==========================================================================
	// File watcher callback
	// ==========================================================================

	const handleFileChanges = useCallback(
		async (changes: FileChange[]) => {
			if (!state.directoryHandle || !state.project) return;

			console.log("File changes detected:", changes);

			// Sync blocks with filesystem
			const { project: syncedProject, added, removed } = await syncBlocksWithFilesystem(
				state.directoryHandle,
				state.project
			);

			// Refresh the folder tree
			const tree = await scanDirectory(state.directoryHandle);

			setState((prev) => ({
				...prev,
				project: syncedProject,
				folderTree: tree,
				hasUnsavedChanges: added.length > 0 || removed.length > 0,
			}));
		},
		[state.directoryHandle, state.project]
	);

	// ==========================================================================
	// Actions
	// ==========================================================================

	const openProject = useCallback(async () => {
		try {
			// IMPORTANT: Call picker FIRST before any state updates
			// to preserve the user gesture context
			console.log("[Quill] Opening directory picker...");
			const handle = await pickDirectory();
			if (!handle) {
				console.log("[Quill] User cancelled directory picker");
				return;
			}

			// Now we can update state
			setState((prev) => ({ ...prev, isLoading: true, error: null }));
			console.log("[Quill] Directory selected:", handle.name);

			// Request permission
			console.log("[Quill] Requesting permission...");
			const hasPermission = await requestPermission(handle);
			if (!hasPermission) {
				throw new Error("Permission denied to access folder");
			}
			console.log("[Quill] Permission granted");

			// Store handle for later restoration
			console.log("[Quill] Storing handle for session persistence...");
			await storeDirectoryHandle(handle);

			// Load project
			console.log("[Quill] Loading project...");
			const project = await loadProject(handle);
			console.log("[Quill] Project loaded:", project.name);

			// Sync with filesystem
			console.log("[Quill] Syncing blocks with filesystem...");
			const { project: syncedProject } = await syncBlocksWithFilesystem(handle, project);

			// Save if there were changes
			if (JSON.stringify(project.blocks) !== JSON.stringify(syncedProject.blocks)) {
				console.log("[Quill] Saving synced project...");
				await saveProject(handle, syncedProject);
			}

			// Scan folder tree
			console.log("[Quill] Scanning folder tree...");
			const tree = await scanDirectory(handle);
			console.log("[Quill] Folder tree scanned, found", tree.length, "root items");

			console.log("[Quill] Project opened successfully!");
			setState({
				isOpen: true,
				isLoading: false,
				directoryHandle: handle,
				project: syncedProject,
				folderTree: tree,
				error: null,
				hasUnsavedChanges: false,
				isWatching: false,
			});
		} catch (error) {
			console.error("[Quill] Error opening project:", error);
			setState((prev) => ({
				...prev,
				isLoading: false,
				error: error instanceof Error ? error : new Error(String(error)),
			}));
		}
	}, []);

	const createNewProject = useCallback(async () => {
		try {
			// IMPORTANT: Call picker FIRST before any state updates
			// to preserve the user gesture context
			console.log("[Quill] Creating new project - opening directory picker...");
			const handle = await pickDirectory();
			if (!handle) {
				console.log("[Quill] User cancelled directory picker");
				return;
			}

			// Now we can update state
			setState((prev) => ({ ...prev, isLoading: true, error: null }));
			console.log("[Quill] Directory selected:", handle.name);

			// Request permission
			console.log("[Quill] Requesting permission...");
			const hasPermission = await requestPermission(handle);
			if (!hasPermission) {
				throw new Error("Permission denied to access folder");
			}
			console.log("[Quill] Permission granted");

			// Store handle for later restoration
			await storeDirectoryHandle(handle);

			// Create default folder structure
			console.log("[Quill] Creating default folder structure...");
			const defaultFolders = ["unsorted", "chapters", "worldbuilding", "characters", "notes"];
			for (const folder of defaultFolders) {
				try {
					await createDirectory(handle, folder);
					console.log("[Quill] Created folder:", folder);
				} catch (e) {
					// Folder might already exist, that's fine
					console.log("[Quill] Folder may already exist:", folder);
				}
			}

			// Create a welcome file
			const welcomeContent = `# Welcome to ${handle.name}

This is your new writing project. Here's how to get started:

## Folder Structure

- **unsorted/** - Drop your ideas and drafts here
- **chapters/** - Organize your chapters
- **worldbuilding/** - Build your world
- **characters/** - Character profiles and notes
- **notes/** - General notes and research

## Tips

- Press \`/\` in the editor for formatting commands
- Drag files between folders to organize
- Your work is auto-saved as you type
- Edit these files in any text editor - they're just markdown!

Happy writing! ✍️
`;
			await writeTextFile(handle, "unsorted/welcome.md", welcomeContent);
			console.log("[Quill] Created welcome file");

			// Load project
			console.log("[Quill] Loading project...");
			const project = await loadProject(handle);

			// Sync with filesystem
			const { project: syncedProject } = await syncBlocksWithFilesystem(handle, project);
			await saveProject(handle, syncedProject);

			// Scan folder tree
			const tree = await scanDirectory(handle);
			console.log("[Quill] New project created successfully!");

			setState({
				isOpen: true,
				isLoading: false,
				directoryHandle: handle,
				project: syncedProject,
				folderTree: tree,
				error: null,
				hasUnsavedChanges: false,
				isWatching: false,
			});
		} catch (error) {
			console.error("[Quill] Error creating project:", error);
			setState((prev) => ({
				...prev,
				isLoading: false,
				error: error instanceof Error ? error : new Error(String(error)),
			}));
		}
	}, []);

	const restoreLastProject = useCallback(async (): Promise<boolean> => {
		setState((prev) => ({ ...prev, isLoading: true, error: null }));

		try {
			const handle = await retrieveStoredHandle();
			if (!handle) {
				setState((prev) => ({ ...prev, isLoading: false }));
				return false;
			}

			// Check/request permission
			const permState = await checkPermission(handle);
			if (permState !== "granted") {
				const granted = await requestPermission(handle);
				if (!granted) {
					await clearStoredHandle();
					setState((prev) => ({ ...prev, isLoading: false }));
					return false;
				}
			}

			// Load project
			const project = await loadProject(handle);
			const { project: syncedProject } = await syncBlocksWithFilesystem(handle, project);

			// Scan folder tree
			const tree = await scanDirectory(handle);

			setState({
				isOpen: true,
				isLoading: false,
				directoryHandle: handle,
				project: syncedProject,
				folderTree: tree,
				error: null,
				hasUnsavedChanges: false,
				isWatching: false,
			});

			return true;
		} catch (error) {
			await clearStoredHandle();
			setState((prev) => ({
				...prev,
				isLoading: false,
				error: error instanceof Error ? error : new Error(String(error)),
			}));
			return false;
		}
	}, []);

	const closeProject = useCallback(() => {
		// Stop watcher
		if (watcherRef.current) {
			watcherRef.current.stop();
			watcherRef.current = null;
		}

		setState({
			isOpen: false,
			isLoading: false,
			directoryHandle: null,
			project: null,
			folderTree: [],
			error: null,
			hasUnsavedChanges: false,
			isWatching: false,
		});
	}, []);

	const doSaveProject = useCallback(async () => {
		if (!state.directoryHandle || !state.project) return;

		try {
			await saveProject(state.directoryHandle, state.project);
			setState((prev) => ({ ...prev, hasUnsavedChanges: false }));
		} catch (error) {
			setState((prev) => ({
				...prev,
				error: error instanceof Error ? error : new Error(String(error)),
			}));
		}
	}, [state.directoryHandle, state.project]);

	const refreshTree = useCallback(async () => {
		if (!state.directoryHandle) return;

		try {
			const tree = await scanDirectory(state.directoryHandle);
			setState((prev) => ({ ...prev, folderTree: tree }));
		} catch (error) {
			console.error("Failed to refresh tree:", error);
		}
	}, [state.directoryHandle]);

	const updateProject = useCallback((updates: Partial<QuillProject>) => {
		setState((prev) => {
			if (!prev.project) return prev;
			return {
				...prev,
				project: { ...prev.project, ...updates },
				hasUnsavedChanges: true,
			};
		});
	}, []);

	const doLoadBlock = useCallback(
		async (filePath: string): Promise<Block | null> => {
			if (!state.directoryHandle || !state.project) return null;
			return loadBlock(state.directoryHandle, state.project, filePath);
		},
		[state.directoryHandle, state.project]
	);

	const startWatching = useCallback(() => {
		if (!state.directoryHandle || watcherRef.current) return;

		const debouncedHandler = createDebouncedChangeHandler(handleFileChanges);

		watcherRef.current = createFileWatcher(state.directoryHandle, {
			interval: 2000,
			onChanges: debouncedHandler,
			onError: (error) => console.error("File watcher error:", error),
		});

		watcherRef.current.start();
		setState((prev) => ({ ...prev, isWatching: true }));
	}, [state.directoryHandle, handleFileChanges]);

	const stopWatching = useCallback(() => {
		if (watcherRef.current) {
			watcherRef.current.stop();
			watcherRef.current = null;
		}
		setState((prev) => ({ ...prev, isWatching: false }));
	}, []);

	// ==========================================================================
	// Cleanup
	// ==========================================================================

	useEffect(() => {
		return () => {
			if (watcherRef.current) {
				watcherRef.current.stop();
			}
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}
		};
	}, []);

	return {
		...state,
		openProject,
		createNewProject,
		restoreLastProject,
		closeProject,
		saveProject: doSaveProject,
		refreshTree,
		updateProject,
		loadBlock: doLoadBlock,
		startWatching,
		stopWatching,
	};
}

