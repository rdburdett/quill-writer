/**
 * Project Loader
 * 
 * Handles loading and saving the .quill project file.
 */

import { readTextFile, writeTextFile, fileExists } from "@/lib/filesystem";
import {
	type QuillProject,
	type BlockMetadata,
	type Block,
	type FolderNode,
	QUILL_FILE_NAME,
	QUILL_FILE_VERSION,
	createEmptyProject,
	createBlockMetadata,
} from "./types";
import { scanDirectory, extractTitle, countWords } from "@/lib/filesystem/scanner";

// =============================================================================
// Load/Save .quill File
// =============================================================================

/**
 * Load a project from a directory
 * Creates a new .quill file if one doesn't exist
 */
export async function loadProject(
	directoryHandle: FileSystemDirectoryHandle
): Promise<QuillProject> {
	const exists = await fileExists(directoryHandle, QUILL_FILE_NAME);

	if (exists) {
		const content = await readTextFile(directoryHandle, QUILL_FILE_NAME);
		const project = JSON.parse(content) as QuillProject;
		
		// Migrate if needed
		return migrateProject(project);
	}

	// Create new project with directory name
	const project = createEmptyProject(directoryHandle.name);
	await saveProject(directoryHandle, project);
	return project;
}

/**
 * Save a project to the .quill file
 */
export async function saveProject(
	directoryHandle: FileSystemDirectoryHandle,
	project: QuillProject
): Promise<void> {
	project.updatedAt = Date.now();
	const content = JSON.stringify(project, null, 2);
	await writeTextFile(directoryHandle, QUILL_FILE_NAME, content);
}

/**
 * Migrate a project to the latest version if needed
 */
function migrateProject(project: QuillProject): QuillProject {
	// Currently at version 1.0.0, no migrations needed
	// Add migrations here as the schema evolves
	
	if (!project.version) {
		project.version = QUILL_FILE_VERSION;
	}

	// Ensure all required fields exist
	if (!project.blocks) project.blocks = {};
	if (!project.characters) project.characters = [];
	if (!project.arrangementTracks) project.arrangementTracks = [];
	if (!project.settings) {
		project.settings = {
			blockSuggestionMode: "manual",
			defaultPoolPath: "unsorted",
		};
	}

	return project;
}

// =============================================================================
// Sync Blocks with Filesystem
// =============================================================================

/**
 * Synchronize the project's block metadata with the actual files on disk.
 * - Adds metadata for new files
 * - Removes metadata for deleted files
 * - Keeps existing metadata for files that still exist
 */
export async function syncBlocksWithFilesystem(
	directoryHandle: FileSystemDirectoryHandle,
	project: QuillProject
): Promise<{ project: QuillProject; added: string[]; removed: string[] }> {
	const tree = await scanDirectory(directoryHandle);
	const filePaths = getAllFilePaths(tree);
	
	const added: string[] = [];
	const removed: string[] = [];
	
	// Create a new blocks map
	const newBlocks: Record<string, BlockMetadata> = {};

	// Keep existing metadata for files that still exist
	for (const filePath of filePaths) {
		if (project.blocks[filePath]) {
			newBlocks[filePath] = project.blocks[filePath];
		} else {
			// New file discovered
			newBlocks[filePath] = createBlockMetadata();
			added.push(filePath);
		}
	}

	// Find removed files
	for (const filePath of Object.keys(project.blocks)) {
		if (!filePaths.includes(filePath)) {
			removed.push(filePath);
		}
	}

	return {
		project: { ...project, blocks: newBlocks },
		added,
		removed,
	};
}

/**
 * Get all file paths from a folder tree (helper)
 */
function getAllFilePaths(nodes: FolderNode[]): string[] {
	const paths: string[] = [];

	function traverse(node: FolderNode) {
		if (node.type === "file") {
			paths.push(node.path);
		} else if (node.children) {
			for (const child of node.children) {
				traverse(child);
			}
		}
	}

	for (const node of nodes) {
		traverse(node);
	}

	return paths;
}

// =============================================================================
// Load Full Blocks
// =============================================================================

/**
 * Load a single block with its content from disk
 */
export async function loadBlock(
	directoryHandle: FileSystemDirectoryHandle,
	project: QuillProject,
	filePath: string
): Promise<Block | null> {
	const metadata = project.blocks[filePath];
	if (!metadata) return null;

	try {
		const content = await readTextFile(directoryHandle, filePath);
		const filename = filePath.split("/").pop() ?? filePath;
		
		return {
			...metadata,
			filePath,
			title: extractTitle(content, filename),
			wordCount: countWords(content),
			lastModified: Date.now(), // Will be updated from file metadata
			content,
		};
	} catch {
		return null;
	}
}

/**
 * Load all blocks with their content (for smaller projects)
 * For larger projects, load on demand
 */
export async function loadAllBlocks(
	directoryHandle: FileSystemDirectoryHandle,
	project: QuillProject
): Promise<Block[]> {
	const blocks: Block[] = [];

	for (const filePath of Object.keys(project.blocks)) {
		const block = await loadBlock(directoryHandle, project, filePath);
		if (block) {
			blocks.push(block);
		}
	}

	return blocks;
}

// =============================================================================
// Block CRUD Operations
// =============================================================================

/**
 * Create a new block (file)
 */
export async function createBlock(
	directoryHandle: FileSystemDirectoryHandle,
	project: QuillProject,
	folderPath: string,
	filename: string,
	content: string = ""
): Promise<{ project: QuillProject; filePath: string }> {
	// Ensure the folder exists
	const folderParts = folderPath.split("/").filter(Boolean);
	let currentHandle = directoryHandle;
	for (const part of folderParts) {
		currentHandle = await currentHandle.getDirectoryHandle(part, { create: true });
	}

	// Create the file path
	const filePath = folderPath ? `${folderPath}/${filename}` : filename;

	// Write the file
	await writeTextFile(directoryHandle, filePath, content);

	// Add metadata
	const metadata = createBlockMetadata();
	const newBlocks = { ...project.blocks, [filePath]: metadata };

	return {
		project: { ...project, blocks: newBlocks },
		filePath,
	};
}

/**
 * Update block metadata
 */
export function updateBlockMetadata(
	project: QuillProject,
	filePath: string,
	updates: Partial<BlockMetadata>
): QuillProject {
	const existing = project.blocks[filePath];
	if (!existing) return project;

	return {
		...project,
		blocks: {
			...project.blocks,
			[filePath]: { ...existing, ...updates },
		},
	};
}

/**
 * Move a block to a new location
 */
export async function moveBlock(
	directoryHandle: FileSystemDirectoryHandle,
	project: QuillProject,
	fromPath: string,
	toPath: string
): Promise<QuillProject> {
	const { moveFile } = await import("@/lib/filesystem");
	
	// Move the file
	await moveFile(directoryHandle, fromPath, toPath);

	// Update metadata
	const metadata = project.blocks[fromPath];
	const newBlocks = { ...project.blocks };
	delete newBlocks[fromPath];
	newBlocks[toPath] = metadata;

	return { ...project, blocks: newBlocks };
}

/**
 * Delete a block
 */
export async function deleteBlock(
	directoryHandle: FileSystemDirectoryHandle,
	project: QuillProject,
	filePath: string
): Promise<QuillProject> {
	const { deleteFile } = await import("@/lib/filesystem");
	
	// Delete the file
	await deleteFile(directoryHandle, filePath);

	// Remove metadata
	const newBlocks = { ...project.blocks };
	delete newBlocks[filePath];

	// Also remove from any arrangement positions
	const newTracks = project.arrangementTracks.map((track) => ({ ...track }));

	return { ...project, blocks: newBlocks, arrangementTracks: newTracks };
}

// =============================================================================
// Character Operations
// =============================================================================

/**
 * Add a character to the project
 */
export function addCharacter(
	project: QuillProject,
	character: Omit<QuillProject["characters"][0], "id">
): QuillProject {
	const newCharacter = {
		...character,
		id: crypto.randomUUID(),
	};

	return {
		...project,
		characters: [...project.characters, newCharacter],
	};
}

/**
 * Update a character
 */
export function updateCharacter(
	project: QuillProject,
	characterId: string,
	updates: Partial<QuillProject["characters"][0]>
): QuillProject {
	return {
		...project,
		characters: project.characters.map((c) =>
			c.id === characterId ? { ...c, ...updates } : c
		),
	};
}

/**
 * Delete a character
 */
export function deleteCharacter(
	project: QuillProject,
	characterId: string
): QuillProject {
	// Remove character from all blocks
	const newBlocks: Record<string, BlockMetadata> = {};
	for (const [path, block] of Object.entries(project.blocks)) {
		newBlocks[path] = {
			...block,
			characterIds: block.characterIds.filter((id) => id !== characterId),
		};
	}

	return {
		...project,
		characters: project.characters.filter((c) => c.id !== characterId),
		blocks: newBlocks,
	};
}

