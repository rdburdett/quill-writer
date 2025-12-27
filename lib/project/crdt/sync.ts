/**
 * Sync Service (Stubbed)
 * 
 * Provides hooks for syncing Yjs updates with a remote server.
 * Currently stubbed for offline-first operation; will be extended
 * when backend sync is implemented.
 */

import * as Y from "yjs";
// import axios from "axios"; // Will be used when backend sync is implemented
import type { OplogEntry } from "./format";
import { replayOplog } from "./yjs-doc";

// =============================================================================
// Types
// =============================================================================

export interface SyncState {
	/** Whether sync is currently active */
	isSyncing: boolean;
	/** Whether we're currently online */
	isOnline: boolean;
	/** Last sync timestamp */
	lastSyncAt: number | null;
	/** Number of pending operations */
	pendingOps: number;
	/** Sync error if any */
	error: Error | null;
}

export interface SyncConfig {
	/** Server endpoint for sync (optional) */
	serverUrl?: string;
	/** Project ID */
	projectId: string;
	/** Client ID */
	clientId: string;
	/** Checkpoint interval (number of ops before checkpoint) */
	checkpointInterval?: number;
}

// =============================================================================
// Sync Service
// =============================================================================

export class SyncService {
	private config: SyncConfig;
	private state: SyncState;
	private pendingUpdates: Uint8Array[] = [];
	private syncInterval: ReturnType<typeof setInterval> | null = null;
	
	constructor(config: SyncConfig) {
		this.config = {
			checkpointInterval: 100,
			...config,
		};
		
		this.state = {
			isSyncing: false,
			isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
			lastSyncAt: null,
			pendingOps: 0,
			error: null,
		};
		
		// Listen for online/offline events
		if (typeof window !== "undefined") {
			window.addEventListener("online", () => {
				this.state.isOnline = true;
				this.sync();
			});
			window.addEventListener("offline", () => {
				this.state.isOnline = false;
			});
		}
	}
	
	/**
	 * Get current sync state
	 */
	getState(): SyncState {
		return { ...this.state };
	}
	
	/**
	 * Queue an update for sync
	 */
	queueUpdate(update: Uint8Array): void {
		this.pendingUpdates.push(update);
		this.state.pendingOps = this.pendingUpdates.length;
		
		// Auto-sync if online and not already syncing
		if (this.state.isOnline && !this.state.isSyncing && this.config.serverUrl) {
			// Debounce sync
			if (this.syncInterval) {
				clearTimeout(this.syncInterval);
			}
			this.syncInterval = setTimeout(() => {
				this.sync();
			}, 1000);
		}
	}
	
	/**
	 * Sync pending updates with server
	 */
	async sync(): Promise<void> {
		if (!this.config.serverUrl || !this.state.isOnline) {
			return;
		}
		
		if (this.state.isSyncing) {
			return;
		}
		
		if (this.pendingUpdates.length === 0) {
			return;
		}
		
		this.state.isSyncing = true;
		this.state.error = null;
		
		try {
			// Convert updates to oplog entries (for future server sync)
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const _entries: OplogEntry[] = this.pendingUpdates.map((update) => ({
				ts: new Date().toISOString(),
				clientId: this.config.clientId,
				update: btoa(String.fromCharCode(...update)),
			}));
			
			// Send to server (stubbed - will be implemented when backend is ready)
			// await axios.post(`${this.config.serverUrl}/projects/${this.config.projectId}/oplog`, {
			// 	entries: _entries,
			// });
			
			// For now, just clear pending updates
			this.pendingUpdates = [];
			this.state.pendingOps = 0;
			this.state.lastSyncAt = Date.now();
		} catch (error) {
			this.state.error = error instanceof Error ? error : new Error(String(error));
			console.error("Sync failed:", error);
		} finally {
			this.state.isSyncing = false;
		}
	}
	
	/**
	 * Pull updates from server
	 */
	async pullUpdates(
		directoryHandle: FileSystemDirectoryHandle,
		ydoc: Y.Doc,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		lastSyncTimestamp?: string
	): Promise<number> {
		if (!this.config.serverUrl || !this.state.isOnline) {
			return 0;
		}
		
		try {
			// Fetch updates from server (stubbed)
			// const response = await axios.get(
			// 	`${this.config.serverUrl}/projects/${this.config.projectId}/oplog`,
			// 	{
			// 		params: { since: lastSyncTimestamp },
			// 	}
			// );
			// const entries: OplogEntry[] = response.data.entries;
			
			// For now, replay local oplog
			return await replayOplog(directoryHandle, ydoc);
		} catch (error) {
			console.error("Failed to pull updates:", error);
			return 0;
		}
	}
	
	/**
	 * Start periodic sync
	 */
	startPeriodicSync(intervalMs: number = 5000): void {
		if (this.syncInterval) {
			clearInterval(this.syncInterval);
		}
		
		this.syncInterval = setInterval(() => {
			if (this.state.isOnline && this.pendingUpdates.length > 0) {
				this.sync();
			}
		}, intervalMs);
	}
	
	/**
	 * Stop periodic sync
	 */
	stopPeriodicSync(): void {
		if (this.syncInterval) {
			clearInterval(this.syncInterval);
			this.syncInterval = null;
		}
	}
	
	/**
	 * Cleanup
	 */
	destroy(): void {
		this.stopPeriodicSync();
		this.pendingUpdates = [];
	}
}

/**
 * Create a sync service instance
 */
export function createSyncService(config: SyncConfig): SyncService {
	return new SyncService(config);
}

