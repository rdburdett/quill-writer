"use client";

import { useCallback, useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Settings, X, AlertTriangle, RefreshCw, FolderOpen, FolderPlus, Save, XCircle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NovelEditor } from "@/components/novel-editor";
import { FolderSidebar } from "@/components/folder-sidebar";
import { TabSystem, type Tab, type TextDragData } from "@/components/tab-system";
import { useProjectContext } from "@/components/project-provider";
import { createBlock, moveBlock } from "@/lib/project/loader";
import { createDirectory, readTextFile, writeTextFile } from "@/lib/filesystem";
import { titleToFilename } from "@/lib/filesystem/scanner";

// =============================================================================
// Editor View Component
// =============================================================================

export function EditorView() {
	const { project, block, folderTree } = useProjectContext();
	const [newFileFolder, setNewFileFolder] = useState<string | null>(null);
	const [newFileName, setNewFileName] = useState("");
	const [isCreating, setIsCreating] = useState(false);
	
	// Rename state
	const [renameFilePath, setRenameFilePath] = useState<string | null>(null);
	const [renameFileName, setRenameFileName] = useState("");
	const [isRenaming, setIsRenaming] = useState(false);
	
	// New folder state
	const [newFolderParent, setNewFolderParent] = useState<string | null>(null);
	const [newFolderName, setNewFolderName] = useState("");
	const [isCreatingFolder, setIsCreatingFolder] = useState(false);

	// Tab order state (maintains order of tabs)
	const [tabOrder, setTabOrder] = useState<string[]>([]);

	// Sidebar collapse state
	const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
		if (typeof window === "undefined") {
			return false;
		}
		const stored = window.localStorage.getItem("sidebar.collapsed");
		return stored === "true";
	});

	// Persist sidebar collapse state to localStorage
	useEffect(() => {
		if (typeof window !== "undefined") {
			window.localStorage.setItem("sidebar.collapsed", String(isSidebarCollapsed));
		}
	}, [isSidebarCollapsed]);

	// Toggle sidebar collapse
	const handleToggleSidebar = useCallback(() => {
		setIsSidebarCollapsed((prev) => !prev);
	}, []);

	// Convert openBlocks Map to tabs array
	const tabs = useMemo(() => {
		const tabsArray: Tab[] = [];
		const order = tabOrder.length > 0 ? tabOrder : Array.from(block.openBlocks.keys());
		
		// Add tabs in order
		for (const filePath of order) {
			const blockData = block.openBlocks.get(filePath);
			if (blockData) {
				tabsArray.push({
					filePath,
					title: blockData.title,
				});
			}
		}
		
		// Add any new tabs that aren't in the order yet
		for (const [filePath, blockData] of block.openBlocks) {
			if (!order.includes(filePath)) {
				tabsArray.push({
					filePath,
					title: blockData.title,
				});
			}
		}
		
		return tabsArray;
	}, [block.openBlocks, tabOrder]);

	// Update tab order when blocks change
	useMemo(() => {
		const currentPaths = Array.from(block.openBlocks.keys());
		setTabOrder((prev) => {
			// Keep existing order, add new tabs at the end
			const newOrder = prev.filter((path) => currentPaths.includes(path));
			const newPaths = currentPaths.filter((path) => !prev.includes(path));
			return [...newOrder, ...newPaths];
		});
	}, [block.openBlocks]);

	// Handle file selection from sidebar
	const handleFileSelect = useCallback(
		async (path: string) => {
			// If we're selecting a file (not a folder)
			const node = findNodeByPath(project.folderTree, path);
			if (node?.type === "file") {
				await block.openBlock(path);
				folderTree.select(path);
			}
		},
		[block, folderTree, project.folderTree]
	);

	// Handle content change from editor
	const handleContentChange = useCallback(
		(filePath: string, content: string) => {
			block.updateContent(filePath, content);
		},
		[block]
	);

	// Handle tab click
	const handleTabClick = useCallback(
		(filePath: string) => {
			block.setActiveBlock(filePath);
			folderTree.select(filePath);
		},
		[block, folderTree]
	);

	// Handle tab close
	const handleTabClose = useCallback(
		(filePath: string) => {
			block.closeBlock(filePath);
			// Update tab order
			setTabOrder((prev) => prev.filter((path) => path !== filePath));
		},
		[block]
	);

	// Handle tab reorder
	const handleTabsReorder = useCallback((newOrder: string[]) => {
		setTabOrder(newOrder);
	}, []);

	// Handle text drop on tab or file
	const handleDropText = useCallback(
		async (targetFilePath: string, dragData: TextDragData) => {
			if (!project.directoryHandle || !project.project) return;

			const { sourcePath, content: textToMove } = dragData;

			// Prevent dropping on same file
			if (sourcePath === targetFilePath) {
				return;
			}

			try {
				// Check if target file is open in a tab
				const targetBlock = block.getBlock(targetFilePath);
				const isTargetOpen = targetBlock !== null;

				// Check if source file is open
				const sourceBlock = block.getBlock(sourcePath);
				const isSourceOpen = sourceBlock !== null;

				// Insert text into target file
				if (isTargetOpen) {
					// Target is open - insert at cursor position
					// For now, append to end (cursor position would require editor integration)
					const currentContent = targetBlock?.content ?? "";
					const newContent = currentContent + "\n\n" + textToMove;
					block.updateContent(targetFilePath, newContent);
					// Switch to target tab if not already active
					if (block.activeBlockPath !== targetFilePath) {
						block.setActiveBlock(targetFilePath);
					}
				} else {
					// Target is closed - read, append, write
					const currentContent = await readTextFile(project.directoryHandle, targetFilePath);
					const newContent = currentContent + "\n\n" + textToMove;
					await writeTextFile(project.directoryHandle, targetFilePath, newContent);
					// Open target file in a new tab
					await block.openBlock(targetFilePath);
				}

				// Remove text from source file
				if (isSourceOpen && dragData.selectionRange) {
					// Source is open - remove selection via editor
					// This requires editor integration, for now we'll update content
					const currentContent = sourceBlock?.content ?? "";
					const { from, to } = dragData.selectionRange;
					const before = currentContent.slice(0, from);
					const after = currentContent.slice(to);
					const newContent = before + after;
					block.updateContent(sourcePath, newContent);
				} else {
					// Source is closed - read, remove, write
					const currentContent = await readTextFile(project.directoryHandle, sourcePath);
					if (dragData.selectionRange) {
						const { from, to } = dragData.selectionRange;
						const before = currentContent.slice(0, from);
						const after = currentContent.slice(to);
						const newContent = before + after;
						await writeTextFile(project.directoryHandle, sourcePath, newContent);
					}
				}

				// Refresh folder tree
				await project.refreshTree();
			} catch (error) {
				console.error("Failed to handle text drop:", error);
			}
		},
		[project, block]
	);

	// Handle new file request
	const handleNewFileRequest = useCallback((folderPath: string) => {
		setNewFileFolder(folderPath);
		setNewFileName("");
	}, []);

	// Handle new file creation
	const handleCreateFile = useCallback(async () => {
		if (!project.directoryHandle || !project.project || !newFileName.trim() || newFileFolder === null) {
			return;
		}

		setIsCreating(true);
		try {
			// Generate filename from title
			const filename = newFileName.trim().endsWith(".md") 
				? newFileName.trim() 
				: titleToFilename(newFileName.trim());

			// Create the file
			const { project: updatedProject, filePath } = await createBlock(
				project.directoryHandle,
				project.project,
				newFileFolder,
				filename,
				`# ${newFileName.trim()}\n\n`
			);

			// Update project state
			project.updateProject(updatedProject);

			// Refresh the tree
			await project.refreshTree();

			// Open the new file
			await block.openBlock(filePath);
			folderTree.select(filePath);
			folderTree.revealPath(filePath);

			// Clear the new file state
			setNewFileFolder(null);
			setNewFileName("");
		} catch (error) {
			console.error("Failed to create file:", error);
		} finally {
			setIsCreating(false);
		}
	}, [project, newFileName, newFileFolder, block, folderTree]);

	// Cancel new file creation
	const handleCancelNewFile = useCallback(() => {
		setNewFileFolder(null);
		setNewFileName("");
	}, []);

	// Handle rename file request
	const handleRenameFileRequest = useCallback((filePath: string, currentName: string) => {
		// Remove extension for the input
		const nameWithoutExt = currentName.replace(/\.(md|txt)$/i, "");
		setRenameFilePath(filePath);
		setRenameFileName(nameWithoutExt);
	}, []);

	// Handle rename file
	const handleRenameFile = useCallback(async () => {
		if (!project.directoryHandle || !project.project || !renameFileName.trim() || !renameFilePath) {
			return;
		}

		setIsRenaming(true);
		try {
			// Get the folder path and generate new filename
			const pathParts = renameFilePath.split("/");
			const oldFileName = pathParts.pop()!;
			const folderPath = pathParts.join("/");
			
			// Preserve the original extension
			const ext = oldFileName.match(/\.(md|txt)$/i)?.[0] ?? ".md";
			const newFileName = renameFileName.trim().endsWith(ext) 
				? renameFileName.trim()
				: titleToFilename(renameFileName.trim()).replace(/\.md$/, ext);
			
			const newFilePath = folderPath ? `${folderPath}/${newFileName}` : newFileName;

			// Don't rename if the path is the same
			if (newFilePath === renameFilePath) {
				setRenameFilePath(null);
				setRenameFileName("");
				return;
			}

			// Move/rename the file
			const updatedProject = await moveBlock(
				project.directoryHandle,
				project.project,
				renameFilePath,
				newFilePath
			);

			// Update project state
			project.updateProject(updatedProject);

			// Refresh the tree
			await project.refreshTree();

			// If this was an open file, update it
			if (block.openBlocks.has(renameFilePath)) {
				await block.openBlock(newFilePath);
				folderTree.select(newFilePath);
			}

			// Clear the rename state
			setRenameFilePath(null);
			setRenameFileName("");
		} catch (error) {
			console.error("Failed to rename file:", error);
		} finally {
			setIsRenaming(false);
		}
	}, [project, renameFileName, renameFilePath, block, folderTree]);

	// Cancel rename
	const handleCancelRename = useCallback(() => {
		setRenameFilePath(null);
		setRenameFileName("");
	}, []);

	// Handle new folder request
	const handleNewFolderRequest = useCallback((parentPath: string) => {
		setNewFolderParent(parentPath);
		setNewFolderName("");
	}, []);

	// Handle new folder creation
	const handleCreateFolder = useCallback(async () => {
		if (!project.directoryHandle || !newFolderName.trim() || newFolderParent === null) {
			return;
		}

		setIsCreatingFolder(true);
		try {
			// Generate folder name (lowercase, hyphens)
			const folderName = newFolderName.trim()
				.toLowerCase()
				.replace(/[^a-z0-9\s-]/g, "")
				.replace(/\s+/g, "-")
				.replace(/-+/g, "-");

			// Create the full path
			const folderPath = newFolderParent ? `${newFolderParent}/${folderName}` : folderName;

			// Create the directory
			await createDirectory(project.directoryHandle, folderPath);

			// Refresh the tree
			await project.refreshTree();

			// Expand the parent folder and the new folder
			if (newFolderParent) {
				folderTree.expand(newFolderParent);
			}
			folderTree.expand(folderPath);

			// Clear the new folder state
			setNewFolderParent(null);
			setNewFolderName("");
		} catch (error) {
			console.error("Failed to create folder:", error);
		} finally {
			setIsCreatingFolder(false);
		}
	}, [project, newFolderName, newFolderParent, folderTree]);

	// Cancel new folder creation
	const handleCancelNewFolder = useCallback(() => {
		setNewFolderParent(null);
		setNewFolderName("");
	}, []);

	return (
		<div className="flex h-screen">
			{/* Sidebar */}
			<div className={isSidebarCollapsed ? "w-10 shrink-0" : "w-64 shrink-0"}>
				<FolderSidebar
					tree={folderTree.filteredTree}
					selectedPath={folderTree.selectedPath}
					expandedPaths={folderTree.expandedPaths}
					searchQuery={folderTree.searchQuery}
					isSaving={block.activeBlockPath ? block.savingBlocks.has(block.activeBlockPath) : false}
					isCollapsed={isSidebarCollapsed}
					onToggleCollapse={handleToggleSidebar}
					onSelect={handleFileSelect}
					onToggleFolder={folderTree.toggleExpanded}
					onSearchChange={folderTree.setSearchQuery}
					onRefresh={project.refreshTree}
					onNewFile={handleNewFileRequest}
					onNewFolder={handleNewFolderRequest}
					onRenameFile={handleRenameFileRequest}
					onDropText={handleDropText}
				/>
			</div>

			{/* New File Dialog */}
			{newFileFolder !== null && (
				<NewFileDialog
					folderPath={newFileFolder}
					fileName={newFileName}
					isCreating={isCreating}
					onFileNameChange={setNewFileName}
					onCreate={handleCreateFile}
					onCancel={handleCancelNewFile}
				/>
			)}

			{/* Rename File Dialog */}
			{renameFilePath !== null && (
				<RenameFileDialog
					currentPath={renameFilePath}
					fileName={renameFileName}
					isRenaming={isRenaming}
					onFileNameChange={setRenameFileName}
					onRename={handleRenameFile}
					onCancel={handleCancelRename}
				/>
			)}

			{/* New Folder Dialog */}
			{newFolderParent !== null && (
				<NewFolderDialog
					parentPath={newFolderParent}
					folderName={newFolderName}
					isCreating={isCreatingFolder}
					onFolderNameChange={setNewFolderName}
					onCreate={handleCreateFolder}
					onCancel={handleCancelNewFolder}
				/>
			)}

			{/* Main Editor Area */}
			<div className="flex flex-1 flex-col">
				{/* Header Bar */}
				<div className="flex items-center justify-between border-b border-border px-4 py-2">
					<div className="flex items-center gap-4">
						{/* Project Menu */}
						<ProjectMenu
							projectName={project.project?.name}
							hasUnsavedChanges={project.hasUnsavedChanges}
							onCloseProject={project.closeProject}
							onOpenProject={project.openProject}
							onCreateNewProject={project.createNewProject}
							onSaveProject={project.saveProject}
						/>
						
						{/* File Info */}
						<div className="flex items-center gap-2">
							{block.getActiveBlock() ? (
								<>
									<span className="font-medium">{block.getActiveBlock()?.title}</span>
									{block.unsavedBlocks.has(block.activeBlockPath ?? "") && (
										<span className="text-xs text-muted-foreground">
											(unsaved)
										</span>
									)}
									{block.savingBlocks.has(block.activeBlockPath ?? "") && (
										<span className="text-xs text-muted-foreground animate-pulse">
											Saving...
										</span>
									)}
								</>
							) : (
								<span className="text-muted-foreground">
									Select a file to edit
								</span>
							)}
						</div>
					</div>

					<div className="flex items-center gap-2">
						{block.getActiveBlock() && (
							<span className="text-xs text-muted-foreground">
								{block.getActiveBlock()?.wordCount.toLocaleString()} words
							</span>
						)}
						<Link href="/settings" aria-label="Open settings">
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 opacity-50 transition-opacity hover:opacity-100"
							>
								<Settings className="h-4 w-4" />
							</Button>
						</Link>
					</div>
				</div>

				{/* External Modification Warning */}
				{block.activeBlockPath && block.externallyModifiedBlocks.has(block.activeBlockPath) && (
					<div className="flex items-center justify-between gap-2 border-b border-amber-500/50 bg-amber-500/10 px-4 py-2">
						<div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
							<AlertTriangle className="h-4 w-4" />
							This file was modified externally
						</div>
						<div className="flex items-center gap-2">
							<Button
								size="sm"
								variant="outline"
								onClick={() => block.reloadBlock(block.activeBlockPath!)}
								className="gap-1"
							>
								<RefreshCw className="h-3 w-3" />
								Reload
							</Button>
							<Button
								size="sm"
								variant="ghost"
								onClick={() => block.dismissExternalModification(block.activeBlockPath!)}
							>
								<X className="h-3 w-3" />
							</Button>
						</div>
					</div>
				)}

				{/* Tab System with Editor */}
				<TabSystem
					tabs={tabs}
					activeTabPath={block.activeBlockPath}
					onTabClick={handleTabClick}
					onTabClose={handleTabClose}
					onTabsReorder={handleTabsReorder}
					onDropText={handleDropText}
				>
					{block.getActiveBlock() ? (
						<div className="mx-auto max-w-3xl px-6 py-8">
							<NovelEditor
								key={block.getActiveBlock()?.filePath}
								initialContent={block.getActiveBlock()?.content ?? ""}
								onChange={(content) => handleContentChange(block.activeBlockPath!, content)}
								editorKey={block.getActiveBlock()?.filePath}
								sourceFilePath={block.activeBlockPath ?? undefined}
							/>
						</div>
					) : (
						<EmptyState projectName={project.project?.name} />
					)}
				</TabSystem>

				{/* Footer */}
				<div className="flex items-center justify-center border-t border-border py-2">
					<p className="text-xs text-muted-foreground/60">
						Press{" "}
						<kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
							/
						</kbd>{" "}
						for commands
					</p>
				</div>
			</div>
		</div>
	);
}

// =============================================================================
// Project Menu
// =============================================================================

interface ProjectMenuProps {
	projectName?: string;
	hasUnsavedChanges: boolean;
	onCloseProject: () => void;
	onOpenProject: () => void;
	onCreateNewProject: () => void;
	onSaveProject: () => Promise<void>;
}

function ProjectMenu({
	projectName,
	hasUnsavedChanges,
	onCloseProject,
	onOpenProject,
	onCreateNewProject,
	onSaveProject,
}: ProjectMenuProps) {
	const handleSave = useCallback(async () => {
		await onSaveProject();
	}, [onSaveProject]);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" className="gap-2">
					<span className="font-medium">{projectName || "Project"}</span>
					{hasUnsavedChanges && (
						<span className="h-2 w-2 rounded-full bg-amber-500" />
					)}
					<ChevronDown className="h-4 w-4 opacity-50" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-56">
				<DropdownMenuLabel>Project</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={handleSave} disabled={!hasUnsavedChanges}>
					<Save className="mr-2 h-4 w-4" />
					Save Project
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={onOpenProject}>
					<FolderOpen className="mr-2 h-4 w-4" />
					Open Project
				</DropdownMenuItem>
				<DropdownMenuItem onClick={onCreateNewProject}>
					<FolderPlus className="mr-2 h-4 w-4" />
					Create New Project
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={onCloseProject} variant="destructive">
					<XCircle className="mr-2 h-4 w-4" />
					Close Project
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

// =============================================================================
// Empty State
// =============================================================================

function EmptyState({ projectName }: { projectName?: string }) {
	return (
		<div className="flex h-full flex-col items-center justify-center gap-4 text-center">
			<div className="space-y-2">
				<h2 className="text-xl font-medium">
					{projectName ?? "Welcome"}
				</h2>
				<p className="text-muted-foreground">
					Select a file from the sidebar to start editing
				</p>
			</div>
			<div className="mt-4 rounded-lg border border-dashed border-muted-foreground/25 px-8 py-6">
				<p className="text-sm text-muted-foreground">
					Or create a new file by clicking the{" "}
					<span className="inline-flex h-5 w-5 items-center justify-center rounded border">
						+
					</span>{" "}
					icon in a folder
				</p>
			</div>
		</div>
	);
}

// =============================================================================
// Utility
// =============================================================================

import type { FolderNode } from "@/lib/project/types";

function findNodeByPath(nodes: FolderNode[], path: string): FolderNode | null {
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

// =============================================================================
// New File Dialog
// =============================================================================

interface NewFileDialogProps {
	folderPath: string;
	fileName: string;
	isCreating: boolean;
	onFileNameChange: (name: string) => void;
	onCreate: () => void;
	onCancel: () => void;
}

function NewFileDialog({
	folderPath,
	fileName,
	isCreating,
	onFileNameChange,
	onCreate,
	onCancel,
}: NewFileDialogProps) {
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && fileName.trim()) {
			onCreate();
		} else if (e.key === "Escape") {
			onCancel();
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
			<div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
				<h3 className="text-lg font-medium">Create New File</h3>
				<p className="mt-1 text-sm text-muted-foreground">
					in <code className="rounded bg-muted px-1.5 py-0.5">{folderPath || "root"}</code>
				</p>
				
				<input
					type="text"
					value={fileName}
					onChange={(e) => onFileNameChange(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder="Enter file name..."
					autoFocus
					disabled={isCreating}
					className="mt-4 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
				/>
				<p className="mt-2 text-xs text-muted-foreground">
					Will be saved as: {fileName ? titleToFilename(fileName.trim()) : "..."}
				</p>

				<div className="mt-6 flex justify-end gap-2">
					<Button
						variant="outline"
						onClick={onCancel}
						disabled={isCreating}
					>
						Cancel
					</Button>
					<Button
						onClick={onCreate}
						disabled={!fileName.trim() || isCreating}
					>
						{isCreating ? "Creating..." : "Create"}
					</Button>
				</div>
			</div>
		</div>
	);
}

// =============================================================================
// Rename File Dialog
// =============================================================================

interface RenameFileDialogProps {
	currentPath: string;
	fileName: string;
	isRenaming: boolean;
	onFileNameChange: (name: string) => void;
	onRename: () => void;
	onCancel: () => void;
}

function RenameFileDialog({
	currentPath,
	fileName,
	isRenaming,
	onFileNameChange,
	onRename,
	onCancel,
}: RenameFileDialogProps) {
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && fileName.trim()) {
			onRename();
		} else if (e.key === "Escape") {
			onCancel();
		}
	};

	// Get the current filename for display
	const currentFileName = currentPath.split("/").pop() ?? currentPath;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
			<div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
				<h3 className="text-lg font-medium">Rename File</h3>
				<p className="mt-1 text-sm text-muted-foreground">
					Current: <code className="rounded bg-muted px-1.5 py-0.5">{currentFileName}</code>
				</p>
				
				<input
					type="text"
					value={fileName}
					onChange={(e) => onFileNameChange(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder="Enter new name..."
					autoFocus
					disabled={isRenaming}
					className="mt-4 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
				/>
				<p className="mt-2 text-xs text-muted-foreground">
					Will be renamed to: {fileName ? titleToFilename(fileName.trim()) : "..."}
				</p>

				<div className="mt-6 flex justify-end gap-2">
					<Button
						variant="outline"
						onClick={onCancel}
						disabled={isRenaming}
					>
						Cancel
					</Button>
					<Button
						onClick={onRename}
						disabled={!fileName.trim() || isRenaming}
					>
						{isRenaming ? "Renaming..." : "Rename"}
					</Button>
				</div>
			</div>
		</div>
	);
}

// =============================================================================
// New Folder Dialog
// =============================================================================

interface NewFolderDialogProps {
	parentPath: string;
	folderName: string;
	isCreating: boolean;
	onFolderNameChange: (name: string) => void;
	onCreate: () => void;
	onCancel: () => void;
}

function NewFolderDialog({
	parentPath,
	folderName,
	isCreating,
	onFolderNameChange,
	onCreate,
	onCancel,
}: NewFolderDialogProps) {
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && folderName.trim()) {
			onCreate();
		} else if (e.key === "Escape") {
			onCancel();
		}
	};

	// Generate preview of folder name
	const previewName = folderName.trim()
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-") || "...";

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
			<div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
				<h3 className="text-lg font-medium">Create New Folder</h3>
				<p className="mt-1 text-sm text-muted-foreground">
					in <code className="rounded bg-muted px-1.5 py-0.5">{parentPath || "root"}</code>
				</p>
				
				<input
					type="text"
					value={folderName}
					onChange={(e) => onFolderNameChange(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder="Enter folder name..."
					autoFocus
					disabled={isCreating}
					className="mt-4 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
				/>
				<p className="mt-2 text-xs text-muted-foreground">
					Will be created as: {previewName}
				</p>

				<div className="mt-6 flex justify-end gap-2">
					<Button
						variant="outline"
						onClick={onCancel}
						disabled={isCreating}
					>
						Cancel
					</Button>
					<Button
						onClick={onCreate}
						disabled={!folderName.trim() || isCreating}
					>
						{isCreating ? "Creating..." : "Create"}
					</Button>
				</div>
			</div>
		</div>
	);
}

