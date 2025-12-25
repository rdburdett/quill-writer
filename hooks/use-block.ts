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
	/** Map of open blocks keyed by file path */
	openBlocks: Map<string, Block>;
	/** The currently active block file path */
	activeBlockPath: string | null;
	/** Map of loading states keyed by file path */
	loadingBlocks: Set<string>;
	/** Map of saving states keyed by file path */
	savingBlocks: Set<string>;
	/** Map of unsaved changes keyed by file path */
	unsavedBlocks: Set<string>;
	/** Map of errors keyed by file path */
	blockErrors: Map<string, Error>;
	/** Map of externally modified flags keyed by file path */
	externallyModifiedBlocks: Set<string>;
}

export interface BlockActions {
	/** Open a block for editing (adds to open blocks, sets as active) */
	openBlock: (filePath: string) => Promise<void>;
	/** Close a specific block */
	closeBlock: (filePath: string) => void;
	/** Close all blocks */
	closeAllBlocks: () => void;
	/** Set the active block */
	setActiveBlock: (filePath: string) => void;
	/** Get a specific block */
	getBlock: (filePath: string) => Block | null;
	/** Update the block content */
	updateContent: (filePath: string, content: string) => void;
	/** Save a specific block immediately */
	saveBlock: (filePath: string) => Promise<void>;
	/** Reload a block from disk */
	reloadBlock: (filePath: string) => Promise<void>;
	/** Dismiss external modification warning for a block */
	dismissExternalModification: (filePath: string) => void;
	/** Get the active block (convenience method) */
	getActiveBlock: () => Block | null;
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
		openBlocks: new Map(),
		activeBlockPath: null,
		loadingBlocks: new Set(),
		savingBlocks: new Set(),
		unsavedBlocks: new Set(),
		blockErrors: new Map(),
		externallyModifiedBlocks: new Set(),
	});

	// Map of auto-savers keyed by file path
	const autoSaversRef = useRef<Map<string, AutoSaver>>(new Map());
	// Map of file watchers keyed by file path
	const watchersRef = useRef<Map<string, FileWatcher>>(new Map());
	// Map of last saved content keyed by file path
	const lastSavedContentRef = useRef<Map<string, string>>(new Map());
	// Map of last save times keyed by file path
	const lastSaveTimeRef = useRef<Map<string, number>>(new Map());
	const SAVE_GRACE_PERIOD = 2000; // Ignore file changes for 2s after saving

	// ==========================================================================
	// Cleanup block resources
	// ==========================================================================

	const cleanupBlock = useCallback((filePath: string) => {
		const autoSaver = autoSaversRef.current.get(filePath);
		if (autoSaver) {
			autoSaver.cancel();
			autoSaversRef.current.delete(filePath);
		}
		const watcher = watchersRef.current.get(filePath);
		if (watcher) {
			watcher.stop();
			watchersRef.current.delete(filePath);
		}
		lastSavedContentRef.current.delete(filePath);
		lastSaveTimeRef.current.delete(filePath);
	}, []);

	const cleanupAll = useCallback(() => {
		autoSaversRef.current.forEach((saver) => saver.cancel());
		autoSaversRef.current.clear();
		watchersRef.current.forEach((watcher) => watcher.stop());
		watchersRef.current.clear();
		lastSavedContentRef.current.clear();
		lastSaveTimeRef.current.clear();
	}, []);

	// ==========================================================================
	// Actions
	// ==========================================================================

	const openBlock = useCallback(
		async (filePath: string) => {
			if (!directoryHandle || !project) return;

			// If already open, just set as active
			if (state.openBlocks.has(filePath)) {
				setState((prev) => ({ ...prev, activeBlockPath: filePath }));
				return;
			}

			setState((prev) => {
				const errors = new Map(prev.blockErrors);
				errors.delete(filePath);
				return {
					...prev,
					loadingBlocks: new Set(prev.loadingBlocks).add(filePath),
					blockErrors: errors,
				};
			});

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

				lastSavedContentRef.current.set(filePath, content);

				// Create auto-saver
				const autoSaver = createAutoSaver(directoryHandle, filePath, {
					delay: autoSaveDelay,
					onBeforeSave: () => {
						setState((prev) => {
							const saving = new Set(prev.savingBlocks);
							saving.add(filePath);
							return { ...prev, savingBlocks: saving };
						});
					},
					onSaved: () => {
						// Track when we saved so we can ignore file watcher notifications
						lastSaveTimeRef.current.set(filePath, Date.now());
						setState((prev) => {
							const saving = new Set(prev.savingBlocks);
							saving.delete(filePath);
							const unsaved = new Set(prev.unsavedBlocks);
							unsaved.delete(filePath);
							return { ...prev, savingBlocks: saving, unsavedBlocks: unsaved };
						});
						if (onBlockSaved) {
							onBlockSaved(filePath);
						}
					},
					onError: (error) => {
						setState((prev) => {
							const saving = new Set(prev.savingBlocks);
							saving.delete(filePath);
							const errors = new Map(prev.blockErrors);
							errors.set(filePath, error);
							return { ...prev, savingBlocks: saving, blockErrors: errors };
						});
					},
				});
				autoSaversRef.current.set(filePath, autoSaver);

				// Create file watcher for external changes
				const watcher = createSingleFileWatcher(directoryHandle, filePath, {
					interval: 2000, // Check every 2 seconds
					onModified: () => {
						// Ignore file changes that happen shortly after we saved
						const lastSaveTime = lastSaveTimeRef.current.get(filePath) ?? 0;
						const timeSinceLastSave = Date.now() - lastSaveTime;
						if (timeSinceLastSave > SAVE_GRACE_PERIOD) {
							setState((prev) => {
								const modified = new Set(prev.externallyModifiedBlocks);
								modified.add(filePath);
								return { ...prev, externallyModifiedBlocks: modified };
							});
						}
					},
					onDeleted: () => {
						setState((prev) => {
							const errors = new Map(prev.blockErrors);
							errors.set(filePath, new Error("File was deleted externally"));
							return { ...prev, blockErrors: errors };
						});
					},
				});
				watcher.start();
				watchersRef.current.set(filePath, watcher);

				setState((prev) => {
					const openBlocks = new Map(prev.openBlocks);
					openBlocks.set(filePath, block);
					const loading = new Set(prev.loadingBlocks);
					loading.delete(filePath);
					return {
						...prev,
						openBlocks,
						activeBlockPath: filePath,
						loadingBlocks: loading,
					};
				});
			} catch (error) {
				setState((prev) => {
					const loading = new Set(prev.loadingBlocks);
					loading.delete(filePath);
					const errors = new Map(prev.blockErrors);
					errors.set(filePath, error instanceof Error ? error : new Error(String(error)));
					return { ...prev, loadingBlocks: loading, blockErrors: errors };
				});
			}
		},
		[directoryHandle, project, autoSaveDelay, onBlockSaved, state.openBlocks]
	);

	const closeBlock = useCallback(
		(filePath: string) => {
			cleanupBlock(filePath);
			setState((prev) => {
				const openBlocks = new Map(prev.openBlocks);
				openBlocks.delete(filePath);
				const loading = new Set(prev.loadingBlocks);
				loading.delete(filePath);
				const saving = new Set(prev.savingBlocks);
				saving.delete(filePath);
				const unsaved = new Set(prev.unsavedBlocks);
				unsaved.delete(filePath);
				const errors = new Map(prev.blockErrors);
				errors.delete(filePath);
				const modified = new Set(prev.externallyModifiedBlocks);
				modified.delete(filePath);

				// If closing the active block, switch to another open block or null
				let activeBlockPath = prev.activeBlockPath;
				if (activeBlockPath === filePath) {
					// Find another open block
					const remainingPaths = Array.from(openBlocks.keys());
					activeBlockPath = remainingPaths.length > 0 ? remainingPaths[remainingPaths.length - 1] : null;
				}

				return {
					...prev,
					openBlocks,
					activeBlockPath,
					loadingBlocks: loading,
					savingBlocks: saving,
					unsavedBlocks: unsaved,
					blockErrors: errors,
					externallyModifiedBlocks: modified,
				};
			});
		},
		[cleanupBlock]
	);

	const closeAllBlocks = useCallback(() => {
		cleanupAll();
		setState({
			openBlocks: new Map(),
			activeBlockPath: null,
			loadingBlocks: new Set(),
			savingBlocks: new Set(),
			unsavedBlocks: new Set(),
			blockErrors: new Map(),
			externallyModifiedBlocks: new Set(),
		});
	}, [cleanupAll]);

	const setActiveBlock = useCallback((filePath: string) => {
		setState((prev) => {
			if (!prev.openBlocks.has(filePath)) return prev;
			return { ...prev, activeBlockPath: filePath };
		});
	}, []);

	const getBlock = useCallback(
		(filePath: string) => {
			return state.openBlocks.get(filePath) ?? null;
		},
		[state.openBlocks]
	);

	const getActiveBlock = useCallback(() => {
		if (!state.activeBlockPath) return null;
		return state.openBlocks.get(state.activeBlockPath) ?? null;
	}, [state.activeBlockPath, state.openBlocks]);

	const updateContent = useCallback(
		(filePath: string, content: string) => {
			setState((prev) => {
				const block = prev.openBlocks.get(filePath);
				if (!block) return prev;

				const filename = filePath.split("/").pop() ?? "";
				const lastSaved = lastSavedContentRef.current.get(filePath);
				const hasUnsaved = content !== lastSaved;

				const updatedBlock: Block = {
					...block,
					content,
					title: extractTitle(content, filename),
					wordCount: countWords(content),
				};

				const openBlocks = new Map(prev.openBlocks);
				openBlocks.set(filePath, updatedBlock);

				const unsaved = new Set(prev.unsavedBlocks);
				if (hasUnsaved) {
					unsaved.add(filePath);
				} else {
					unsaved.delete(filePath);
				}

				return {
					...prev,
					openBlocks,
					unsavedBlocks: unsaved,
				};
			});

			// Trigger auto-save
			const autoSaver = autoSaversRef.current.get(filePath);
			if (autoSaver) {
				autoSaver.save(content);
				lastSavedContentRef.current.set(filePath, content);
			}
		},
		[]
	);

	const saveBlock = useCallback(async (filePath: string) => {
		const autoSaver = autoSaversRef.current.get(filePath);
		if (!autoSaver) return;
		await autoSaver.flush();
	}, []);

	const reloadBlock = useCallback(
		async (filePath: string) => {
			if (!directoryHandle) return;

			try {
				const content = await readTextFile(directoryHandle, filePath);
				const filename = filePath.split("/").pop() ?? filePath;

				lastSavedContentRef.current.set(filePath, content);

				setState((prev) => {
					const block = prev.openBlocks.get(filePath);
					if (!block) return prev;

					const updatedBlock: Block = {
						...block,
						content,
						title: extractTitle(content, filename),
						wordCount: countWords(content),
					};

					const openBlocks = new Map(prev.openBlocks);
					openBlocks.set(filePath, updatedBlock);
					const unsaved = new Set(prev.unsavedBlocks);
					unsaved.delete(filePath);
					const modified = new Set(prev.externallyModifiedBlocks);
					modified.delete(filePath);
					const errors = new Map(prev.blockErrors);
					errors.delete(filePath);

					return {
						...prev,
						openBlocks,
						unsavedBlocks: unsaved,
						externallyModifiedBlocks: modified,
						blockErrors: errors,
					};
				});
			} catch (error) {
				setState((prev) => {
					const errors = new Map(prev.blockErrors);
					errors.set(filePath, error instanceof Error ? error : new Error(String(error)));
					return { ...prev, blockErrors: errors };
				});
			}
		},
		[directoryHandle]
	);

	const dismissExternalModification = useCallback((filePath: string) => {
		setState((prev) => {
			const modified = new Set(prev.externallyModifiedBlocks);
			modified.delete(filePath);
			return { ...prev, externallyModifiedBlocks: modified };
		});
	}, []);

	// ==========================================================================
	// Cleanup on unmount or directory change
	// ==========================================================================

	useEffect(() => {
		return cleanupAll;
	}, [cleanupAll, directoryHandle]);

	return {
		...state,
		openBlock,
		closeBlock,
		closeAllBlocks,
		setActiveBlock,
		getBlock,
		updateContent,
		saveBlock,
		reloadBlock,
		dismissExternalModification,
		getActiveBlock,
	};
}

