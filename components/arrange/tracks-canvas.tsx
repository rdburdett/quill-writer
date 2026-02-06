"use client";

import { TrackRow } from "./track-row";
import { DraggablePanelHeader } from "./draggable-panel-header";
import type { ArrangementTrack, BlockMetadata } from "@/lib/project/types";
import type { PanelDragData } from "./draggable-panel-header";

// =============================================================================
// Tracks Canvas Component
// =============================================================================

interface TracksCanvasProps {
	tracks: ArrangementTrack[];
	blocks: Record<string, BlockMetadata>;
	selectedBlockPath: string | null;
	onBlockSelect: (filePath: string | null) => void;
	onBlockDrop: (
		filePath: string,
		targetTrackIndex: number,
		targetSlot: number,
		sourceTrackIndex?: number,
		sourceSlot?: number
	) => void;
	onToggleIncluded: (filePath: string, included: boolean) => void;
	onTrackRename: (trackId: string, newName: string) => void;
}

export function TracksCanvas({
	tracks,
	blocks,
	selectedBlockPath,
	onBlockSelect,
	onBlockDrop,
	onToggleIncluded,
	onTrackRename,
}: TracksCanvasProps) {
	return (
		<div className="flex h-full flex-col">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
				<DraggablePanelHeader
					panelId="tracks"
					title="Tracks"
				/>
			</div>

			{/* Tracks List */}
			<div className="flex-1 overflow-auto">
				{tracks.map((track, index) => (
					<TrackRow
						key={track.id}
						track={track}
						trackIndex={index}
						blocks={blocks}
						selectedBlockPath={selectedBlockPath}
						onBlockSelect={onBlockSelect}
						onBlockDrop={onBlockDrop}
						onToggleIncluded={onToggleIncluded}
						onTrackRename={onTrackRename}
					/>
				))}
			</div>
		</div>
	);
}
