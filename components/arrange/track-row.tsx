"use client";

import { useState, useRef, useEffect } from "react";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEditorSettingsContext } from "@/components/theme-provider";
import { getBlocksForTrack } from "./types";
import { BlockCard } from "./block-card";
import { DropZone } from "./drop-zone";
import type { ArrangementTrack, BlockMetadata } from "@/lib/project/types";
import type { BlockDragData } from "./types";

// =============================================================================
// Track Row Component
// =============================================================================

interface TrackRowProps {
	track: ArrangementTrack;
	trackIndex: number;
	blocks: Record<string, BlockMetadata>;
	selectedBlockPath: string | null;
	onBlockSelect: (filePath: string | null) => void;
	onBlockDrop: (
		filePath: string,
		targetTrackIndex: number,
		targetSceneIndex: number,
		targetSlot: number,
		sourceTrackIndex?: number,
		sourceSceneIndex?: number,
		sourceSlot?: number
	) => void;
	onToggleIncluded: (filePath: string, included: boolean) => void;
	onTrackRename: (trackId: string, newName: string) => void;
}

export function TrackRow({
	track,
	trackIndex,
	blocks,
	selectedBlockPath,
	onBlockSelect,
	onBlockDrop,
	onToggleIncluded,
	onTrackRename,
}: TrackRowProps) {
	const { showBorders } = useEditorSettingsContext();
	const [isCollapsed, setIsCollapsed] = useState(track.collapsed ?? false);
	const [isRenaming, setIsRenaming] = useState(false);
	const [editName, setEditName] = useState(track.name);
	const trackRef = useRef<HTMLDivElement>(null);
	const [isDragOver, setIsDragOver] = useState(false);

	const trackBlocks = getBlocksForTrack(blocks, trackIndex);

	// Set up drop target for empty track
	useEffect(() => {
		const element = trackRef.current;
		if (!element) return;

		return dropTargetForElements({
			element,
			canDrop: ({ source }) =>
				source.data.type === "arrange-block" || source.data.type === "file",
			onDragEnter: () => {
				setIsDragOver(true);
			},
			onDragLeave: () => {
				setIsDragOver(false);
			},
			onDrop: ({ source }) => {
				setIsDragOver(false);
				if (trackBlocks.length === 0) {
					const isFile = source.data.type === "file";
					const filePath = isFile
						? (source.data.filePath as string)
						: (source.data as unknown as BlockDragData).filePath;
					const dragData = source.data as unknown as BlockDragData;
					onBlockDrop(
						filePath,
						trackIndex,
						0,
						0,
						isFile ? undefined : dragData.sourceTrack,
						isFile ? undefined : dragData.sourceSceneIndex,
						isFile ? undefined : dragData.sourceSlot
					);
				}
			},
		});
	}, [trackIndex, trackBlocks.length, onBlockDrop]);

	const handleRenameStart = () => {
		setIsRenaming(true);
		setEditName(track.name);
	};

	const handleRenameSubmit = () => {
		if (editName.trim() && editName.trim() !== track.name) {
			onTrackRename(track.id, editName.trim());
		}
		setIsRenaming(false);
	};

	const handleRenameCancel = () => {
		setEditName(track.name);
		setIsRenaming(false);
	};

	return (
		<div
			ref={trackRef}
			className={cn(
				"border-b border-border/50",
				isDragOver && trackBlocks.length === 0 && "bg-primary/10"
			)}
		>
			{/* Track Header */}
			<div className={cn("flex items-center gap-2 px-4 py-2 bg-muted/30", showBorders && "border-b border-border")}>
				<Button
					variant="ghost"
					size="icon-sm"
					className="h-6 w-6"
					onClick={() => setIsCollapsed(!isCollapsed)}
				>
					{isCollapsed ? (
						<ChevronRight className="h-3.5 w-3.5" />
					) : (
						<ChevronDown className="h-3.5 w-3.5" />
					)}
				</Button>

				{isRenaming ? (
					<input
						type="text"
						value={editName}
						onChange={(e) => setEditName(e.target.value)}
						onBlur={handleRenameSubmit}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								handleRenameSubmit();
							} else if (e.key === "Escape") {
								handleRenameCancel();
							}
						}}
						className="flex-1 px-2 py-1 text-sm font-medium bg-background border rounded focus:outline-none focus:ring-2 focus:ring-ring"
						autoFocus
					/>
				) : (
					<>
						<h3 className="flex-1 text-sm font-medium">{track.name}</h3>
						<Button
							variant="ghost"
							size="icon-sm"
							className="h-6 w-6"
							onClick={handleRenameStart}
						>
							<Pencil className="h-3.5 w-3.5" />
						</Button>
					</>
				)}

				<span className="text-xs text-muted-foreground">
					{trackBlocks.length} {trackBlocks.length === 1 ? "block" : "blocks"}
				</span>
			</div>

			{/* Track Content */}
			{!isCollapsed && (
				<div className="p-4">
					{trackBlocks.length === 0 ? (
						<div className="text-center text-sm text-muted-foreground py-8 border-2 border-dashed rounded">
							Drop blocks here
						</div>
					) : (
						<div className="space-y-2">
							{trackBlocks.map(({ filePath, metadata }, index) => (
								<div key={filePath}>
									<DropZone
										trackIndex={trackIndex}
										sceneIndex={0}
										slot={index}
										onDrop={onBlockDrop}
									/>
									<BlockCard
										filePath={filePath}
										metadata={metadata}
										isSelected={selectedBlockPath === filePath}
										onSelect={() => onBlockSelect(filePath)}
										onDrop={onBlockDrop}
										onToggleIncluded={onToggleIncluded}
									/>
								</div>
							))}
							<DropZone
								trackIndex={trackIndex}
								sceneIndex={0}
								slot={trackBlocks.length}
								onDrop={onBlockDrop}
							/>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
