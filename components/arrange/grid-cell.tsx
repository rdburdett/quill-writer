"use client";

import { useRef, useEffect, useState } from "react";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { cn } from "@/lib/utils";
import { getBlocksForCell } from "./types";
import { BlockCard } from "./block-card";
import { DropZone } from "./drop-zone";
import type { BlockMetadata } from "@/lib/project/types";
import type { BlockDragData } from "./types";

// =============================================================================
// Grid Cell Component
// =============================================================================

interface GridCellProps {
	trackIndex: number;
	sceneIndex: number;
	/** Track color: block cards in this cell use this as their background tint */
	trackColor?: string;
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
	onToggleIncluded?: (filePath: string, included: boolean) => void;
	/** Double-click on empty cell to create a new block in that cell */
	onCellDoubleClick?: (trackIndex: number, sceneIndex: number) => void;
}

export function GridCell({
	trackIndex,
	sceneIndex,
	trackColor,
	blocks,
	selectedBlockPath,
	onBlockSelect,
	onBlockDrop,
	onCellDoubleClick,
}: GridCellProps) {
	const cellRef = useRef<HTMLDivElement>(null);
	const [isDragOver, setIsDragOver] = useState(false);

	const cellBlocks = getBlocksForCell(blocks, trackIndex, sceneIndex);

	useEffect(() => {
		const element = cellRef.current;
		if (!element) return;

		return dropTargetForElements({
			element,
			canDrop: ({ source }) =>
				source.data.type === "arrange-block" || source.data.type === "file",
			onDragEnter: () => setIsDragOver(true),
			onDragLeave: () => setIsDragOver(false),
			onDrop: ({ source }) => {
				setIsDragOver(false);
				if (cellBlocks.length === 0) {
					const isFile = source.data.type === "file";
					const filePath = isFile
						? (source.data.filePath as string)
						: (source.data as unknown as BlockDragData).filePath;
					const dragData = source.data as unknown as BlockDragData;
					onBlockDrop(
						filePath,
						trackIndex,
						sceneIndex,
						0,
						isFile ? undefined : dragData.sourceTrack,
						isFile ? undefined : dragData.sourceSceneIndex,
						isFile ? undefined : dragData.sourceSlot
					);
				}
			},
		});
	}, [trackIndex, sceneIndex, cellBlocks.length, onBlockDrop]);

	return (
		<div
			ref={cellRef}
			className={cn(
				"p-1 transition-colors",
				isDragOver && cellBlocks.length === 0 && "bg-primary/10"
			)}
		>
			{cellBlocks.length === 0 ? (
				<div
					className="flex min-h-8 cursor-pointer items-center justify-center rounded-sm border border-dashed border-muted-foreground/25 hover:border-muted-foreground/40"
					onDoubleClick={() => onCellDoubleClick?.(trackIndex, sceneIndex)}
					role="button"
					tabIndex={0}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							onCellDoubleClick?.(trackIndex, sceneIndex);
						}
					}}
					aria-label="Double-click to create a new block"
				/>
			) : (
				<div className="space-y-1">
					{cellBlocks.map(({ filePath, metadata }, index) => (
						<div key={filePath}>
							<DropZone
								trackIndex={trackIndex}
								sceneIndex={sceneIndex}
								slot={index}
								onDrop={onBlockDrop}
							/>
							<BlockCard
								filePath={filePath}
								metadata={metadata}
								trackColor={trackColor}
								isSelected={selectedBlockPath === filePath}
								onSelect={() => onBlockSelect(filePath)}
								onDrop={onBlockDrop}
							/>
						</div>
					))}
					<DropZone
						trackIndex={trackIndex}
						sceneIndex={sceneIndex}
						slot={cellBlocks.length}
						onDrop={onBlockDrop}
					/>
				</div>
			)}
		</div>
	);
}
