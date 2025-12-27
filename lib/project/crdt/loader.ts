/**
 * CRDT Project Loader
 *
 * Handles loading and saving .quill project folders with Yjs CRDT format.
 */

import * as Y from "yjs";
import type { QuillProject } from "../types";
import {
	type ProjectManifest,
	type ProjectMetadata,
	MANIFEST_FILE,
	METADATA_FILE,
	DOCS_FOLDER,
	createManifest,
	createEmptyMetadata,
	updateManifestTimestamp,
	validateManifest,
} from "./format";

// Re-export types for use in other modules
export type { ProjectManifest, ProjectMetadata };
import {
	loadYjsDoc,
	createYjsDoc,
	setupOplogObserver,
	createCheckpoint,
	yjsDocToQuillProject,
	getClientId,
} from "./yjs-doc";
import { createSyncService, type SyncService } from "./sync";
import {
	readTextFile,
	writeTextFile,
	fileExists,
	createDirectory,
} from "@/lib/filesystem";

// =============================================================================
// Load Project
// =============================================================================

/**
 * Check if a directory is a .quill project folder
 */
export async function isQuillProjectFolder(
	directoryHandle: FileSystemDirectoryHandle
): Promise<boolean> {
	return await fileExists(directoryHandle, MANIFEST_FILE);
}

/**
 * Load manifest from a .quill project folder
 */
export async function loadManifest(
	directoryHandle: FileSystemDirectoryHandle
): Promise<ProjectManifest | null> {
	try {
		const content = await readTextFile(directoryHandle, MANIFEST_FILE);
		const manifest = JSON.parse(content) as unknown;

		if (!validateManifest(manifest)) {
			return null;
		}

		return manifest;
	} catch {
		return null;
	}
}

/**
 * Load metadata from a .quill project folder
 */
export async function loadMetadata(
	directoryHandle: FileSystemDirectoryHandle
): Promise<ProjectMetadata> {
	try {
		const content = await readTextFile(directoryHandle, METADATA_FILE);
		return JSON.parse(content) as ProjectMetadata;
	} catch {
		return createEmptyMetadata();
	}
}

/**
 * Save manifest to a .quill project folder
 */
export async function saveManifest(
	directoryHandle: FileSystemDirectoryHandle,
	manifest: ProjectManifest
): Promise<void> {
	const updated = updateManifestTimestamp(manifest);
	const content = JSON.stringify(updated, null, 2);
	await writeTextFile(directoryHandle, MANIFEST_FILE, content);
}

/**
 * Save metadata to a .quill project folder
 */
export async function saveMetadata(
	directoryHandle: FileSystemDirectoryHandle,
	metadata: ProjectMetadata
): Promise<void> {
	const content = JSON.stringify(metadata, null, 2);
	await writeTextFile(directoryHandle, METADATA_FILE, content);
}

/**
 * Load a CRDT project from a .quill folder
 */
export async function loadCrdtProject(
	directoryHandle: FileSystemDirectoryHandle
): Promise<{
	manifest: ProjectManifest;
	metadata: ProjectMetadata;
	ydoc: Y.Doc;
	project: QuillProject;
	syncService: SyncService;
	cleanup: () => void;
}> {
	// Load manifest
	const manifest = await loadManifest(directoryHandle);
	if (!manifest) {
		throw new Error("Invalid or missing manifest");
	}

	// Load metadata
	const metadata = await loadMetadata(directoryHandle);

	// Load Yjs document
	const ydoc = await loadYjsDoc(
		directoryHandle,
		manifest.name,
		manifest.docId
	);

	// Convert to QuillProject
	const projectData = yjsDocToQuillProject(ydoc);
	const project = projectData as QuillProject;

	// Create sync service
	const clientId = getClientId();
	const syncService = createSyncService({
		projectId: manifest.docId,
		clientId,
	});

	// Setup oplog observer
	const cleanup = setupOplogObserver(directoryHandle, ydoc, clientId);

	return {
		manifest,
		metadata,
		ydoc,
		project,
		syncService,
		cleanup,
	};
}

/**
 * Create a new CRDT project
 */
export async function createCrdtProject(
	directoryHandle: FileSystemDirectoryHandle,
	projectName: string
): Promise<{
	manifest: ProjectManifest;
	metadata: ProjectMetadata;
	ydoc: Y.Doc;
	project: QuillProject;
	syncService: SyncService;
	cleanup: () => void;
}> {
	// Create manifest
	const docId = crypto.randomUUID();
	const manifest = createManifest(projectName, docId);
	await saveManifest(directoryHandle, manifest);

	// Create metadata
	const metadata = createEmptyMetadata();
	await saveMetadata(directoryHandle, metadata);

	// Create Yjs document
	const ydoc = createYjsDoc(projectName, docId);

	// Save initial snapshot
	const { saveSnapshot } = await import("./yjs-doc");
	await saveSnapshot(directoryHandle, ydoc);

	// Convert to QuillProject
	const projectData = yjsDocToQuillProject(ydoc);
	const project = projectData as QuillProject;

	// Create sync service
	const clientId = getClientId();
	const syncService = createSyncService({
		projectId: docId,
		clientId,
	});

	// Setup oplog observer
	const cleanup = setupOplogObserver(directoryHandle, ydoc, clientId);

	// Ensure docs folder exists
	try {
		await createDirectory(directoryHandle, DOCS_FOLDER);
	} catch {
		// Folder might already exist
	}

	return {
		manifest,
		metadata,
		ydoc,
		project,
		syncService,
		cleanup,
	};
}

/**
 * Save project changes (creates checkpoint periodically)
 */
export async function saveCrdtProject(
	directoryHandle: FileSystemDirectoryHandle,
	manifest: ProjectManifest,
	metadata: ProjectMetadata,
	ydoc: Y.Doc,
	opCount: number = 0,
	checkpointInterval: number = 100
): Promise<void> {
	// Save manifest
	await saveManifest(directoryHandle, manifest);

	// Save metadata
	await saveMetadata(directoryHandle, metadata);

	// Create checkpoint if oplog is getting large
	if (opCount >= checkpointInterval) {
		await createCheckpoint(directoryHandle, ydoc);
	}
}
