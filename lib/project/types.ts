/**
 * Core type definitions for Quill Writer
 * 
 * Philosophy: Folder-first, zero lock-in.
 * Written content lives in real .md/.txt files.
 * Only arrangement/metadata is proprietary (stored in .quill file).
 */

// =============================================================================
// Block Types (maps to a file on disk)
// =============================================================================

/**
 * Metadata about a block's position in the arrangement view
 */
export interface ArrangementPosition {
	track: number;
	slot: number;
	included: boolean; // Is it in the final mix?
}

/**
 * Block metadata stored in the .quill file
 * The actual content lives in the .md file on disk
 */
export interface BlockMetadata {
	id: string; // UUID for sync
	tags: string[];
	characterIds: string[];
	color?: string;
	arrangement?: ArrangementPosition;
}

/**
 * Full block representation (metadata + derived info from file)
 */
export interface Block extends BlockMetadata {
	filePath: string; // Relative path from project root (source of truth)
	title: string; // Derived from filename or first heading
	wordCount: number;
	lastModified: number; // From filesystem
	content?: string; // Loaded on demand
}

// =============================================================================
// Character Types
// =============================================================================

/**
 * Character definition for tracking across blocks
 */
export interface Character {
	id: string;
	name: string;
	aliases: string[]; // Alternative names, nicknames
	color: string; // For subway-map visualization
	description?: string;
	// Future: embedding for auto-detection
}

// =============================================================================
// Project Settings
// =============================================================================

export type BlockSuggestionMode = "manual" | "auto" | "hybrid";

export interface ProjectSettings {
	blockSuggestionMode: BlockSuggestionMode;
	defaultPoolPath: string; // Default folder for new blocks (e.g., "unsorted")
	theme?: string;
	autoSaveInterval?: number; // ms, default 1000
}

// =============================================================================
// Arrangement View Types
// =============================================================================

/**
 * A track in the arrangement view (horizontal row)
 */
export interface ArrangementTrack {
	id: string;
	name: string;
	color?: string;
	order: number;
	collapsed?: boolean;
}

// =============================================================================
// The .quill Project File
// =============================================================================

export const QUILL_FILE_VERSION = "1.0.0";
export const QUILL_FILE_NAME = ".quill";

/**
 * The .quill project file structure
 * This is what gets saved to disk and synced via Y.js
 */
export interface QuillProject {
	version: string;
	projectId: string;
	name: string;
	createdAt: number;
	updatedAt: number;

	// Metadata keyed by relative file path
	blocks: Record<string, BlockMetadata>;

	// Character definitions
	characters: Character[];

	// Project settings
	settings: ProjectSettings;

	// Arrangement view state
	arrangementTracks: ArrangementTrack[];
}

/**
 * Create a new empty project
 */
export function createEmptyProject(name: string): QuillProject {
	return {
		version: QUILL_FILE_VERSION,
		projectId: crypto.randomUUID(),
		name,
		createdAt: Date.now(),
		updatedAt: Date.now(),
		blocks: {},
		characters: [],
		settings: {
			blockSuggestionMode: "manual",
			defaultPoolPath: "unsorted",
			autoSaveInterval: 1000,
		},
		arrangementTracks: [],
	};
}

/**
 * Create default block metadata for a new file
 */
export function createBlockMetadata(): BlockMetadata {
	return {
		id: crypto.randomUUID(),
		tags: [],
		characterIds: [],
	};
}

// =============================================================================
// Folder Tree Types (for UI)
// =============================================================================

export type FolderNodeType = "folder" | "file";

export interface FolderNode {
	name: string;
	path: string; // Relative path from project root
	type: FolderNodeType;
	children?: FolderNode[];
	// For files only
	wordCount?: number;
	lastModified?: number;
}

// =============================================================================
// File System Types
// =============================================================================

export interface FileSystemState {
	isSupported: boolean;
	hasPermission: boolean;
	rootHandle: FileSystemDirectoryHandle | null;
	projectPath: string | null;
}

export interface FileEntry {
	name: string;
	path: string;
	kind: "file" | "directory";
	handle: FileSystemHandle;
	lastModified?: number;
	size?: number;
}

