"use client";

import { useRef, useEffect, useState } from "react";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { cn } from "@/lib/utils";
import type { BlockDragData } from "./types";

// =============================================================================
// Drop Zone Component
// =============================================================================

interface DropZoneProps {
	trackIndex: number;
	slot: number;
	onDrop: (
		filePath: string,
		targetTrackIndex: number,
		targetSlot: number,
		sourceTrackIndex?: number,
		sourceSlot?: number
	) => void;
}

export function DropZone({ trackIndex, slot, onDrop }: DropZoneProps) {
	const zoneRef = useRef<HTMLDivElement>(null);
	const [isDragOver, setIsDragOver] = useState(false);

	useEffect(() => {
		const element = zoneRef.current;
		if (!element) return;

		return dropTargetForElements({
			element,
			canDrop: ({ source }) => {
				return source.data.type === "arrange-block";
			},
			getData: () => ({ trackIndex, slot }),
			onDragEnter: () => {
				setIsDragOver(true);
			},
			onDragLeave: () => {
				setIsDragOver(false);
			},
			onDrop: ({ source }) => {
				setIsDragOver(false);
				const dragData = source.data as BlockDragData;
				onDrop(
					dragData.filePath,
					trackIndex,
					slot,
					dragData.sourceTrack,
					dragData.sourceSlot
				);
			},
		});
	}, [trackIndex, slot, onDrop]);

	return (
		<div
			ref={zoneRef}
			className={cn(
				"h-2 -my-1 transition-all",
				isDragOver && "h-8 bg-primary/20 border-y-2 border-primary border-dashed"
			)}
		/>
	);
}
