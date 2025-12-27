/**
 * Yjs Document Lifecycle and Storage
 * 
 * Handles creating, loading, and persisting Yjs documents with
 * snapshot and oplog support.
 */

import * as Y from "yjs";
import {
	type OplogEntry,
	YJS_SNAPSHOT_FILE,
	OPLOG_FILE,
	parseOplogEntry,
	serializeOplogEntry,
} from "./format";
import { readTextFile, writeTextFile, fileExists } from "@/lib/filesystem";

// =============================================================================
// Client ID Generation
// =============================================================================

/**
 * Generate or retrieve a persistent client ID for this device
 */
export function getClientId(): string {
	const STORAGE_KEY = "quill-client-id";
	
	if (typeof window === "undefined") {
		return `server-${Date.now()}`;
	}
	
	let clientId = localStorage.getItem(STORAGE_KEY);
	if (!clientId) {
		clientId = `client-${crypto.randomUUID()}`;
		localStorage.setItem(STORAGE_KEY, clientId);
	}
	
	return clientId;
}

// =============================================================================
// Yjs Document Structure
// =============================================================================

/**
 * Structure of data stored in the Yjs document
 * This mirrors the QuillProject structure but in CRDT format
 */
export interface YjsProjectData {
	/** Project name */
	name: Y.Text;
	/** Project ID */
	projectId: Y.Text;
	/** Created timestamp */
	createdAt: number;
	/** Updated timestamp */
	updatedAt: number;
	/** Blocks metadata (keyed by file path) */
	blocks: Y.Map<unknown>;
	/** Characters */
	characters: Y.Array<unknown>;
	/** Settings */
	settings: Y.Map<unknown>;
	/** Arrangement tracks */
	arrangementTracks: Y.Array<unknown>;
}

/**
 * Get or create the root map for project data
 */
function getProjectMap(ydoc: Y.Doc): Y.Map<unknown> {
	return ydoc.getMap("project");
}

/**
 * Initialize a Yjs document with default structure
 */
export function initializeYjsDoc(ydoc: Y.Doc, projectName: string, projectId: string): void {
	const map = getProjectMap(ydoc);
	
	if (!map.get("name")) {
		const name = new Y.Text();
		name.insert(0, projectName);
		map.set("name", name);
	}
	
	if (!map.get("projectId")) {
		const projectIdText = new Y.Text();
		projectIdText.insert(0, projectId);
		map.set("projectId", projectIdText);
	}
	
	if (!map.get("createdAt")) {
		map.set("createdAt", Date.now());
	}
	
	if (!map.get("updatedAt")) {
		map.set("updatedAt", Date.now());
	}
	
	if (!map.get("blocks")) {
		map.set("blocks", new Y.Map());
	}
	
	if (!map.get("characters")) {
		map.set("characters", new Y.Array());
	}
	
	if (!map.get("settings")) {
		map.set("settings", new Y.Map());
	}
	
	if (!map.get("arrangementTracks")) {
		map.set("arrangementTracks", new Y.Array());
	}
}

// =============================================================================
// Snapshot Operations
// =============================================================================

/**
 * Save a Yjs document snapshot to disk
 */
export async function saveSnapshot(
	directoryHandle: FileSystemDirectoryHandle,
	ydoc: Y.Doc
): Promise<void> {
	const update = Y.encodeStateAsUpdate(ydoc);
	const base64 = btoa(String.fromCharCode(...update));
	await writeTextFile(directoryHandle, YJS_SNAPSHOT_FILE, base64);
}

/**
 * Load a Yjs document snapshot from disk
 */
export async function loadSnapshot(
	directoryHandle: FileSystemDirectoryHandle,
	ydoc: Y.Doc
): Promise<boolean> {
	const exists = await fileExists(directoryHandle, YJS_SNAPSHOT_FILE);
	if (!exists) return false;
	
	try {
		const base64 = await readTextFile(directoryHandle, YJS_SNAPSHOT_FILE);
		const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
		Y.applyUpdate(ydoc, binary);
		return true;
	} catch {
		return false;
	}
}

// =============================================================================
// Oplog Operations
// =============================================================================

/**
 * Append an update to the oplog
 */
export async function appendToOplog(
	directoryHandle: FileSystemDirectoryHandle,
	update: Uint8Array,
	clientId: string
): Promise<void> {
	const entry: OplogEntry = {
		ts: new Date().toISOString(),
		clientId,
		update: btoa(String.fromCharCode(...update)),
	};
	
	const line = serializeOplogEntry(entry) + "\n";
	
	// Append to oplog file
	const exists = await fileExists(directoryHandle, OPLOG_FILE);
	if (exists) {
		const current = await readTextFile(directoryHandle, OPLOG_FILE);
		await writeTextFile(directoryHandle, OPLOG_FILE, current + line);
	} else {
		await writeTextFile(directoryHandle, OPLOG_FILE, line);
	}
}

/**
 * Load and replay oplog entries
 */
export async function replayOplog(
	directoryHandle: FileSystemDirectoryHandle,
	ydoc: Y.Doc
): Promise<number> {
	const exists = await fileExists(directoryHandle, OPLOG_FILE);
	if (!exists) return 0;
	
	try {
		const content = await readTextFile(directoryHandle, OPLOG_FILE);
		const lines = content.split("\n").filter(Boolean);
		
		let count = 0;
		for (const line of lines) {
			const entry = parseOplogEntry(line);
			if (!entry) continue;
			
			try {
				const binary = Uint8Array.from(atob(entry.update), (c) => c.charCodeAt(0));
				Y.applyUpdate(ydoc, binary, "oplog-replay");
				count++;
			} catch (error) {
				console.warn("Failed to apply oplog entry:", error);
			}
		}
		
		return count;
	} catch {
		return 0;
	}
}

/**
 * Clear the oplog (after creating a checkpoint)
 */
export async function clearOplog(
	directoryHandle: FileSystemDirectoryHandle
): Promise<void> {
	await writeTextFile(directoryHandle, OPLOG_FILE, "");
}

// =============================================================================
// Document Lifecycle
// =============================================================================

/**
 * Create a new Yjs document and initialize it
 */
export function createYjsDoc(projectName: string, projectId: string): Y.Doc {
	const ydoc = new Y.Doc();
	initializeYjsDoc(ydoc, projectName, projectId);
	return ydoc;
}

/**
 * Load a Yjs document from disk (snapshot + oplog replay)
 */
export async function loadYjsDoc(
	directoryHandle: FileSystemDirectoryHandle,
	projectName: string,
	projectId: string
): Promise<Y.Doc> {
	const ydoc = new Y.Doc();
	
	// Try to load snapshot first
	const snapshotLoaded = await loadSnapshot(directoryHandle, ydoc);
	
	// If no snapshot, initialize with defaults
	if (!snapshotLoaded) {
		initializeYjsDoc(ydoc, projectName, projectId);
	}
	
	// Replay oplog to get latest state
	await replayOplog(directoryHandle, ydoc);
	
	return ydoc;
}

/**
 * Setup update observer to append to oplog
 */
export function setupOplogObserver(
	directoryHandle: FileSystemDirectoryHandle,
	ydoc: Y.Doc,
	clientId: string
): () => void {
	const handler = (update: Uint8Array, origin: unknown) => {
		// Don't log updates that came from oplog replay
		if (origin === "oplog-replay") return;
		
		// Append to oplog asynchronously
		appendToOplog(directoryHandle, update, clientId).catch((error) => {
			console.error("Failed to append to oplog:", error);
		});
	};
	
	ydoc.on("update", handler);
	
	// Return cleanup function
	return () => {
		ydoc.off("update", handler);
	};
}

/**
 * Create a checkpoint (save snapshot and clear oplog)
 */
export async function createCheckpoint(
	directoryHandle: FileSystemDirectoryHandle,
	ydoc: Y.Doc
): Promise<void> {
	await saveSnapshot(directoryHandle, ydoc);
	await clearOplog(directoryHandle);
}

// =============================================================================
// Conversion Helpers
// =============================================================================

/**
 * Convert Yjs document to QuillProject format
 * This bridges the CRDT format to the existing QuillProject type
 */
export function yjsDocToQuillProject(ydoc: Y.Doc): unknown {
	const map = getProjectMap(ydoc);
	
	// Extract data from Yjs types
	const name = (map.get("name") as Y.Text | undefined)?.toString() ?? "";
	const projectId = (map.get("projectId") as Y.Text | undefined)?.toString() ?? "";
	const createdAt = (map.get("createdAt") as number | undefined) ?? Date.now();
	const updatedAt = (map.get("updatedAt") as number | undefined) ?? Date.now();
	
	// Convert blocks map
	const blocksMap = map.get("blocks") as Y.Map<unknown> | undefined;
	const blocks: Record<string, unknown> = {};
	if (blocksMap) {
		blocksMap.forEach((value, key) => {
			blocks[key] = value;
		});
	}
	
	// Convert arrays
	const characters = (map.get("characters") as Y.Array<unknown> | undefined)?.toArray() ?? [];
	const arrangementTracks = (map.get("arrangementTracks") as Y.Array<unknown> | undefined)?.toArray() ?? [];
	
	// Convert settings map
	const settingsMap = map.get("settings") as Y.Map<unknown> | undefined;
	const settings: Record<string, unknown> = {};
	if (settingsMap) {
		settingsMap.forEach((value, key) => {
			settings[key] = value;
		});
	}
	
	return {
		version: "1.0.0",
		projectId,
		name,
		createdAt,
		updatedAt,
		blocks,
		characters,
		settings,
		arrangementTracks,
	};
}

/**
 * Convert QuillProject to Yjs document
 */
export function quillProjectToYjsDoc(ydoc: Y.Doc, project: {
	name: string;
	projectId: string;
	createdAt: number;
	updatedAt: number;
	blocks: Record<string, unknown>;
	characters: unknown[];
	settings: Record<string, unknown>;
	arrangementTracks: unknown[];
}): void {
	const map = getProjectMap(ydoc);
	
	// Set name
	const nameText = map.get("name") as Y.Text | undefined;
	if (nameText) {
		nameText.delete(0, nameText.length);
		nameText.insert(0, project.name);
	} else {
		const name = new Y.Text();
		name.insert(0, project.name);
		map.set("name", name);
	}
	
	// Set projectId
	const projectIdText = map.get("projectId") as Y.Text | undefined;
	if (projectIdText) {
		projectIdText.delete(0, projectIdText.length);
		projectIdText.insert(0, project.projectId);
	} else {
		const pid = new Y.Text();
		pid.insert(0, project.projectId);
		map.set("projectId", pid);
	}
	
	map.set("createdAt", project.createdAt);
	map.set("updatedAt", project.updatedAt);
	
	// Set blocks
	const blocksMap = map.get("blocks") as Y.Map<unknown> | undefined;
	if (blocksMap) {
		blocksMap.clear();
		for (const [key, value] of Object.entries(project.blocks)) {
			blocksMap.set(key, value);
		}
	} else {
		const blocks = new Y.Map();
		for (const [key, value] of Object.entries(project.blocks)) {
			blocks.set(key, value);
		}
		map.set("blocks", blocks);
	}
	
	// Set characters
	const charactersArray = map.get("characters") as Y.Array<unknown> | undefined;
	if (charactersArray) {
		charactersArray.delete(0, charactersArray.length);
		charactersArray.insert(0, project.characters);
	} else {
		const chars = new Y.Array();
		chars.insert(0, project.characters);
		map.set("characters", chars);
	}
	
	// Set settings
	const settingsMap = map.get("settings") as Y.Map<unknown> | undefined;
	if (settingsMap) {
		settingsMap.clear();
		for (const [key, value] of Object.entries(project.settings)) {
			settingsMap.set(key, value);
		}
	} else {
		const settings = new Y.Map();
		for (const [key, value] of Object.entries(project.settings)) {
			settings.set(key, value);
		}
		map.set("settings", settings);
	}
	
	// Set arrangement tracks
	const tracksArray = map.get("arrangementTracks") as Y.Array<unknown> | undefined;
	if (tracksArray) {
		tracksArray.delete(0, tracksArray.length);
		tracksArray.insert(0, project.arrangementTracks);
	} else {
		const tracks = new Y.Array();
		tracks.insert(0, project.arrangementTracks);
		map.set("arrangementTracks", tracks);
	}
}

