"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjectContext } from "@/components/project-provider";
import { useEditorSettingsContext } from "@/components/theme-provider";
import { AppMenu } from "@/components/app-menu";
import { SidebarContainer } from "@/components/sidebar/sidebar-container";
import { cn } from "@/lib/utils";
import { createBlock, moveBlock } from "@/lib/project/loader";
import { createDirectory, readTextFile, writeTextFile } from "@/lib/filesystem";
import { titleToFilename } from "@/lib/filesystem/scanner";
import type { TextDragData } from "@/components/tab-system";
import { ArrangeContent } from "@/components/arrange/arrange-content";
import { ArrangementProvider } from "@/components/arrange/arrangement-context";

// =============================================================================
// File Dialogs
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

// =============================================================================
// App Shell Component
// =============================================================================

export function AppShell() {
	const { project, block, folderTree } = useProjectContext();
	const { showBorders } = useEditorSettingsContext();

	// =========================================================================
	// Sidebar collapse state
	// =========================================================================

	const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
		if (typeof window === "undefined") return false;
		const stored = window.localStorage.getItem("sidebar.collapsed");
		return stored === "true";
	});

	useEffect(() => {
		if (typeof window !== "undefined") {
			window.localStorage.setItem("sidebar.collapsed", String(isSidebarCollapsed));
		}
	}, [isSidebarCollapsed]);

	const handleToggleSidebar = useCallback(() => {
		setIsSidebarCollapsed((prev) => !prev);
	}, []);

	// =========================================================================
	// Sidebar width (draggable resize)
	// =========================================================================

	const MIN_SIDEBAR_WIDTH = 180;
	const MAX_SIDEBAR_WIDTH = 480;
	const DEFAULT_SIDEBAR_WIDTH = 256;

	const [sidebarWidth, setSidebarWidth] = useState(() => {
		if (typeof window === "undefined") return DEFAULT_SIDEBAR_WIDTH;
		const stored = window.localStorage.getItem("sidebar.width");
		return stored ? Number(stored) : DEFAULT_SIDEBAR_WIDTH;
	});

	useEffect(() => {
		if (typeof window !== "undefined") {
			window.localStorage.setItem("sidebar.width", String(sidebarWidth));
		}
	}, [sidebarWidth]);

	const [isSidebarResizing, setIsSidebarResizing] = useState(false);
	const sidebarResizeStartX = useRef(0);
	const sidebarResizeStartWidth = useRef(0);

	const handleSidebarResizeStart = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			sidebarResizeStartX.current = e.clientX;
			sidebarResizeStartWidth.current = sidebarWidth;
			setIsSidebarResizing(true);
		},
		[sidebarWidth]
	);

	useEffect(() => {
		if (!isSidebarResizing) return;

		const handleMouseMove = (e: MouseEvent) => {
			e.preventDefault();
			const delta = e.clientX - sidebarResizeStartX.current;
			const newWidth = Math.max(
				MIN_SIDEBAR_WIDTH,
				Math.min(MAX_SIDEBAR_WIDTH, sidebarResizeStartWidth.current + delta)
			);
			setSidebarWidth(newWidth);
		};

		const handleMouseUp = () => {
			setIsSidebarResizing(false);
		};

		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);
		document.body.style.userSelect = "none";
		document.body.style.cursor = "col-resize";

		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
			document.body.style.userSelect = "";
			document.body.style.cursor = "";
		};
	}, [isSidebarResizing]);

	// =========================================================================
	// File operation state
	// =========================================================================

	const [newFileFolder, setNewFileFolder] = useState<string | null>(null);
	const [newFileName, setNewFileName] = useState("");
	const [isCreating, setIsCreating] = useState(false);

	const [renameFilePath, setRenameFilePath] = useState<string | null>(null);
	const [renameFileName, setRenameFileName] = useState("");
	const [isRenaming, setIsRenaming] = useState(false);

	const [newFolderParent, setNewFolderParent] = useState<string | null>(null);
	const [newFolderName, setNewFolderName] = useState("");
	const [isCreatingFolder, setIsCreatingFolder] = useState(false);

	// =========================================================================
	// Mode-specific file select handler (registered by content components)
	// =========================================================================

	const fileSelectHandlerRef = useRef<((path: string) => void) | null>(null);

	const handleRegisterFileSelect = useCallback((handler: (path: string) => void) => {
		fileSelectHandlerRef.current = handler;
	}, []);

	// =========================================================================
	// File operation handlers
	// =========================================================================

	const handleNewFileRequest = useCallback((folderPath: string) => {
		setNewFileFolder(folderPath);
		setNewFileName("");
	}, []);

	const handleCreateFile = useCallback(async () => {
		if (!project.directoryHandle || !project.project || !newFileName.trim() || newFileFolder === null) {
			return;
		}

		setIsCreating(true);
		try {
			const filename = newFileName.trim().endsWith(".md") 
				? newFileName.trim() 
				: titleToFilename(newFileName.trim());

			const { project: updatedProject, filePath } = await createBlock(
				project.directoryHandle,
				project.project,
				newFileFolder,
				filename,
				`# ${newFileName.trim()}\n\n`
			);

			project.updateProject(updatedProject);
			await project.refreshTree();

			// Open the new file (mode-specific)
			if (fileSelectHandlerRef.current) {
				fileSelectHandlerRef.current(filePath);
			} else {
				// Fallback: open in write mode
				await block.openBlock(filePath);
				folderTree.select(filePath);
			}
			folderTree.revealPath(filePath);

			setNewFileFolder(null);
			setNewFileName("");
		} catch (error) {
			console.error("Failed to create file:", error);
		} finally {
			setIsCreating(false);
		}
		}, [project, newFileName, newFileFolder, block, folderTree]);

	const handleCancelNewFile = useCallback(() => {
		setNewFileFolder(null);
		setNewFileName("");
	}, []);

	const handleRenameFileRequest = useCallback((filePath: string, currentName: string) => {
		const nameWithoutExt = currentName.replace(/\.(md|txt)$/i, "");
		setRenameFilePath(filePath);
		setRenameFileName(nameWithoutExt);
	}, []);

	const handleRenameFile = useCallback(async () => {
		if (!project.directoryHandle || !project.project || !renameFileName.trim() || !renameFilePath) {
			return;
		}

		setIsRenaming(true);
		try {
			const pathParts = renameFilePath.split("/");
			const oldFileName = pathParts.pop()!;
			const folderPath = pathParts.join("/");
			
			const ext = oldFileName.match(/\.(md|txt)$/i)?.[0] ?? ".md";
			const newFileName = renameFileName.trim().endsWith(ext) 
				? renameFileName.trim()
				: titleToFilename(renameFileName.trim()).replace(/\.md$/, ext);
			
			const newFilePath = folderPath ? `${folderPath}/${newFileName}` : newFileName;

			if (newFilePath === renameFilePath) {
				setRenameFilePath(null);
				setRenameFileName("");
				return;
			}

			const updatedProject = await moveBlock(
				project.directoryHandle,
				project.project,
				renameFilePath,
				newFilePath
			);

			project.updateProject(updatedProject);
			await project.refreshTree();

			if (block.openBlocks.has(renameFilePath)) {
				await block.openBlock(newFilePath);
				folderTree.select(newFilePath);
			}

			setRenameFilePath(null);
			setRenameFileName("");
		} catch (error) {
			console.error("Failed to rename file:", error);
		} finally {
			setIsRenaming(false);
		}
	}, [project, renameFileName, renameFilePath, block, folderTree]);

	const handleCancelRename = useCallback(() => {
		setRenameFilePath(null);
		setRenameFileName("");
	}, []);

	const handleMoveFile = useCallback(async (fromPath: string, toPath: string) => {
		if (!project.directoryHandle || !project.project || fromPath === toPath) {
			return;
		}

		try {
			const updatedProject = await moveBlock(
				project.directoryHandle,
				project.project,
				fromPath,
				toPath
			);

			project.updateProject(updatedProject);
			await project.refreshTree();

			if (block.openBlocks.has(fromPath)) {
				await block.openBlock(toPath);
				folderTree.select(toPath);
			}
		} catch (error) {
			console.error("Failed to move file:", error);
		}
	}, [project, block, folderTree]);

	const handleNewFolderRequest = useCallback((parentPath: string) => {
		setNewFolderParent(parentPath);
		setNewFolderName("");
	}, []);

	const handleCreateFolder = useCallback(async () => {
		if (!project.directoryHandle || !newFolderName.trim() || newFolderParent === null) {
			return;
		}

		setIsCreatingFolder(true);
		try {
			const folderName = newFolderName.trim()
				.toLowerCase()
				.replace(/[^a-z0-9\s-]/g, "")
				.replace(/\s+/g, "-")
				.replace(/-+/g, "-");

			const folderPath = newFolderParent ? `${newFolderParent}/${folderName}` : folderName;

			await createDirectory(project.directoryHandle, folderPath);
			await project.refreshTree();

			if (newFolderParent) {
				folderTree.expand(newFolderParent);
			}
			folderTree.expand(folderPath);

			setNewFolderParent(null);
			setNewFolderName("");
		} catch (error) {
			console.error("Failed to create folder:", error);
		} finally {
			setIsCreatingFolder(false);
		}
	}, [project, newFolderName, newFolderParent, folderTree]);

	const handleCancelNewFolder = useCallback(() => {
		setNewFolderParent(null);
		setNewFolderName("");
	}, []);

	const handleDropText = useCallback(
		async (targetFilePath: string, dragData: TextDragData) => {
			if (!project.directoryHandle || !project.project) return;

			const { sourcePath, content: textToMove } = dragData;

			if (sourcePath === targetFilePath) {
				return;
			}

			try {
				const targetBlock = block.getBlock(targetFilePath);
				const isTargetOpen = targetBlock !== null;

				const sourceBlock = block.getBlock(sourcePath);
				const isSourceOpen = sourceBlock !== null;

				if (isTargetOpen) {
					const currentContent = targetBlock?.content ?? "";
					const newContent = currentContent + "\n\n" + textToMove;
					block.updateContent(targetFilePath, newContent);
					if (block.activeBlockPath !== targetFilePath) {
						block.setActiveBlock(targetFilePath);
					}
				} else {
					const currentContent = await readTextFile(project.directoryHandle, targetFilePath);
					const newContent = currentContent + "\n\n" + textToMove;
					await writeTextFile(project.directoryHandle, targetFilePath, newContent);
					await block.openBlock(targetFilePath);
				}

				if (isSourceOpen && dragData.selectionRange) {
					const currentContent = sourceBlock?.content ?? "";
					const { from, to } = dragData.selectionRange;
					const before = currentContent.slice(0, from);
					const after = currentContent.slice(to);
					const newContent = before + after;
					block.updateContent(sourcePath, newContent);
				} else {
					const currentContent = await readTextFile(project.directoryHandle, sourcePath);
					if (dragData.selectionRange) {
						const { from, to } = dragData.selectionRange;
						const before = currentContent.slice(0, from);
						const after = currentContent.slice(to);
						const newContent = before + after;
						await writeTextFile(project.directoryHandle, sourcePath, newContent);
					}
				}

				await project.refreshTree();
			} catch (error) {
				console.error("Failed to handle text drop:", error);
			}
		},
		[project, block]
	);

	// =========================================================================
	// File select handler (mode-specific)
	// =========================================================================

	const handleFileSelect = useCallback((path: string) => {
		if (fileSelectHandlerRef.current) {
			fileSelectHandlerRef.current(path);
		}
	}, []);

	return (
		<div className="flex h-screen flex-col">
			{/* Header Bar */}
			<div className={cn("flex items-center justify-between bg-muted/30 px-4 py-2", showBorders && "border-b border-border")}>
				<div className="flex items-center gap-4">
					{/* Sidebar Toggle Button */}
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8"
						onClick={handleToggleSidebar}
						title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
						aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
					>
						{isSidebarCollapsed ? (
							<PanelLeftOpen className="h-4 w-4" />
						) : (
							<PanelLeftClose className="h-4 w-4" />
						)}
					</Button>

					{/* Project Name & Status */}
					<div className="flex items-center gap-2">
						<span className="font-medium">{project.project?.name || "Quill"}</span>
						{project.hasUnsavedChanges && (
							<span className="h-2 w-2 rounded-full bg-amber-500" title="Unsaved changes" />
						)}
					</div>
				</div>

				{/* App Menu */}
				<AppMenu
					hasUnsavedChanges={project.hasUnsavedChanges}
					onSaveProject={project.saveProject}
					onOpenProject={project.openProject}
					onCreateNewProject={project.createNewProject}
					onCloseProject={project.closeProject}
				/>
			</div>

			{/* Content Area */}
			<div className="flex flex-1 overflow-hidden">
				<ArrangementProvider>
					{/* Sidebar */}
					{!isSidebarCollapsed && (
						<>
							<div className="shrink-0 h-full" style={{ width: sidebarWidth }}>
								<SidebarContainer
									tree={folderTree.filteredTree}
									selectedPath={folderTree.selectedPath}
									expandedPaths={folderTree.expandedPaths}
									searchQuery={folderTree.searchQuery}
									isSaving={block.activeBlockPath ? block.savingBlocks.has(block.activeBlockPath) : false}
									onSelect={folderTree.select}
									onToggleFolder={folderTree.toggleExpanded}
									onSearchChange={folderTree.setSearchQuery}
									onRefresh={project.refreshTree}
									onNewFile={handleNewFileRequest}
									onNewFolder={handleNewFolderRequest}
									onRenameFile={handleRenameFileRequest}
									onDropText={handleDropText}
									onMoveFile={handleMoveFile}
									onFileSelect={handleFileSelect}
								/>
							</div>
							{/* Sidebar resize handle */}
							<div
								onMouseDown={handleSidebarResizeStart}
								className={cn(
									"w-1 shrink-0 cursor-col-resize transition-colors hover:bg-border",
									isSidebarResizing && "bg-primary/30"
								)}
							/>
						</>
					)}

				{/* Content Area */}
				<div className="flex-1 overflow-hidden">
					<ArrangeContent
						onRegisterFileSelect={handleRegisterFileSelect}
					/>
				</div>
				</ArrangementProvider>
			</div>

			{/* File Dialogs */}
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
		</div>
	);
}
