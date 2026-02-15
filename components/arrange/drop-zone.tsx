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
	sceneIndex: number;
	slot: number;
	onDrop: (
		filePath: string,
		targetTrackIndex: number,
		targetSceneIndex: number,
		targetSlot: number,
		sourceTrackIndex?: number,
		sourceSceneIndex?: number,
		sourceSlot?: number
	) => void;
}

export function DropZone({
	trackIndex,
	sceneIndex,
	slot,
	onDrop,
}: DropZoneProps) {
	const zoneRef = useRef<HTMLDivElement>(null);
	const [isDragOver, setIsDragOver] = useState(false);

	useEffect(() => {
		const element = zoneRef.current;
		if (!element) return;

		return dropTargetForElements({
			element,
			canDrop: ({ source }) =>
				source.data.type === "arrange-block" || source.data.type === "file",
			getData: () => ({ trackIndex, slot }),
			onDragEnter: () => {
				setIsDragOver(true);
			},
			onDragLeave: () => {
				setIsDragOver(false);
			},
			onDrop: ({ source }) => {
				setIsDragOver(false);
				const isFile = source.data.type === "file";
				const filePath = isFile
					? (source.data.filePath as string)
					: (source.data as unknown as BlockDragData).filePath;
				const dragData = source.data as unknown as BlockDragData;
				onDrop(
					filePath,
					trackIndex,
					sceneIndex,
					slot,
					isFile ? undefined : dragData.sourceTrack,
					isFile ? undefined : dragData.sourceSceneIndex,
					isFile ? undefined : dragData.sourceSlot
				);
			},
		});
	}, [trackIndex, sceneIndex, slot, onDrop]);

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
