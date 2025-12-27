/**
 * Migration Helper
 * 
 * Handles migrating existing .quill JSON projects to the new CRDT format.
 */

import type { QuillProject } from "../types";
import {
	createCrdtProject,
	type ProjectManifest,
	type ProjectMetadata,
} from "./loader";
import { quillProjectToYjsDoc } from "./yjs-doc";
import * as Y from "yjs";
import { DOCS_FOLDER } from "./format";
import { writeTextFile, createDirectory, readTextFile } from "@/lib/filesystem";
import { scanDirectory } from "@/lib/filesystem/scanner";
import type { FolderNode } from "../types";

/**
 * Migrate an existing .quill JSON project to CRDT format
 */
export async function migrateToCrdtFormat(
	directoryHandle: FileSystemDirectoryHandle,
	existingProject: QuillProject
): Promise<{
	manifest: ProjectManifest;
	metadata: ProjectMetadata;
	ydoc: Y.Doc;
	project: QuillProject;
}> {
	// Create new CRDT project structure
	const crdt = await createCrdtProject(directoryHandle, existingProject.name);
	
	// Convert existing project data to Yjs document
	quillProjectToYjsDoc(crdt.ydoc, {
		name: existingProject.name,
		projectId: existingProject.projectId,
		createdAt: existingProject.createdAt,
		updatedAt: existingProject.updatedAt,
		blocks: existingProject.blocks,
		characters: existingProject.characters,
		settings: existingProject.settings as unknown as Record<string, unknown>,
		arrangementTracks: existingProject.arrangementTracks,
	});
	
	// Migrate markdown files to docs folder
	await migrateFilesToDocsFolder(directoryHandle);
	
	// Save initial snapshot
	const { saveSnapshot } = await import("./yjs-doc");
	await saveSnapshot(directoryHandle, crdt.ydoc);
	
	// Convert back to QuillProject for compatibility
	const projectData = await import("./yjs-doc").then((m) => m.yjsDocToQuillProject(crdt.ydoc));
	const project = projectData as QuillProject;
	
	return {
		manifest: crdt.manifest,
		metadata: crdt.metadata,
		ydoc: crdt.ydoc,
		project,
	};
}

/**
 * Migrate markdown files to docs folder
 * This moves all .md files from the root to the docs/ folder
 */
async function migrateFilesToDocsFolder(
	directoryHandle: FileSystemDirectoryHandle
): Promise<void> {
	// Ensure docs folder exists
	try {
		await createDirectory(directoryHandle, DOCS_FOLDER);
	} catch {
		// Folder might already exist
	}
	
	// Scan directory to find markdown files
	const tree = await scanDirectory(directoryHandle);
	const markdownFiles = findMarkdownFiles(tree);
	
	// Move files to docs folder
	for (const filePath of markdownFiles) {
		// Skip files already in docs folder
		if (filePath.startsWith(`${DOCS_FOLDER}/`)) continue;
		
		// Skip the .quill file itself
		if (filePath === ".quill") continue;
		
		try {
			// Read file content
			const content = await readTextFile(directoryHandle, filePath);
			
			// Write to docs folder
			const newPath = `${DOCS_FOLDER}/${filePath}`;
			await writeTextFile(directoryHandle, newPath, content);
			
			// Delete original (if different)
			if (newPath !== filePath) {
				const { deleteFile } = await import("@/lib/filesystem");
				await deleteFile(directoryHandle, filePath);
			}
		} catch (error) {
			console.warn(`Failed to migrate file ${filePath}:`, error);
		}
	}
}

/**
 * Find all markdown files in the folder tree
 */
function findMarkdownFiles(nodes: FolderNode[]): string[] {
	const files: string[] = [];
	
	function traverse(node: FolderNode) {
		if (node.type === "file" && node.path.endsWith(".md")) {
			files.push(node.path);
		} else if (node.children) {
			for (const child of node.children) {
				traverse(child);
			}
		}
	}
	
	for (const node of nodes) {
		traverse(node);
	}
	
	return files;
}

/**
 * Check if a project needs migration
 */
export async function needsMigration(
	directoryHandle: FileSystemDirectoryHandle
): Promise<boolean> {
	// Check if it's already a CRDT project
	const { isQuillProjectFolder } = await import("./loader");
	const isCrdt = await isQuillProjectFolder(directoryHandle);
	if (isCrdt) return false;
	
	// Check if it has the old .quill JSON file
	const { fileExists } = await import("@/lib/filesystem");
	const hasOldQuill = await fileExists(directoryHandle, ".quill");
	
	return hasOldQuill;
}

