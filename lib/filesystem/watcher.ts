/**
 * File Watcher
 * 
 * Watches for external file changes using polling.
 * Note: The File System Access API doesn't support native file watching,
 * so we poll for changes. Electron/Tauri can use native watchers.
 */

import type { FolderNode } from "@/lib/project/types";
import { scanDirectory, SUPPORTED_EXTENSIONS } from "./scanner";
import { getFileMetadata } from "./index";

// =============================================================================
// Types
// =============================================================================

export interface FileChange {
	type: "added" | "modified" | "deleted";
	path: string;
	oldLastModified?: number;
	newLastModified?: number;
}

export interface WatcherOptions {
	/** Polling interval in ms (default: 2000) */
	interval?: number;
	/** Callback when changes are detected */
	onChanges?: (changes: FileChange[]) => void;
	/** Callback when an error occurs */
	onError?: (error: Error) => void;
}

export interface FileWatcher {
	start: () => void;
	stop: () => void;
	isRunning: () => boolean;
	checkNow: () => Promise<FileChange[]>;
}

// =============================================================================
// Watcher Implementation
// =============================================================================

/**
 * Create a file watcher for a directory
 */
export function createFileWatcher(
	directoryHandle: FileSystemDirectoryHandle,
	options: WatcherOptions = {}
): FileWatcher {
	const {
		interval = 2000,
		onChanges,
		onError,
	} = options;

	let isRunning = false;
	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	let lastSnapshot: Map<string, number> = new Map();

	/**
	 * Build a snapshot of all file modification times
	 */
	async function buildSnapshot(): Promise<Map<string, number>> {
		const snapshot = new Map<string, number>();
		const tree = await scanDirectory(directoryHandle);
		
		function traverse(nodes: FolderNode[]) {
			for (const node of nodes) {
				if (node.type === "file" && node.lastModified) {
					snapshot.set(node.path, node.lastModified);
				} else if (node.children) {
					traverse(node.children);
				}
			}
		}
		
		traverse(tree);
		return snapshot;
	}

	/**
	 * Compare two snapshots and return changes
	 */
	function compareSnapshots(
		oldSnapshot: Map<string, number>,
		newSnapshot: Map<string, number>
	): FileChange[] {
		const changes: FileChange[] = [];

		// Check for added and modified files
		for (const [path, newTime] of newSnapshot) {
			const oldTime = oldSnapshot.get(path);
			
			if (oldTime === undefined) {
				changes.push({
					type: "added",
					path,
					newLastModified: newTime,
				});
			} else if (oldTime !== newTime) {
				changes.push({
					type: "modified",
					path,
					oldLastModified: oldTime,
					newLastModified: newTime,
				});
			}
		}

		// Check for deleted files
		for (const [path, oldTime] of oldSnapshot) {
			if (!newSnapshot.has(path)) {
				changes.push({
					type: "deleted",
					path,
					oldLastModified: oldTime,
				});
			}
		}

		return changes;
	}

	/**
	 * Perform a single check for changes
	 */
	async function checkForChanges(): Promise<FileChange[]> {
		try {
			const newSnapshot = await buildSnapshot();
			const changes = compareSnapshots(lastSnapshot, newSnapshot);
			lastSnapshot = newSnapshot;
			return changes;
		} catch (error) {
			if (onError && error instanceof Error) {
				onError(error);
			}
			return [];
		}
	}

	/**
	 * Polling loop
	 */
	async function poll() {
		if (!isRunning) return;

		const changes = await checkForChanges();
		
		if (changes.length > 0 && onChanges) {
			onChanges(changes);
		}

		if (isRunning) {
			timeoutId = setTimeout(poll, interval);
		}
	}

	return {
		start: async () => {
			if (isRunning) return;
			
			isRunning = true;
			// Build initial snapshot
			lastSnapshot = await buildSnapshot();
			// Start polling
			timeoutId = setTimeout(poll, interval);
		},

		stop: () => {
			isRunning = false;
			if (timeoutId) {
				clearTimeout(timeoutId);
				timeoutId = null;
			}
		},

		isRunning: () => isRunning,

		checkNow: async () => {
			return await checkForChanges();
		},
	};
}

// =============================================================================
// Single File Watcher
// =============================================================================

export interface SingleFileWatcherOptions {
	/** Polling interval in ms (default: 1000) */
	interval?: number;
	/** Callback when the file is modified */
	onModified?: (newLastModified: number) => void;
	/** Callback when the file is deleted */
	onDeleted?: () => void;
	/** Callback when an error occurs */
	onError?: (error: Error) => void;
}

/**
 * Create a watcher for a single file
 */
export function createSingleFileWatcher(
	directoryHandle: FileSystemDirectoryHandle,
	filePath: string,
	options: SingleFileWatcherOptions = {}
): FileWatcher {
	const {
		interval = 1000,
		onModified,
		onDeleted,
		onError,
	} = options;

	let isRunning = false;
	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	let lastModified: number | null = null;

	async function checkFile(): Promise<FileChange[]> {
		try {
			const metadata = await getFileMetadata(directoryHandle, filePath);
			
			if (lastModified !== null && metadata.lastModified !== lastModified) {
				const change: FileChange = {
					type: "modified",
					path: filePath,
					oldLastModified: lastModified,
					newLastModified: metadata.lastModified,
				};
				lastModified = metadata.lastModified;
				
				if (onModified) {
					onModified(metadata.lastModified);
				}
				
				return [change];
			}
			
			lastModified = metadata.lastModified;
			return [];
		} catch (error) {
			// File might have been deleted
			if (lastModified !== null) {
				const change: FileChange = {
					type: "deleted",
					path: filePath,
					oldLastModified: lastModified,
				};
				lastModified = null;
				
				if (onDeleted) {
					onDeleted();
				}
				
				return [change];
			}
			
			if (onError && error instanceof Error) {
				onError(error);
			}
			return [];
		}
	}

	async function poll() {
		if (!isRunning) return;

		await checkFile();

		if (isRunning) {
			timeoutId = setTimeout(poll, interval);
		}
	}

	return {
		start: async () => {
			if (isRunning) return;
			
			isRunning = true;
			// Get initial modification time
			try {
				const metadata = await getFileMetadata(directoryHandle, filePath);
				lastModified = metadata.lastModified;
			} catch {
				lastModified = null;
			}
			// Start polling
			timeoutId = setTimeout(poll, interval);
		},

		stop: () => {
			isRunning = false;
			if (timeoutId) {
				clearTimeout(timeoutId);
				timeoutId = null;
			}
		},

		isRunning: () => isRunning,

		checkNow: async () => {
			return await checkFile();
		},
	};
}

// =============================================================================
// Debounced Change Handler
// =============================================================================

/**
 * Create a debounced change handler to batch rapid changes
 */
export function createDebouncedChangeHandler(
	handler: (changes: FileChange[]) => void,
	delay: number = 500
): (changes: FileChange[]) => void {
	let pendingChanges: FileChange[] = [];
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	return (changes: FileChange[]) => {
		pendingChanges.push(...changes);

		if (timeoutId) {
			clearTimeout(timeoutId);
		}

		timeoutId = setTimeout(() => {
			// Deduplicate changes (keep latest for each path)
			const latestChanges = new Map<string, FileChange>();
			for (const change of pendingChanges) {
				latestChanges.set(change.path, change);
			}

			handler(Array.from(latestChanges.values()));
			pendingChanges = [];
			timeoutId = null;
		}, delay);
	};
}

