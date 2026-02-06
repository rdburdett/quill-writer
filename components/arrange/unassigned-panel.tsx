"use client";

import { cn } from "@/lib/utils";
import { useEditorSettingsContext } from "@/components/theme-provider";
import { getBlockDisplayTitle } from "./types";
import { BlockCard } from "./block-card";
import { DraggablePanelHeader } from "./draggable-panel-header";
import type { BlockMetadata } from "@/lib/project/types";

// =============================================================================
// Unassigned Panel Component
// =============================================================================

interface UnassignedPanelProps {
	blocks: Array<{ filePath: string; metadata: BlockMetadata }>;
	selectedBlockPath: string | null;
	onBlockSelect: (filePath: string | null) => void;
	onBlockDrop: (
		filePath: string,
		targetTrackIndex: number,
		targetSlot: number,
		sourceTrackIndex?: number,
		sourceSlot?: number
	) => void;
}

export function UnassignedPanel({
	blocks,
	selectedBlockPath,
	onBlockSelect,
	onBlockDrop,
}: UnassignedPanelProps) {
	const { showBorders } = useEditorSettingsContext();

	return (
		<div className="flex h-full flex-col bg-muted/30">
			{/* Header */}
			<div className={cn("px-4 py-3", showBorders && "border-b border-border")}>
				<DraggablePanelHeader
					panelId="unassigned"
					title="Unassigned"
				>
					<p className="text-xs text-muted-foreground">
						{blocks.length} {blocks.length === 1 ? "block" : "blocks"}
					</p>
				</DraggablePanelHeader>
			</div>

			{/* Blocks List */}
			<div className="flex-1 overflow-auto p-3 space-y-2">
				{blocks.length === 0 ? (
					<div className="text-center text-sm text-muted-foreground py-8">
						All blocks are assigned
					</div>
				) : (
					blocks.map(({ filePath, metadata }) => (
						<BlockCard
							key={filePath}
							filePath={filePath}
							metadata={metadata}
							isSelected={selectedBlockPath === filePath}
							onSelect={() => onBlockSelect(filePath)}
							onDrop={onBlockDrop}
						/>
					))
				)}
			</div>
		</div>
	);
}
