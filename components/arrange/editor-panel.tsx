"use client";

import { useState, useEffect } from "react";
import { ChevronDown, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjectContext } from "@/components/project-provider";
import { useEditorSettingsContext } from "@/components/theme-provider";
import { NovelEditor } from "@/components/novel-editor";
import { getBlockDisplayTitle } from "./types";
import { DraggablePanelHeader } from "./draggable-panel-header";
import type { BlockMetadata } from "@/lib/project/types";

// =============================================================================
// Editor Panel Component
// =============================================================================

interface EditorPanelProps {
	selectedBlockPath: string | null;
	blocks: Record<string, BlockMetadata>;
	onContentChange: (filePath: string, content: string) => void;
}

export function EditorPanel({ selectedBlockPath, blocks, onContentChange }: EditorPanelProps) {
	const { block } = useProjectContext();
	const { showBorders, showEdgeFade } = useEditorSettingsContext();

	const selectedBlock = selectedBlockPath ? blocks[selectedBlockPath] : null;
	const displayTitle = selectedBlockPath ? getBlockDisplayTitle(selectedBlockPath) : null;

	// =========================================================================
	// Load block into block system when selected
	// =========================================================================

	const [isLoadingContent, setIsLoadingContent] = useState(false);

	useEffect(() => {
		if (!selectedBlockPath) return;

		let cancelled = false;
		queueMicrotask(() => {
			if (!cancelled) setIsLoadingContent(true);
		});

		block.openBlock(selectedBlockPath).finally(() => {
			if (!cancelled) setIsLoadingContent(false);
		});

		return () => {
			cancelled = true;
		};
		// block.openBlock is stable; block object reference changes on state updates, causing infinite loop
		// eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally omit block to avoid infinite loop
	}, [selectedBlockPath]);

	// =========================================================================
	// Metadata collapsed state
	// =========================================================================

	const [isMetadataOpen, setIsMetadataOpen] = useState(false);

	const activeBlock = block.getActiveBlock();
	const isActiveBlockSelected = selectedBlockPath && activeBlock?.filePath === selectedBlockPath;

	return (
		<div className="flex h-full flex-col bg-muted/30">
			{/* Header */}
			<div className={cn("px-4 py-3", showBorders && "border-b border-border")}>
				<DraggablePanelHeader
					panelId="editor"
					title="Editor"
				/>
			</div>

			{selectedBlock && selectedBlockPath ? (
				<div className="flex flex-1 flex-col overflow-hidden min-h-0">
					{/* Block Title Bar */}
					<div className={cn("flex items-center gap-2 px-4 py-2 shrink-0", showBorders && "border-b border-border")}>
						<FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
						<span className="text-sm font-medium truncate">{displayTitle}</span>
					</div>

					{/* Editor Area - relative wrapper for edge fade overlays */}
					<div className="relative flex-1 min-h-0">
						<div className="absolute inset-0 overflow-auto">
							{isLoadingContent ? (
								<div className="flex items-center justify-center py-12">
									<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
								</div>
							) : isActiveBlockSelected ? (
								<div className="mx-auto max-w-3xl px-4 py-6">
									<NovelEditor
										key={selectedBlockPath}
										initialContent={activeBlock?.content ?? ""}
										onChange={(content) => onContentChange(selectedBlockPath, content)}
										editorKey={selectedBlockPath}
										sourceFilePath={selectedBlockPath}
									/>
								</div>
							) : (
								<div className="text-center text-sm text-muted-foreground py-8">
									Loading...
								</div>
							)}
						</div>
						{/* Edge fade overlays - positioned outside scroll container so they stay fixed */}
						{showEdgeFade && (
							<>
								<div
									className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-linear-to-b from-muted/30 to-transparent"
									aria-hidden="true"
								/>
								<div
									className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-linear-to-t from-muted/30 to-transparent"
									aria-hidden="true"
								/>
							</>
						)}
					</div>

					{/* Status Bar */}
					{isActiveBlockSelected && activeBlock && (
						<div className={cn("flex items-center justify-end gap-3 px-4 py-1.5 shrink-0 text-xs text-muted-foreground", showBorders && "border-t border-border")}>
							{block.unsavedBlocks.has(selectedBlockPath) && (
								<span>Unsaved</span>
							)}
							{block.savingBlocks.has(selectedBlockPath) && (
								<span className="animate-pulse">Saving...</span>
							)}
							<span>{activeBlock.wordCount.toLocaleString()} words</span>
						</div>
					)}

					{/* Collapsible Metadata Section */}
					<div className={cn("shrink-0", showBorders && "border-t border-border")}>
						<button
							onClick={() => setIsMetadataOpen((prev) => !prev)}
							className="flex w-full items-center justify-between px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
						>
							<span>Metadata</span>
							<ChevronDown
								className={cn(
									"h-3 w-3 transition-transform",
									isMetadataOpen && "rotate-180"
								)}
							/>
						</button>

						{isMetadataOpen && (
							<div className="px-4 pb-3 space-y-2 text-xs">
								{/* File Path */}
								<div>
									<span className="text-muted-foreground">Path: </span>
									<span className="font-mono break-all">{selectedBlockPath}</span>
								</div>

								{/* Arrangement */}
								{selectedBlock.arrangement && (
									<div className="flex gap-3">
										<span>
											<span className="text-muted-foreground">Track: </span>
											{selectedBlock.arrangement.track}
										</span>
										<span>
											<span className="text-muted-foreground">Slot: </span>
											{selectedBlock.arrangement.slot}
										</span>
										<span>
											<span className="text-muted-foreground">Included: </span>
											{selectedBlock.arrangement.included ? "Yes" : "No"}
										</span>
									</div>
								)}

								{/* Tags */}
								{selectedBlock.tags.length > 0 && (
									<div className="flex flex-wrap gap-1">
										{selectedBlock.tags.map((tag) => (
											<span
												key={tag}
												className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
											>
												{tag}
											</span>
										))}
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			) : (
				<div className="flex-1 flex items-center justify-center">
					<p className="text-sm text-muted-foreground">Select a block to edit</p>
				</div>
			)}
		</div>
	);
}
