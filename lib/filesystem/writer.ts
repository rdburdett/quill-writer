/**
 * File Writer
 * 
 * Utilities for writing content to .md files with
 * optional frontmatter support and debounced auto-save.
 */

import { writeTextFile, readTextFile } from "./index";

// =============================================================================
// Frontmatter Types
// =============================================================================

export interface Frontmatter {
	title?: string;
	tags?: string[];
	characters?: string[];
	created?: string;
	modified?: string;
	[key: string]: unknown;
}

// =============================================================================
// Frontmatter Parsing
// =============================================================================

/**
 * Parse frontmatter from markdown content
 */
export function parseFrontmatter(content: string): {
	frontmatter: Frontmatter | null;
	body: string;
} {
	const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
	const match = content.match(frontmatterRegex);

	if (!match) {
		return { frontmatter: null, body: content };
	}

	const [, frontmatterStr, body] = match;
	const frontmatter: Frontmatter = {};

	// Simple YAML parsing (handles basic key: value pairs)
	const lines = frontmatterStr.split("\n");
	let currentKey: string | null = null;
	let currentArray: string[] | null = null;

	for (const line of lines) {
		// Array item
		if (line.startsWith("  - ") && currentKey) {
			if (!currentArray) {
				currentArray = [];
			}
			currentArray.push(line.slice(4).trim());
			frontmatter[currentKey] = currentArray;
			continue;
		}

		// Key-value pair
		const colonIndex = line.indexOf(":");
		if (colonIndex > 0) {
			// Save previous array if any
			if (currentArray && currentKey) {
				frontmatter[currentKey] = currentArray;
			}

			currentKey = line.slice(0, colonIndex).trim();
			const value = line.slice(colonIndex + 1).trim();

			if (value) {
				// Remove quotes if present
				frontmatter[currentKey] = value.replace(/^["']|["']$/g, "");
				currentArray = null;
			} else {
				// Might be an array, wait for next lines
				currentArray = [];
			}
		}
	}

	return { frontmatter, body: body.trim() };
}

/**
 * Serialize frontmatter to YAML string
 */
export function serializeFrontmatter(frontmatter: Frontmatter): string {
	const lines: string[] = ["---"];

	for (const [key, value] of Object.entries(frontmatter)) {
		if (value === undefined || value === null) continue;

		if (Array.isArray(value)) {
			if (value.length === 0) continue;
			lines.push(`${key}:`);
			for (const item of value) {
				lines.push(`  - ${item}`);
			}
		} else if (typeof value === "string") {
			// Quote strings that contain special characters
			const needsQuotes = /[:#\[\]{}|>]/.test(value);
			lines.push(`${key}: ${needsQuotes ? `"${value}"` : value}`);
		} else {
			lines.push(`${key}: ${value}`);
		}
	}

	lines.push("---", "");
	return lines.join("\n");
}

/**
 * Combine frontmatter and body into markdown content
 */
export function combineContent(
	frontmatter: Frontmatter | null,
	body: string
): string {
	if (!frontmatter || Object.keys(frontmatter).length === 0) {
		return body;
	}
	return serializeFrontmatter(frontmatter) + body;
}

// =============================================================================
// File Writing
// =============================================================================

export interface WriteOptions {
	/** Include frontmatter in the file */
	includeFrontmatter?: boolean;
	/** Frontmatter to include */
	frontmatter?: Frontmatter;
	/** Update the modified timestamp in frontmatter */
	updateModified?: boolean;
}

/**
 * Write markdown content to a file
 */
export async function writeMarkdownFile(
	directoryHandle: FileSystemDirectoryHandle,
	filePath: string,
	body: string,
	options: WriteOptions = {}
): Promise<void> {
	const {
		includeFrontmatter = false,
		frontmatter = {},
		updateModified = true,
	} = options;

	let content = body;

	if (includeFrontmatter) {
		const fm = { ...frontmatter };
		if (updateModified) {
			fm.modified = new Date().toISOString();
		}
		content = combineContent(fm, body);
	}

	await writeTextFile(directoryHandle, filePath, content);
}

/**
 * Read and parse a markdown file
 */
export async function readMarkdownFile(
	directoryHandle: FileSystemDirectoryHandle,
	filePath: string
): Promise<{ frontmatter: Frontmatter | null; body: string; raw: string }> {
	const raw = await readTextFile(directoryHandle, filePath);
	const { frontmatter, body } = parseFrontmatter(raw);
	return { frontmatter, body, raw };
}

// =============================================================================
// Auto-Save
// =============================================================================

export interface AutoSaveOptions {
	/** Debounce delay in ms (default: 1000) */
	delay?: number;
	/** Callback before save */
	onBeforeSave?: () => void;
	/** Callback after successful save */
	onSaved?: () => void;
	/** Callback on save error */
	onError?: (error: Error) => void;
}

export interface AutoSaver {
	/** Queue content for saving */
	save: (content: string) => void;
	/** Force immediate save */
	flush: () => Promise<void>;
	/** Cancel pending save */
	cancel: () => void;
	/** Check if there's a pending save */
	isPending: () => boolean;
}

/**
 * Create an auto-saver with debouncing
 */
export function createAutoSaver(
	directoryHandle: FileSystemDirectoryHandle,
	filePath: string,
	options: AutoSaveOptions = {}
): AutoSaver {
	const {
		delay = 1000,
		onBeforeSave,
		onSaved,
		onError,
	} = options;

	let pendingContent: string | null = null;
	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	let isSaving = false;

	async function doSave() {
		if (pendingContent === null || isSaving) return;

		const contentToSave = pendingContent;
		pendingContent = null;
		isSaving = true;

		try {
			onBeforeSave?.();
			await writeTextFile(directoryHandle, filePath, contentToSave);
			onSaved?.();
		} catch (error) {
			// Re-queue the content if save failed
			pendingContent = contentToSave;
			if (onError && error instanceof Error) {
				onError(error);
			}
		} finally {
			isSaving = false;
		}
	}

	return {
		save: (content: string) => {
			pendingContent = content;

			if (timeoutId) {
				clearTimeout(timeoutId);
			}

			timeoutId = setTimeout(() => {
				timeoutId = null;
				doSave();
			}, delay);
		},

		flush: async () => {
			if (timeoutId) {
				clearTimeout(timeoutId);
				timeoutId = null;
			}
			await doSave();
		},

		cancel: () => {
			if (timeoutId) {
				clearTimeout(timeoutId);
				timeoutId = null;
			}
			pendingContent = null;
		},

		isPending: () => pendingContent !== null || isSaving,
	};
}

// =============================================================================
// Batch Operations
// =============================================================================

/**
 * Write multiple files at once
 */
export async function writeMultipleFiles(
	directoryHandle: FileSystemDirectoryHandle,
	files: Array<{ path: string; content: string }>
): Promise<{ succeeded: string[]; failed: Array<{ path: string; error: Error }> }> {
	const succeeded: string[] = [];
	const failed: Array<{ path: string; error: Error }> = [];

	await Promise.all(
		files.map(async ({ path, content }) => {
			try {
				await writeTextFile(directoryHandle, path, content);
				succeeded.push(path);
			} catch (error) {
				failed.push({ path, error: error instanceof Error ? error : new Error(String(error)) });
			}
		})
	);

	return { succeeded, failed };
}

