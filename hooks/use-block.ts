"use client";

/**
 * Block Hook
 * 
 * Manages the currently selected/editing block state.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import type { Block, QuillProject } from "@/lib/project/types";
import { readTextFile } from "@/lib/filesystem";
import { extractTitle, countWords } from "@/lib/filesystem/scanner";
import { createAutoSaver, type AutoSaver } from "@/lib/filesystem/writer";
import { createSingleFileWatcher, type FileWatcher } from "@/lib/filesystem/watcher";

// =============================================================================
// Types
// =============================================================================

export interface BlockState {
	/** The currently selected block */
	currentBlock: Block | null;
	/** Whether the block is loading */
	isLoading: boolean;
	/** Whether the block is saving */
	isSaving: boolean;
	/** Whether there are unsaved changes */
	hasUnsavedChanges: boolean;
	/** Any error that occurred */
	error: Error | null;
	/** Whether the file was modified externally */
	externallyModified: boolean;
}

export interface BlockActions {
	/** Open a block for editing */
	openBlock: (filePath: string) => Promise<void>;
	/** Close the current block */
	closeBlock: () => void;
	/** Update the block content */
	updateContent: (content: string) => void;
	/** Save the block immediately */
	saveBlock: () => Promise<void>;
	/** Reload the block from disk */
	reloadBlock: () => Promise<void>;
	/** Dismiss external modification warning */
	dismissExternalModification: () => void;
}

export interface UseBlockOptions {
	directoryHandle: FileSystemDirectoryHandle | null;
	project: QuillProject | null;
	onBlockSaved?: (filePath: string) => void;
	autoSaveDelay?: number;
}

// =============================================================================
// Hook
// =============================================================================

export function useBlock(options: UseBlockOptions): BlockState & BlockActions {
	const { directoryHandle, project, onBlockSaved, autoSaveDelay = 1000 } = options;

	const [state, setState] = useState<BlockState>({
		currentBlock: null,
		isLoading: false,
		isSaving: false,
		hasUnsavedChanges: false,
		error: null,
		externallyModified: false,
	});

	const autoSaverRef = useRef<AutoSaver | null>(null);
	const watcherRef = useRef<FileWatcher | null>(null);
	const lastSavedContentRef = useRef<string | null>(null);
	const lastSaveTimeRef = useRef<number>(0); // Track when we last saved
	const SAVE_GRACE_PERIOD = 2000; // Ignore file changes for 2s after saving

	// ==========================================================================
	// Cleanup previous block resources
	// ==========================================================================

	const cleanup = useCallback(() => {
		if (autoSaverRef.current) {
			autoSaverRef.current.cancel();
			autoSaverRef.current = null;
		}
		if (watcherRef.current) {
			watcherRef.current.stop();
			watcherRef.current = null;
		}
		lastSavedContentRef.current = null;
	}, []);

	// ==========================================================================
	// Actions
	// ==========================================================================

	const openBlock = useCallback(
		async (filePath: string) => {
			if (!directoryHandle || !project) return;

			// Cleanup previous block
			cleanup();

			setState((prev) => ({ ...prev, isLoading: true, error: null }));

			try {
				// Read the file content
				const content = await readTextFile(directoryHandle, filePath);
				const filename = filePath.split("/").pop() ?? filePath;
				const metadata = project.blocks[filePath];

				const block: Block = {
					id: metadata?.id ?? crypto.randomUUID(),
					filePath,
					title: extractTitle(content, filename),
					wordCount: countWords(content),
					tags: metadata?.tags ?? [],
					characterIds: metadata?.characterIds ?? [],
					color: metadata?.color,
					lastModified: Date.now(),
					content,
					arrangement: metadata?.arrangement,
				};

				lastSavedContentRef.current = content;

				// Create auto-saver
				autoSaverRef.current = createAutoSaver(directoryHandle, filePath, {
					delay: autoSaveDelay,
					onBeforeSave: () => {
						setState((prev) => ({ ...prev, isSaving: true }));
					},
					onSaved: () => {
						// Track when we saved so we can ignore file watcher notifications
						lastSaveTimeRef.current = Date.now();
						setState((prev) => ({
							...prev,
							isSaving: false,
							hasUnsavedChanges: false,
						}));
						if (onBlockSaved) {
							onBlockSaved(filePath);
						}
					},
					onError: (error) => {
						setState((prev) => ({ ...prev, isSaving: false, error }));
					},
				});

				// Create file watcher for external changes
				watcherRef.current = createSingleFileWatcher(directoryHandle, filePath, {
					interval: 2000, // Check every 2 seconds
					onModified: () => {
						// Ignore file changes that happen shortly after we saved
						// This prevents false "externally modified" warnings from our own saves
						const timeSinceLastSave = Date.now() - lastSaveTimeRef.current;
						if (timeSinceLastSave > SAVE_GRACE_PERIOD) {
							setState((prev) => ({ ...prev, externallyModified: true }));
						}
					},
					onDeleted: () => {
						setState((prev) => ({
							...prev,
							error: new Error("File was deleted externally"),
						}));
					},
				});
				watcherRef.current.start();

				setState({
					currentBlock: block,
					isLoading: false,
					isSaving: false,
					hasUnsavedChanges: false,
					error: null,
					externallyModified: false,
				});
			} catch (error) {
				setState((prev) => ({
					...prev,
					isLoading: false,
					error: error instanceof Error ? error : new Error(String(error)),
				}));
			}
		},
		[directoryHandle, project, autoSaveDelay, cleanup, onBlockSaved]
	);

	const closeBlock = useCallback(() => {
		cleanup();
		setState({
			currentBlock: null,
			isLoading: false,
			isSaving: false,
			hasUnsavedChanges: false,
			error: null,
			externallyModified: false,
		});
	}, [cleanup]);

	const updateContent = useCallback((content: string) => {
		setState((prev) => {
			if (!prev.currentBlock) return prev;

			const filename = prev.currentBlock.filePath.split("/").pop() ?? "";

			return {
				...prev,
				currentBlock: {
					...prev.currentBlock,
					content,
					title: extractTitle(content, filename),
					wordCount: countWords(content),
				},
				hasUnsavedChanges: content !== lastSavedContentRef.current,
			};
		});

		// Trigger auto-save
		if (autoSaverRef.current) {
			autoSaverRef.current.save(content);
			lastSavedContentRef.current = content;
		}
	}, []);

	const saveBlock = useCallback(async () => {
		if (!autoSaverRef.current) return;
		await autoSaverRef.current.flush();
	}, []);

	const reloadBlock = useCallback(async () => {
		if (!state.currentBlock || !directoryHandle) return;

		const filePath = state.currentBlock.filePath;

		try {
			const content = await readTextFile(directoryHandle, filePath);
			const filename = filePath.split("/").pop() ?? filePath;

			lastSavedContentRef.current = content;

			setState((prev) => ({
				...prev,
				currentBlock: prev.currentBlock
					? {
							...prev.currentBlock,
							content,
							title: extractTitle(content, filename),
							wordCount: countWords(content),
					  }
					: null,
				hasUnsavedChanges: false,
				externallyModified: false,
			}));
		} catch (error) {
			setState((prev) => ({
				...prev,
				error: error instanceof Error ? error : new Error(String(error)),
			}));
		}
	}, [state.currentBlock, directoryHandle]);

	const dismissExternalModification = useCallback(() => {
		setState((prev) => ({ ...prev, externallyModified: false }));
	}, []);

	// ==========================================================================
	// Cleanup on unmount or directory change
	// ==========================================================================

	useEffect(() => {
		return cleanup;
	}, [cleanup, directoryHandle]);

	return {
		...state,
		openBlock,
		closeBlock,
		updateContent,
		saveBlock,
		reloadBlock,
		dismissExternalModification,
	};
}

