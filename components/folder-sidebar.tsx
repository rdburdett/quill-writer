"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
	Folder,
	FolderOpen,
	FileText,
	ChevronRight,
	ChevronDown,
	Search,
	FolderPlus,
	FilePlus,
	Pencil,
	RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FolderNode } from "@/lib/project/types";
import { Button } from "@/components/ui/button";
import { useEditorSettingsContext } from "@/components/theme-provider";
import { draggable, dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import type { TextDragData } from "@/components/tab-system";

// =============================================================================
// Types
// =============================================================================

export interface FolderSidebarProps {
	/** The folder tree to display */
	tree: FolderNode[];
	/** Currently selected file path */
	selectedPath: string | null;
	/** Set of expanded folder paths */
	expandedPaths: Set<string>;
	/** Search query */
	searchQuery: string;
	/** Whether a file is currently saving */
	isSaving?: boolean;
	/** Called when a file is selected */
	onSelect: (path: string) => void;
	/** Called when a folder is toggled */
	onToggleFolder: (path: string) => void;
	/** Called when search query changes */
	onSearchChange: (query: string) => void;
	/** Called when refresh is requested */
	onRefresh?: () => void;
	/** Called when creating a new file */
	onNewFile?: (folderPath: string) => void;
	/** Called when creating a new folder */
	onNewFolder?: (parentPath: string) => void;
	/** Called when renaming a file */
	onRenameFile?: (filePath: string, currentName: string) => void;
	/** Called when text is dropped on a file */
	onDropText?: (filePath: string, dragData: TextDragData) => void;
	/** Called when a file is moved to a new location */
	onMoveFile?: (fromPath: string, toPath: string) => void;
}

// =============================================================================
// Sidebar Component
// =============================================================================

export function FolderSidebar({
	tree,
	selectedPath,
	expandedPaths,
	searchQuery,
	isSaving,
	onSelect,
	onToggleFolder,
	onSearchChange,
	onRefresh,
	onNewFile,
	onNewFolder,
	onRenameFile,
	onDropText,
	onMoveFile,
}: FolderSidebarProps) {
	const [hoveredPath, setHoveredPath] = useState<string | null>(null);
	const { showBorders } = useEditorSettingsContext();

	return (
		<div className="flex h-full flex-col bg-muted/30 transition-all">
			{/* Header */}
			<div className={cn("flex items-center justify-between px-3 py-2", showBorders && "border-b border-border")}>
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium text-foreground">Browser</span>
				</div>
				<div className="flex items-center gap-1">
					{isSaving && (
						<span className="text-xs text-muted-foreground animate-pulse">
							Saving...
						</span>
					)}
					{onRefresh && (
						<Button
							variant="ghost"
							size="icon"
							className="h-6 w-6"
							onClick={onRefresh}
							title="Refresh"
						>
							<RefreshCw className="h-3.5 w-3.5" />
						</Button>
					)}
					{onNewFolder && (
						<Button
							variant="ghost"
							size="icon"
							className="h-6 w-6"
							onClick={() => onNewFolder("")}
							title="New Folder"
						>
							<FolderPlus className="h-3.5 w-3.5" />
						</Button>
					)}
					{onNewFile && (
						<Button
							variant="ghost"
							size="icon"
							className="h-6 w-6"
							onClick={() => onNewFile("")}
							title="New File"
						>
							<FilePlus className="h-3.5 w-3.5" />
						</Button>
					)}
				</div>
			</div>

			{/* Search */}
			<div className={cn("px-3 py-2", showBorders && "border-b border-border")}>
				<div className="relative">
					<Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => onSearchChange(e.target.value)}
						placeholder="Search files..."
						className="w-full rounded-md bg-background px-8 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
					/>
					{searchQuery && (
						<button
							onClick={() => onSearchChange("")}
							className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
						>
							×
						</button>
					)}
				</div>
			</div>

			{/* Tree */}
			<div className="flex-1 overflow-auto py-2">
				{tree.length === 0 ? (
					<div className="px-3 py-8 text-center text-sm text-muted-foreground">
						{searchQuery ? "No files match your search" : "No files yet"}
					</div>
				) : (
					<TreeNodes
						nodes={tree}
						selectedPath={selectedPath}
						expandedPaths={expandedPaths}
						hoveredPath={hoveredPath}
						depth={0}
						onSelect={onSelect}
						onToggleFolder={onToggleFolder}
						onHover={setHoveredPath}
						onNewFile={onNewFile}
						onNewFolder={onNewFolder}
						onRenameFile={onRenameFile}
						onDropText={onDropText}
						onMoveFile={onMoveFile}
					/>
				)}
			</div>

			{/* Stats */}
			<div className={cn("px-3 py-2", showBorders && "border-t border-border")}>
				<TreeStats tree={tree} />
			</div>
		</div>
	);
}

// =============================================================================
// Tree Nodes Component
// =============================================================================

interface TreeNodesProps {
	nodes: FolderNode[];
	selectedPath: string | null;
	expandedPaths: Set<string>;
	hoveredPath: string | null;
	depth: number;
	onSelect: (path: string) => void;
	onToggleFolder: (path: string) => void;
	onHover: (path: string | null) => void;
	onNewFile?: (folderPath: string) => void;
	onNewFolder?: (parentPath: string) => void;
	onRenameFile?: (filePath: string, currentName: string) => void;
	onDropText?: (filePath: string, dragData: TextDragData) => void;
	onMoveFile?: (fromPath: string, toPath: string) => void;
}

function TreeNodes({
	nodes,
	selectedPath,
	expandedPaths,
	hoveredPath,
	depth,
	onSelect,
	onToggleFolder,
	onHover,
	onNewFile,
	onNewFolder,
	onRenameFile,
	onDropText,
	onMoveFile,
}: TreeNodesProps) {
	return (
		<>
			{nodes.map((node) => (
				<TreeNode
					key={node.path}
					node={node}
					isSelected={selectedPath === node.path}
					isExpanded={expandedPaths.has(node.path)}
					isHovered={hoveredPath === node.path}
					depth={depth}
					onSelect={onSelect}
					onToggleFolder={onToggleFolder}
					onHover={onHover}
					onNewFile={onNewFile}
					onNewFolder={onNewFolder}
					onRenameFile={onRenameFile}
					onDropText={onDropText}
					onMoveFile={onMoveFile}
					expandedPaths={expandedPaths}
					selectedPath={selectedPath}
					hoveredPath={hoveredPath}
				/>
			))}
		</>
	);
}

// =============================================================================
// Single Tree Node
// =============================================================================

interface TreeNodeProps {
	node: FolderNode;
	isSelected: boolean;
	isExpanded: boolean;
	isHovered: boolean;
	depth: number;
	selectedPath: string | null;
	expandedPaths: Set<string>;
	hoveredPath: string | null;
	onSelect: (path: string) => void;
	onToggleFolder: (path: string) => void;
	onHover: (path: string | null) => void;
	onNewFile?: (folderPath: string) => void;
	onNewFolder?: (parentPath: string) => void;
	onRenameFile?: (filePath: string, currentName: string) => void;
	onDropText?: (filePath: string, dragData: TextDragData) => void;
	onMoveFile?: (fromPath: string, toPath: string) => void;
}

function TreeNode({
	node,
	isSelected,
	isExpanded,
	isHovered,
	depth,
	selectedPath,
	expandedPaths,
	hoveredPath,
	onSelect,
	onToggleFolder,
	onHover,
	onNewFile,
	onNewFolder,
	onRenameFile,
	onDropText,
	onMoveFile,
}: TreeNodeProps) {
	const isFolder = node.type === "folder";
	const hasChildren = isFolder && node.children && node.children.length > 0;
	const paddingLeft = 12 + depth * 16;
	const nodeRef = useRef<HTMLDivElement>(null);
	const [isDragOver, setIsDragOver] = useState(false);
	const [isDragging, setIsDragging] = useState(false);

	// Set up draggable for file nodes
	useEffect(() => {
		const element = nodeRef.current;
		if (!element || isFolder || !onMoveFile) return;

		const cleanup = draggable({
			element,
			getInitialData: () => ({
				type: "file",
				filePath: node.path,
			}),
			onDragStart: () => {
				setIsDragging(true);
				// Clear any existing selection
				window.getSelection()?.removeAllRanges();
			},
			onDrop: () => {
				setIsDragging(false);
			},
		});

		return cleanup;
	}, [node.path, isFolder, onMoveFile]);

	// Set up drop target for folders (to accept file drops)
	useEffect(() => {
		const element = nodeRef.current;
		if (!element || !isFolder || !onMoveFile) return;

		return dropTargetForElements({
			element,
			getData: ({ source }) => {
				if (source.data.type === "file") {
					return source.data as unknown as Record<string, unknown>;
				}
				return {};
			},
			canDrop: ({ source }) => {
				// Can drop files, but not if the file is already directly in this folder
				if (source.data.type === "file") {
					const filePath = source.data.filePath as string;
					// Get the parent folder of the file being dragged
					const pathParts = filePath.split("/");
					pathParts.pop(); // Remove filename
					const fileParentFolder = pathParts.join("/");
					// Don't allow dropping if the file is already directly in this folder
					return fileParentFolder !== node.path;
				}
				return false;
			},
			onDragEnter: () => {
				setIsDragOver(true);
			},
			onDragLeave: () => {
				setIsDragOver(false);
			},
			onDrop: ({ source }) => {
				setIsDragOver(false);
				if (source.data.type === "file" && onMoveFile) {
					const filePath = source.data.filePath as string;
					const fileName = filePath.split("/").pop() || "";
					const newPath = node.path ? `${node.path}/${fileName}` : fileName;
					onMoveFile(filePath, newPath);
				}
			},
		});
	}, [node.path, isFolder, onMoveFile]);

	// Set up drop target for file nodes (for text drops and file drops)
	useEffect(() => {
		const element = nodeRef.current;
		if (!element || isFolder) return;

		let hoverTimeout: ReturnType<typeof setTimeout> | null = null;

		return dropTargetForElements({
			element,
			getData: ({ source }) => {
				if (source.data.type === "text-block" || source.data.type === "file") {
					return source.data as unknown as Record<string, unknown>;
				}
				return {};
			},
			canDrop: ({ source }) => {
				if (source.data.type === "text-block") {
					return true;
				}
				if (source.data.type === "file") {
					const filePath = source.data.filePath as string;
					// Don't allow dropping on the same file
					return filePath !== node.path;
				}
				return false;
			},
			onDragEnter: ({ source }) => {
				setIsDragOver(true);
				// Open file after a short delay when hovering text blocks (to avoid flickering)
				if (source.data.type === "text-block" && onDropText) {
					hoverTimeout = setTimeout(() => {
						if (!isFolder) {
							onSelect(node.path);
						}
					}, 300); // 300ms delay before opening
				}
			},
			onDragLeave: () => {
				setIsDragOver(false);
				if (hoverTimeout) {
					clearTimeout(hoverTimeout);
					hoverTimeout = null;
				}
			},
			onDrop: ({ source }) => {
				setIsDragOver(false);
				if (hoverTimeout) {
					clearTimeout(hoverTimeout);
					hoverTimeout = null;
				}
				if (source.data.type === "text-block" && onDropText) {
					const dragData = source.data as unknown as TextDragData;
					onDropText(node.path, dragData);
				} else if (source.data.type === "file" && onMoveFile) {
					const filePath = source.data.filePath as string;
					// Don't move to the same location
					if (filePath !== node.path) {
						// Get the folder path of the target file
						const pathParts = node.path.split("/");
						const fileName = filePath.split("/").pop() || "";
						if (pathParts.length > 1) {
							// File is in a folder
							pathParts.pop(); // Remove filename
							const folderPath = pathParts.join("/");
							const newPath = `${folderPath}/${fileName}`;
							onMoveFile(filePath, newPath);
						} else {
							// File is at root, move to root
							onMoveFile(filePath, fileName);
						}
					}
				}
			},
		});
	}, [node.path, isFolder, onDropText, onSelect, onMoveFile]);

	const handleClick = useCallback(() => {
		// Don't handle click if we just finished dragging
		if (isDragging) {
			return;
		}
		if (isFolder) {
			onToggleFolder(node.path);
		} else {
			onSelect(node.path);
		}
	}, [isFolder, node.path, onSelect, onToggleFolder, isDragging]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				handleClick();
			}
		},
		[handleClick]
	);

	return (
		<div>
			<div
				ref={nodeRef}
				role="treeitem"
				tabIndex={0}
				aria-selected={isSelected}
				aria-expanded={isFolder ? isExpanded : undefined}
				draggable={!isFolder && !!onMoveFile}
				className={cn(
					"group flex cursor-pointer items-center gap-1 py-1 pr-2 text-sm transition-colors",
					"hover:bg-accent/50",
					isSelected && "bg-accent text-accent-foreground",
					!isSelected && "text-foreground/80",
					isDragOver && !isFolder && "bg-primary/20 border-l-4 border-l-primary shadow-sm",
					isDragOver && isFolder && "bg-primary/10 border-l-4 border-l-primary",
					isDragging && "opacity-50"
				)}
				style={{
					paddingLeft,
					userSelect: !isFolder && onMoveFile ? 'none' : undefined,
					WebkitUserSelect: !isFolder && onMoveFile ? 'none' : undefined,
					cursor: !isFolder && onMoveFile ? 'grab' : 'pointer',
				}}
				onClick={handleClick}
				onKeyDown={handleKeyDown}
				onMouseEnter={() => onHover(node.path)}
				onMouseLeave={() => onHover(null)}
			>
				{/* Expand/Collapse Arrow */}
				<span className="flex h-4 w-4 items-center justify-center">
					{isFolder ? (
						isExpanded ? (
							<ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
						) : (
							<ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
						)
					) : null}
				</span>

				{/* Icon */}
				{isFolder ? (
					isExpanded ? (
						<FolderOpen className="h-4 w-4 text-amber-500" />
					) : (
						<Folder className="h-4 w-4 text-amber-500" />
					)
				) : (
					<FileText className="h-4 w-4 text-blue-500" />
				)}

				{/* Name */}
				<span 
					className="flex-1 truncate"
					style={{
						userSelect: !isFolder && onMoveFile ? 'none' : undefined,
						WebkitUserSelect: !isFolder && onMoveFile ? 'none' : undefined,
					}}
				>
					{node.name}
				</span>

				{/* Word count for files */}
				{!isFolder && node.wordCount !== undefined && (
					<span className="text-xs text-muted-foreground group-hover:hidden">
						{formatWordCount(node.wordCount)}
					</span>
				)}

				{/* Actions on hover for files */}
				{isHovered && !isFolder && onRenameFile && (
					<div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
						<button
							onClick={(e) => {
								e.stopPropagation();
								onRenameFile(node.path, node.name);
							}}
							className="rounded p-0.5 hover:bg-background/50"
							title="Rename"
						>
							<Pencil className="h-3 w-3" />
						</button>
					</div>
				)}

				{/* Actions on hover for folders */}
				{isHovered && isFolder && (
					<div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
						{onNewFile && (
							<button
								onClick={(e) => {
									e.stopPropagation();
									onNewFile(node.path);
								}}
								className="rounded p-0.5 hover:bg-background/50"
								title="New File"
							>
								<FilePlus className="h-3.5 w-3.5" />
							</button>
						)}
						{onNewFolder && (
							<button
								onClick={(e) => {
									e.stopPropagation();
									onNewFolder(node.path);
								}}
								className="rounded p-0.5 hover:bg-background/50"
								title="New Folder"
							>
								<FolderPlus className="h-3.5 w-3.5" />
							</button>
						)}
					</div>
				)}
			</div>

			{/* Children */}
			{isFolder && isExpanded && (
				<>
					{hasChildren && (
						<TreeNodes
							nodes={node.children!}
							selectedPath={selectedPath}
							expandedPaths={expandedPaths}
							hoveredPath={hoveredPath}
							depth={depth + 1}
							onSelect={onSelect}
							onToggleFolder={onToggleFolder}
							onHover={onHover}
							onNewFile={onNewFile}
							onNewFolder={onNewFolder}
							onRenameFile={onRenameFile}
							onDropText={onDropText}
							onMoveFile={onMoveFile}
						/>
					)}
					{/* Add New File button at bottom of folder */}
					{onNewFile && (
						<NewFileButton
							folderPath={node.path}
							depth={depth + 1}
							onNewFile={onNewFile}
						/>
					)}
				</>
			)}
		</div>
	);
}

// =============================================================================
// New File Button (appears at bottom of expanded folders)
// =============================================================================

interface NewFileButtonProps {
	folderPath: string;
	depth: number;
	onNewFile: (folderPath: string) => void;
}

function NewFileButton({ folderPath, depth, onNewFile }: NewFileButtonProps) {
	const paddingLeft = 12 + depth * 16;

	return (
		<button
			onClick={() => onNewFile(folderPath)}
			className={cn(
				"flex w-full cursor-pointer items-center gap-1 py-1 pr-2 text-sm transition-colors",
				"text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent/30"
			)}
			style={{ paddingLeft }}
		>
			<span className="flex h-4 w-4 items-center justify-center">
				{/* Empty space to align with other items */}
			</span>
			<FilePlus className="h-3.5 w-3.5" />
			<span className="text-xs">New file...</span>
		</button>
	);
}

// =============================================================================
// Tree Stats
// =============================================================================

function TreeStats({ tree }: { tree: FolderNode[] }) {
	const stats = calculateStats(tree);

	return (
		<div className="flex items-center justify-between text-xs text-muted-foreground">
			<span>
				{stats.files} {stats.files === 1 ? "file" : "files"}
			</span>
			<span>{formatWordCount(stats.words)} total</span>
		</div>
	);
}

function calculateStats(nodes: FolderNode[]): { files: number; words: number } {
	let files = 0;
	let words = 0;

	function traverse(node: FolderNode) {
		if (node.type === "file") {
			files++;
			words += node.wordCount ?? 0;
		} else if (node.children) {
			node.children.forEach(traverse);
		}
	}

	nodes.forEach(traverse);
	return { files, words };
}

// =============================================================================
// Utilities
// =============================================================================

function formatWordCount(count: number): string {
	if (count >= 1000) {
		return `${(count / 1000).toFixed(1)}k`;
	}
	return count.toString();
}

