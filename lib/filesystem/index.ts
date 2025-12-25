/**
 * File System Access API Wrapper
 * 
 * Provides a unified interface for file system operations using the
 * File System Access API (web) with future support for Electron/Tauri.
 */

import type { FileEntry, FileSystemState } from "@/lib/project/types";

// =============================================================================
// Feature Detection
// =============================================================================

/**
 * Check if the File System Access API is supported
 * Note: This API only works in Chrome, Edge, and Opera.
 * It does NOT work in Firefox, Safari, or embedded browsers (Cursor, VS Code, etc.)
 */
export function isFileSystemAccessSupported(): boolean {
	if (typeof window === "undefined") return false;
	
	// Check for the API
	const hasAPI = 
		"showDirectoryPicker" in window &&
		"showOpenFilePicker" in window &&
		"showSaveFilePicker" in window;
	
	if (!hasAPI) return false;
	
	// Additional check: some embedded browsers expose the API but it doesn't work
	// We can't reliably detect this, but we can check for known problematic environments
	const userAgent = navigator.userAgent.toLowerCase();
	const isEmbeddedBrowser = 
		userAgent.includes("electron") || // Electron apps
		userAgent.includes("cursor") ||   // Cursor IDE
		userAgent.includes("code/");      // VS Code
	
	// Still return true, but log a warning for embedded browsers
	if (isEmbeddedBrowser) {
		console.warn(
			"[Quill] Detected embedded browser environment. " +
			"File System Access API may not work properly. " +
			"Please use Chrome or Edge for the best experience."
		);
	}
	
	return hasAPI;
}

// =============================================================================
// Directory Picker
// =============================================================================

export interface DirectoryPickerOptions {
	id?: string; // Remember this picker's location
	mode?: "read" | "readwrite";
	startIn?: FileSystemHandle | "desktop" | "documents" | "downloads" | "music" | "pictures" | "videos";
}

/**
 * Open a directory picker dialog
 * Returns the directory handle or null if cancelled
 */
export async function pickDirectory(
	options: DirectoryPickerOptions = {}
): Promise<FileSystemDirectoryHandle | null> {
	if (!isFileSystemAccessSupported()) {
		throw new Error("File System Access API is not supported in this browser");
	}

	try {
		// Build options object, only including defined values
		const pickerOptions: DirectoryPickerOptions = {
			mode: options.mode ?? "readwrite",
		};
		
		// Only add optional params if explicitly provided
		if (options.id) {
			pickerOptions.id = options.id;
		}
		if (options.startIn) {
			pickerOptions.startIn = options.startIn;
		}
		
		console.log("[Quill FS] Calling showDirectoryPicker with options:", pickerOptions);
		
		const handle = await window.showDirectoryPicker(pickerOptions);
		
		console.log("[Quill FS] Directory picker returned handle:", handle?.name);
		return handle;
	} catch (error) {
		console.log("[Quill FS] Directory picker error:", error);
		console.log("[Quill FS] Error name:", error instanceof Error ? error.name : "unknown");
		console.log("[Quill FS] Error message:", error instanceof Error ? error.message : String(error));
		
		// User cancelled the picker
		if (error instanceof Error && error.name === "AbortError") {
			console.log("[Quill FS] Treating as user cancellation (AbortError)");
			return null;
		}
		throw error;
	}
}

// =============================================================================
// Permission Handling
// =============================================================================

export type PermissionState = "granted" | "denied" | "prompt";

/**
 * Check if we have permission to access a directory
 */
export async function checkPermission(
	handle: FileSystemDirectoryHandle,
	mode: "read" | "readwrite" = "readwrite"
): Promise<PermissionState> {
	const options = { mode };
	
	// queryPermission returns the current state
	const state = await handle.queryPermission(options);
	return state as PermissionState;
}

/**
 * Request permission to access a directory
 */
export async function requestPermission(
	handle: FileSystemDirectoryHandle,
	mode: "read" | "readwrite" = "readwrite"
): Promise<boolean> {
	const options = { mode };
	
	const state = await handle.requestPermission(options);
	return state === "granted";
}

// =============================================================================
// File Operations
// =============================================================================

/**
 * Read a text file from a directory
 */
export async function readTextFile(
	directoryHandle: FileSystemDirectoryHandle,
	relativePath: string
): Promise<string> {
	const parts = relativePath.split("/").filter(Boolean);
	const fileName = parts.pop();
	
	if (!fileName) {
		throw new Error("Invalid file path");
	}

	try {
		// Navigate to the parent directory
		let currentHandle = directoryHandle;
		for (const part of parts) {
			currentHandle = await currentHandle.getDirectoryHandle(part);
		}

		// Get the file
		const fileHandle = await currentHandle.getFileHandle(fileName);
		const file = await fileHandle.getFile();
		return await file.text();
	} catch (error) {
		if (error instanceof Error && error.name === "NotFoundError") {
			throw new Error(`File not found: ${relativePath}`);
		}
		if (error instanceof Error && error.name === "NotAllowedError") {
			throw new Error(`Permission denied: Cannot read file "${relativePath}". Please grant read access to this folder.`);
		}
		throw new Error(`Failed to read file "${relativePath}": ${error instanceof Error ? error.message : String(error)}`);
	}
}

/**
 * Write a text file to a directory
 */
export async function writeTextFile(
	directoryHandle: FileSystemDirectoryHandle,
	relativePath: string,
	content: string
): Promise<void> {
	const parts = relativePath.split("/").filter(Boolean);
	const fileName = parts.pop();
	
	if (!fileName) {
		throw new Error("Invalid file path");
	}

	try {
		// Navigate/create parent directories
		let currentHandle = directoryHandle;
		for (const part of parts) {
			currentHandle = await currentHandle.getDirectoryHandle(part, { create: true });
		}

		// Create/overwrite the file
		const fileHandle = await currentHandle.getFileHandle(fileName, { create: true });
		const writable = await fileHandle.createWritable();
		await writable.write(content);
		await writable.close();
	} catch (error) {
		if (error instanceof Error && error.name === "NotAllowedError") {
			throw new Error(`Permission denied: Cannot write file "${relativePath}". Please grant write access to this folder.`);
		}
		if (error instanceof Error && error.name === "QuotaExceededError") {
			throw new Error(`Storage quota exceeded: Cannot write file "${relativePath}".`);
		}
		throw new Error(`Failed to write file "${relativePath}": ${error instanceof Error ? error.message : String(error)}`);
	}
}

/**
 * Check if a file exists
 */
export async function fileExists(
	directoryHandle: FileSystemDirectoryHandle,
	relativePath: string
): Promise<boolean> {
	try {
		await readTextFile(directoryHandle, relativePath);
		return true;
	} catch {
		return false;
	}
}

/**
 * Delete a file
 */
export async function deleteFile(
	directoryHandle: FileSystemDirectoryHandle,
	relativePath: string
): Promise<void> {
	const parts = relativePath.split("/").filter(Boolean);
	const fileName = parts.pop();
	
	if (!fileName) {
		throw new Error("Invalid file path");
	}

	try {
		// Navigate to the parent directory
		let currentHandle = directoryHandle;
		for (const part of parts) {
			currentHandle = await currentHandle.getDirectoryHandle(part);
		}

		// Remove the file
		await currentHandle.removeEntry(fileName);
	} catch (error) {
		if (error instanceof Error && error.name === "NotFoundError") {
			throw new Error(`File not found: ${relativePath}`);
		}
		if (error instanceof Error && error.name === "NotAllowedError") {
			throw new Error(`Permission denied: Cannot delete file "${relativePath}". Please grant write access to this folder.`);
		}
		throw new Error(`Failed to delete file "${relativePath}": ${error instanceof Error ? error.message : String(error)}`);
	}
}

/**
 * Move/rename a file
 */
export async function moveFile(
	directoryHandle: FileSystemDirectoryHandle,
	fromPath: string,
	toPath: string
): Promise<void> {
	// Read the content
	const content = await readTextFile(directoryHandle, fromPath);
	
	// Write to new location
	await writeTextFile(directoryHandle, toPath, content);
	
	// Delete original
	await deleteFile(directoryHandle, fromPath);
}

// =============================================================================
// Directory Operations
// =============================================================================

/**
 * Create a directory (and any parent directories)
 */
export async function createDirectory(
	directoryHandle: FileSystemDirectoryHandle,
	relativePath: string
): Promise<FileSystemDirectoryHandle> {
	const parts = relativePath.split("/").filter(Boolean);
	
	try {
		let currentHandle = directoryHandle;
		for (const part of parts) {
			currentHandle = await currentHandle.getDirectoryHandle(part, { create: true });
		}
		
		return currentHandle;
	} catch (error) {
		if (error instanceof Error && error.name === "NotAllowedError") {
			throw new Error(`Permission denied: Cannot create directory "${relativePath}". Please grant write access to this folder.`);
		}
		throw new Error(`Failed to create directory "${relativePath}": ${error instanceof Error ? error.message : String(error)}`);
	}
}

/**
 * Delete a directory and all its contents
 */
export async function deleteDirectory(
	directoryHandle: FileSystemDirectoryHandle,
	relativePath: string
): Promise<void> {
	const parts = relativePath.split("/").filter(Boolean);
	const dirName = parts.pop();
	
	if (!dirName) {
		throw new Error("Invalid directory path");
	}

	try {
		// Navigate to the parent directory
		let currentHandle = directoryHandle;
		for (const part of parts) {
			currentHandle = await currentHandle.getDirectoryHandle(part);
		}

		// Remove the directory recursively
		await currentHandle.removeEntry(dirName, { recursive: true });
	} catch (error) {
		if (error instanceof Error && error.name === "NotFoundError") {
			throw new Error(`Directory not found: ${relativePath}`);
		}
		if (error instanceof Error && error.name === "NotAllowedError") {
			throw new Error(`Permission denied: Cannot delete directory "${relativePath}". Please grant write access to this folder.`);
		}
		throw new Error(`Failed to delete directory "${relativePath}": ${error instanceof Error ? error.message : String(error)}`);
	}
}

/**
 * Get file metadata
 */
export async function getFileMetadata(
	directoryHandle: FileSystemDirectoryHandle,
	relativePath: string
): Promise<{ lastModified: number; size: number }> {
	const parts = relativePath.split("/").filter(Boolean);
	const fileName = parts.pop();
	
	if (!fileName) {
		throw new Error("Invalid file path");
	}

	try {
		// Navigate to the parent directory
		let currentHandle = directoryHandle;
		for (const part of parts) {
			currentHandle = await currentHandle.getDirectoryHandle(part);
		}

		// Get the file
		const fileHandle = await currentHandle.getFileHandle(fileName);
		const file = await fileHandle.getFile();
		
		return {
			lastModified: file.lastModified,
			size: file.size,
		};
	} catch (error) {
		if (error instanceof Error && error.name === "NotFoundError") {
			throw new Error(`File not found: ${relativePath}`);
		}
		if (error instanceof Error && error.name === "NotAllowedError") {
			throw new Error(`Permission denied: Cannot access file "${relativePath}". Please grant read access to this folder.`);
		}
		throw new Error(`Failed to get metadata for file "${relativePath}": ${error instanceof Error ? error.message : String(error)}`);
	}
}

// =============================================================================
// Handle Storage (for session persistence)
// =============================================================================

const HANDLE_STORAGE_KEY = "quill-directory-handle";

/**
 * Store directory handle in IndexedDB for session persistence
 * Note: The user will still need to grant permission on page reload
 */
export async function storeDirectoryHandle(
	handle: FileSystemDirectoryHandle
): Promise<void> {
	const db = await openHandleDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction("handles", "readwrite");
		const store = tx.objectStore("handles");
		const request = store.put(handle, HANDLE_STORAGE_KEY);
		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}

/**
 * Retrieve stored directory handle from IndexedDB
 */
export async function retrieveStoredHandle(): Promise<FileSystemDirectoryHandle | null> {
	try {
		const db = await openHandleDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction("handles", "readonly");
			const store = tx.objectStore("handles");
			const request = store.get(HANDLE_STORAGE_KEY);
			request.onsuccess = () => resolve(request.result ?? null);
			request.onerror = () => reject(request.error);
		});
	} catch {
		return null;
	}
}

/**
 * Clear stored directory handle
 */
export async function clearStoredHandle(): Promise<void> {
	const db = await openHandleDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction("handles", "readwrite");
		const store = tx.objectStore("handles");
		const request = store.delete(HANDLE_STORAGE_KEY);
		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}

// Simple IndexedDB wrapper for handle storage
function openHandleDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open("quill-handles", 1);
		
		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);
		
		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains("handles")) {
				db.createObjectStore("handles");
			}
		};
	});
}

// =============================================================================
// Export utilities
// =============================================================================

export type { FileEntry, FileSystemState };

