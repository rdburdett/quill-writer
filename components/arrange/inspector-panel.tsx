"use client";

import { useState, useEffect } from "react";
import { ChevronDown, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjectContext } from "@/components/project-provider";
import { useEditorSettingsContext } from "@/components/theme-provider";
import { getBlockDisplayTitle } from "./types";
import { DraggablePanelHeader } from "./draggable-panel-header";
import type { BlockMetadata } from "@/lib/project/types";

// =============================================================================
// Inspector Panel Component
// =============================================================================

interface InspectorPanelProps {
	selectedBlockPath: string | null;
	blocks: Record<string, BlockMetadata>;
}

export function InspectorPanel({ selectedBlockPath, blocks }: InspectorPanelProps) {
	const { project } = useProjectContext();
	const { showBorders } = useEditorSettingsContext();

	const selectedBlock = selectedBlockPath ? blocks[selectedBlockPath] : null;
	const displayTitle = selectedBlockPath ? getBlockDisplayTitle(selectedBlockPath) : null;

	// =========================================================================
	// Load block text content on selection
	// =========================================================================

	const [blockContent, setBlockContent] = useState<string | null>(null);
	const [isLoadingContent, setIsLoadingContent] = useState(false);

	useEffect(() => {
		if (!selectedBlockPath) {
			setBlockContent(null);
			return;
		}

		let cancelled = false;
		setIsLoadingContent(true);

		project.loadBlock(selectedBlockPath).then((block) => {
			if (cancelled) return;
			setBlockContent(block?.content ?? null);
			setIsLoadingContent(false);
		}).catch(() => {
			if (cancelled) return;
			setBlockContent(null);
			setIsLoadingContent(false);
		});

		return () => { cancelled = true; };
	}, [selectedBlockPath, project]);

	// =========================================================================
	// Metadata collapsed state
	// =========================================================================

	const [isMetadataOpen, setIsMetadataOpen] = useState(false);

	return (
		<div className="flex h-full flex-col bg-muted/30">
			{/* Header */}
			<div className={cn("px-4 py-3", showBorders && "border-b border-border")}>
				<DraggablePanelHeader
					panelId="inspector"
					title="Inspector"
				/>
			</div>

			{selectedBlock && selectedBlockPath ? (
				<div className="flex flex-1 flex-col overflow-hidden">
					{/* Block Title Bar */}
					<div className={cn("flex items-center gap-2 px-4 py-2", showBorders && "border-b border-border")}>
						<FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
						<span className="text-sm font-medium truncate">{displayTitle}</span>
					</div>

					{/* Text Preview (main area) */}
					<div className="flex-1 overflow-auto">
						{isLoadingContent ? (
							<div className="flex items-center justify-center py-12">
								<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
							</div>
						) : blockContent ? (
							<div className="p-4">
								<pre className="text-sm whitespace-pre-wrap wrap-break-word font-[inherit] leading-relaxed">
									{blockContent}
								</pre>
							</div>
						) : (
							<div className="text-center text-sm text-muted-foreground py-8">
								No content
							</div>
						)}
					</div>

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
					<p className="text-sm text-muted-foreground">Select a block to preview</p>
				</div>
			)}
		</div>
	);
}
