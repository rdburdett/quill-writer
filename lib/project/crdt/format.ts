/**
 * CRDT Project Format Types
 *
 * Defines the structure of a .quill project folder that uses Yjs
 * for conflict-free distributed editing with oplog-based sync.
 */

// =============================================================================
// Format Versioning
// =============================================================================

export const CRDT_FORMAT_VERSION = "1.0.0";
export const MANIFEST_FILE = "manifest.json";
export const YJS_SNAPSHOT_FILE = "yjs-doc.bin";
export const OPLOG_FILE = "oplog.jsonl";
export const METADATA_FILE = "metadata.json";
export const DOCS_FOLDER = "docs";

// =============================================================================
// Manifest
// =============================================================================

/**
 * Project manifest containing high-level identification and versioning
 */
export interface ProjectManifest {
	/** Project name */
	name: string;
	/** Format version (for migration) */
	formatVersion: string;
	/** ISO timestamp of creation */
	createdAt: string;
	/** ISO timestamp of last modification */
	modifiedAt: string;
	/** Unique document ID (UUID) for Yjs */
	docId: string;
}

/**
 * Create a new manifest
 */
export function createManifest(name: string, docId?: string): ProjectManifest {
	return {
		name,
		formatVersion: CRDT_FORMAT_VERSION,
		createdAt: new Date().toISOString(),
		modifiedAt: new Date().toISOString(),
		docId: docId ?? crypto.randomUUID(),
	};
}

/**
 * Update manifest's modifiedAt timestamp
 */
export function updateManifestTimestamp(
	manifest: ProjectManifest
): ProjectManifest {
	return {
		...manifest,
		modifiedAt: new Date().toISOString(),
	};
}

// =============================================================================
// Oplog Entry
// =============================================================================

/**
 * A single oplog entry representing a Yjs update
 */
export interface OplogEntry {
	/** ISO timestamp of the update */
	ts: string;
	/** Client ID that generated this update */
	clientId: string;
	/** Base64-encoded Yjs update */
	update: string;
}

/**
 * Parse a JSONL line into an OplogEntry
 */
export function parseOplogEntry(line: string): OplogEntry | null {
	const trimmed = line.trim();
	if (!trimmed) return null;
	try {
		return JSON.parse(trimmed) as OplogEntry;
	} catch {
		return null;
	}
}

/**
 * Serialize an OplogEntry to JSONL format
 */
export function serializeOplogEntry(entry: OplogEntry): string {
	return JSON.stringify(entry);
}

// =============================================================================
// Metadata (Non-CRDT)
// =============================================================================

/**
 * Project metadata that's not part of the CRDT document
 * This includes tags, story structure, etc. that may need merge rules
 */
export interface ProjectMetadata {
	/** Tags keyed by type and value */
	tags?: Record<string, string[]>;
	/** Auto-tagging enabled */
	autoTags?: boolean;
	/** Story structure data */
	storyStructure?: Record<string, unknown>;
	/** Other custom metadata */
	[key: string]: unknown;
}

/**
 * Create empty metadata
 */
export function createEmptyMetadata(): ProjectMetadata {
	return {
		autoTags: false,
		tags: {},
		storyStructure: {},
	};
}

// =============================================================================
// Format Validation
// =============================================================================

/**
 * Validate that a manifest has the required fields and compatible version
 */
export function validateManifest(
	manifest: unknown
): manifest is ProjectManifest {
	if (!manifest || typeof manifest !== "object") return false;

	const m = manifest as Record<string, unknown>;

	return (
		typeof m.name === "string" &&
		typeof m.formatVersion === "string" &&
		typeof m.createdAt === "string" &&
		typeof m.modifiedAt === "string" &&
		typeof m.docId === "string" &&
		m.formatVersion === CRDT_FORMAT_VERSION
	);
}

/**
 * Check if a format version is compatible
 */
export function isFormatVersionCompatible(version: string): boolean {
	// For now, only exact version match
	// In the future, we can add semantic versioning logic
	return version === CRDT_FORMAT_VERSION;
}
