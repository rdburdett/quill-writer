/**
 * Folder Scanner
 * 
 * Recursively scans a directory to build a tree structure
 * of all .md and .txt files for the folder sidebar.
 */

import type { FolderNode } from "@/lib/project/types";
import { QUILL_FILE_NAME } from "@/lib/project/types";

// =============================================================================
// Configuration
// =============================================================================

/**
 * File extensions to include in the scan
 */
export const SUPPORTED_EXTENSIONS = [".md", ".txt"];

/**
 * Directories to ignore during scanning
 */
export const IGNORED_DIRECTORIES = [
	"node_modules",
	".git",
	".svn",
	".hg",
	"__pycache__",
	".vscode",
	".idea",
];

/**
 * Files to ignore during scanning
 */
export const IGNORED_FILES = [
	".DS_Store",
	"Thumbs.db",
	".gitignore",
	QUILL_FILE_NAME, // Don't show the .quill file in the tree
];

// =============================================================================
// Scanner Functions
// =============================================================================

export interface ScanOptions {
	/** Additional extensions to include */
	additionalExtensions?: string[];
	/** Additional directories to ignore */
	additionalIgnoredDirs?: string[];
	/** Maximum depth to scan (default: no limit) */
	maxDepth?: number;
	/** Include hidden files/folders (starting with .) */
	includeHidden?: boolean;
}

/**
 * Scan a directory and build a folder tree
 */
export async function scanDirectory(
	directoryHandle: FileSystemDirectoryHandle,
	options: ScanOptions = {}
): Promise<FolderNode[]> {
	const extensions = [
		...SUPPORTED_EXTENSIONS,
		...(options.additionalExtensions ?? []),
	];
	
	const ignoredDirs = [
		...IGNORED_DIRECTORIES,
		...(options.additionalIgnoredDirs ?? []),
	];

	return scanDirectoryRecursive(
		directoryHandle,
		"",
		extensions,
		ignoredDirs,
		options.maxDepth,
		options.includeHidden ?? false,
		0
	);
}

async function scanDirectoryRecursive(
	directoryHandle: FileSystemDirectoryHandle,
	currentPath: string,
	extensions: string[],
	ignoredDirs: string[],
	maxDepth: number | undefined,
	includeHidden: boolean,
	currentDepth: number
): Promise<FolderNode[]> {
	// Check depth limit
	if (maxDepth !== undefined && currentDepth >= maxDepth) {
		return [];
	}

	const nodes: FolderNode[] = [];
	const folders: FolderNode[] = [];
	const files: FolderNode[] = [];

	for await (const entry of directoryHandle.values()) {
		const name = entry.name;
		const path = currentPath ? `${currentPath}/${name}` : name;

		// Skip hidden files/folders unless explicitly included
		if (!includeHidden && name.startsWith(".") && name !== QUILL_FILE_NAME) {
			continue;
		}

		// Skip ignored files
		if (IGNORED_FILES.includes(name)) {
			continue;
		}

		if (entry.kind === "directory") {
			// Skip ignored directories
			if (ignoredDirs.includes(name)) {
				continue;
			}

			try {
				const subDirHandle = await directoryHandle.getDirectoryHandle(name);
				const children = await scanDirectoryRecursive(
					subDirHandle,
					path,
					extensions,
					ignoredDirs,
					maxDepth,
					includeHidden,
					currentDepth + 1
				);

				// Only include folders that have content or are empty but user-created
				folders.push({
					name,
					path,
					type: "folder",
					children,
				});
			} catch (error) {
				// Skip directories we can't access (permission denied, etc.)
				console.warn(`[Quill Scanner] Cannot access directory "${path}":`, error);
				continue;
			}
		} else if (entry.kind === "file") {
			// Check file extension
			const ext = getFileExtension(name);
			if (extensions.includes(ext)) {
				try {
					const fileHandle = await directoryHandle.getFileHandle(name);
					const file = await fileHandle.getFile();
					const content = await file.text();

					files.push({
						name,
						path,
						type: "file",
						wordCount: countWords(content),
						lastModified: file.lastModified,
					});
				} catch (error) {
					// Skip files we can't access (permission denied, locked, etc.)
					console.warn(`[Quill Scanner] Cannot access file "${path}":`, error);
					continue;
				}
			}
		}
	}

	// Sort folders first, then files, both alphabetically
	folders.sort((a, b) => a.name.localeCompare(b.name));
	files.sort((a, b) => a.name.localeCompare(b.name));

	return [...folders, ...files];
}

/**
 * Get all file paths from a folder tree (flattened)
 */
export function getAllFilePaths(nodes: FolderNode[]): string[] {
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

/**
 * Find a node by path in the tree
 */
export function findNodeByPath(
	nodes: FolderNode[],
	path: string
): FolderNode | null {
	for (const node of nodes) {
		if (node.path === path) {
			return node;
		}
		if (node.children) {
			const found = findNodeByPath(node.children, path);
			if (found) return found;
		}
	}
	return null;
}

/**
 * Get the total word count for a folder (including all nested files)
 */
export function getFolderWordCount(node: FolderNode): number {
	if (node.type === "file") {
		return node.wordCount ?? 0;
	}

	let total = 0;
	if (node.children) {
		for (const child of node.children) {
			total += getFolderWordCount(child);
		}
	}
	return total;
}

/**
 * Get the total file count for a folder (including all nested files)
 */
export function getFolderFileCount(node: FolderNode): number {
	if (node.type === "file") {
		return 1;
	}

	let total = 0;
	if (node.children) {
		for (const child of node.children) {
			total += getFolderFileCount(child);
		}
	}
	return total;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get file extension (lowercase, including the dot)
 */
function getFileExtension(filename: string): string {
	const lastDot = filename.lastIndexOf(".");
	if (lastDot === -1) return "";
	return filename.slice(lastDot).toLowerCase();
}

/**
 * Count words in text
 */
export function countWords(text: string): number {
	// Remove markdown formatting
	const cleaned = text
		.replace(/```[\s\S]*?```/g, "") // Remove code blocks
		.replace(/`[^`]*`/g, "") // Remove inline code
		.replace(/!\[.*?\]\(.*?\)/g, "") // Remove images
		.replace(/\[.*?\]\(.*?\)/g, (match) => match.replace(/\[|\]|\(.*?\)/g, "")) // Keep link text
		.replace(/[#*_~>`-]/g, "") // Remove markdown symbols
		.replace(/\n+/g, " ") // Replace newlines with spaces
		.trim();

	if (!cleaned) return 0;

	// Split by whitespace and filter empty strings
	const words = cleaned.split(/\s+/).filter((word) => word.length > 0);
	return words.length;
}

/**
 * Generate a safe filename from a title
 */
export function titleToFilename(title: string): string {
	return (
		title
			.toLowerCase()
			.replace(/[^a-z0-9\s-]/g, "") // Remove special characters
			.replace(/\s+/g, "-") // Replace spaces with hyphens
			.replace(/-+/g, "-") // Replace multiple hyphens with single
			.slice(0, 100) + ".md" // Limit length and add extension
	);
}

/**
 * Extract title from a markdown file content
 * Uses the first heading or first line of content
 */
export function extractTitle(content: string, filename: string): string {
	// Try to find a heading
	const headingMatch = content.match(/^#+\s+(.+)$/m);
	if (headingMatch) {
		return headingMatch[1].trim();
	}

	// Try to get first non-empty line
	const lines = content.split("\n");
	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed && !trimmed.startsWith("---")) {
			// Skip frontmatter delimiter
			return trimmed.slice(0, 100);
		}
	}

	// Fall back to filename without extension
	return filename.replace(/\.(md|txt)$/i, "").replace(/-/g, " ");
}

