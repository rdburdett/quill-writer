"use client";

import { useCallback, useMemo, useEffect } from "react";
import { AlertTriangle, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NovelEditor } from "@/components/novel-editor";
import { TabSystem, type TextDragData } from "@/components/tab-system";
import { useProjectContext } from "@/components/project-provider";
import { useEditorSettingsContext } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import type { FolderNode } from "@/lib/project/types";

// =============================================================================
// Editor Content Component
// =============================================================================

interface EditorContentProps {
	/** Register a file select handler (called when a file is clicked in sidebar) */
	onRegisterFileSelect: (handler: (path: string) => void) => void;
	/** Set mode-specific info to display in header (file info) */
	onSetModeInfo: (info: React.ReactNode) => void;
}

export function EditorContent({ onRegisterFileSelect, onSetModeInfo }: EditorContentProps) {
	const { project, block, folderTree } = useProjectContext();
	const { showBorders } = useEditorSettingsContext();

	// =========================================================================
	// File select handler (opens file in tab)
	// =========================================================================

	const handleFileSelect = useCallback(
		async (path: string) => {
			// Find the node to check if it's a file
			const node = findNodeByPath(project.folderTree, path);
			if (node?.type === "file") {
				await block.openBlock(path);
				folderTree.select(path);
			}
		},
		[block, folderTree, project.folderTree]
	);

	// Register the handler with the shell
	useEffect(() => {
		onRegisterFileSelect(handleFileSelect);
	}, [handleFileSelect, onRegisterFileSelect]);

	// =========================================================================
	// Mode info slot (file info in header)
	// =========================================================================

	useEffect(() => {
		const activeBlock = block.getActiveBlock();
		if (activeBlock) {
			onSetModeInfo(
				<div className="flex items-center gap-2">
					<span className="text-muted-foreground">/</span>
					<span className="font-medium">{activeBlock.title}</span>
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
				</div>
			);
		} else {
			onSetModeInfo(null);
		}
	}, [block, onSetModeInfo]);

	// =========================================================================
	// Tab system
	// =========================================================================

	const tabs = useMemo(() => {
		return block.tabOrder.map((filePath) => {
			const blockData = block.getBlock(filePath);
			return {
				filePath,
				title: blockData?.title ?? filePath.split("/").pop() ?? filePath,
				isUnsaved: block.unsavedBlocks.has(filePath),
			};
		});
	}, [block.tabOrder, block.openBlocks, block.unsavedBlocks]);

	// =========================================================================
	// Handlers
	// =========================================================================

	const handleContentChange = useCallback(
		(filePath: string, content: string) => {
			block.updateContent(filePath, content);
		},
		[block]
	);

	const handleTabClick = useCallback(
		(filePath: string) => {
			block.setActiveBlock(filePath);
			folderTree.select(filePath);
		},
		[block, folderTree]
	);

	const handleTabClose = useCallback(
		(filePath: string) => {
			block.closeBlock(filePath);
		},
		[block]
	);

	const handleTabsReorder = useCallback((newOrder: string[]) => {
		block.reorderTabs(newOrder);
	}, [block]);

	const handleDropText = useCallback(
		async (targetFilePath: string, dragData: TextDragData) => {
			// This is handled by the shell, but we need to provide it for TabSystem
			// The shell's handleDropText will handle the actual logic
		},
		[]
	);

	return (
		<div className="flex h-full flex-col overflow-hidden">
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
			<div className={cn("flex items-center justify-between bg-muted/30 px-4 py-2", showBorders && "border-t border-border")}>
				<div className="flex-1" />
				<p className="text-xs text-muted-foreground/60">
					Press{" "}
					<kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
						/
					</kbd>{" "}
					for commands
				</p>
				<div className="flex-1 text-right">
					{block.getActiveBlock() && (
						<span className="text-xs text-muted-foreground/60">
							{block.getActiveBlock()?.wordCount.toLocaleString()} words
						</span>
					)}
				</div>
			</div>
		</div>
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
