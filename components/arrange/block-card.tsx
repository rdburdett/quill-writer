"use client";

import { useRef, useEffect } from "react";
import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { getBlockDisplayTitle, type BlockDragData } from "./types";
import type { BlockMetadata } from "@/lib/project/types";

function hexToRgba(hex: string, alpha: number): string {
	const n = parseInt(hex.slice(1), 16);
	const r = (n >> 16) & 0xff;
	const g = (n >> 8) & 0xff;
	const b = n & 0xff;
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// =============================================================================
// Block Card Component
// =============================================================================

interface BlockCardProps {
	filePath: string;
	metadata: BlockMetadata;
	/** Track color: card uses this as a background tint */
	trackColor?: string;
	isSelected: boolean;
	onSelect: () => void;
	onDrop: (
		filePath: string,
		targetTrackIndex: number,
		targetSceneIndex: number,
		targetSlot: number,
		sourceTrackIndex?: number,
		sourceSceneIndex?: number,
		sourceSlot?: number,
	) => void;
	onToggleIncluded?: (filePath: string, included: boolean) => void;
}

export function BlockCard({
	filePath,
	metadata,
	trackColor,
	isSelected,
	onSelect,
	onDrop, // Required by interface; drop handled by grid cells
	onToggleIncluded,
}: BlockCardProps) {
	void onDrop; // Part of interface; drop handled by parent grid cells
	const cardRef = useRef<HTMLDivElement>(null);
	const displayTitle = getBlockDisplayTitle(filePath);
	const arrangement = metadata.arrangement;
	const isIncluded = arrangement?.included ?? true;

	// Set up drag source
	useEffect(() => {
		const element = cardRef.current;
		if (!element) return;

		return draggable({
			element,
			getInitialData: () => {
				const dragData: BlockDragData = {
					type: "arrange-block",
					filePath,
					sourceTrack: arrangement?.track,
					sourceSceneIndex: arrangement?.sceneIndex,
					sourceSlot: arrangement?.slot,
				};
				return dragData;
			},
			onDragStart: () => {
				element.style.opacity = "0.5";
			},
			onDrop: () => {
				element.style.opacity = "1";
			},
		});
	}, [filePath, arrangement]);

	return (
		<Card
			ref={cardRef}
			className={cn(
				"cursor-grab active:cursor-grabbing rounded-sm px-2 py-1.5 transition-all",
				"hover:shadow-md",
				isSelected && "ring-1 ring-primary",
				!isIncluded && "opacity-60",
			)}
			style={
				trackColor
					? { backgroundColor: hexToRgba(trackColor, 0.6) }
					: undefined
			}
			onClick={onSelect}
		>
			<div className="flex items-center justify-between gap-2">
				<div className="flex-1 min-w-0">
					<h3 className="text-xs font-medium truncate">
						{displayTitle}
					</h3>
					{metadata.tags.length > 0 && (
						<div className="flex flex-wrap gap-0.5 mt-0.5">
							{metadata.tags.slice(0, 3).map((tag) => (
								<span
									key={tag}
									className="text-[10px] leading-tight px-1 py-px rounded bg-muted text-muted-foreground"
								>
									{tag}
								</span>
							))}
							{metadata.tags.length > 3 && (
								<span className="text-[10px] text-muted-foreground">
									+{metadata.tags.length - 3}
								</span>
							)}
						</div>
					)}
				</div>
				{onToggleIncluded && arrangement && (
					<div
						className="flex items-center gap-2 shrink-0"
						onClick={(e) => e.stopPropagation()}
					>
						<Switch
							checked={isIncluded}
							onCheckedChange={(checked) =>
								onToggleIncluded(filePath, checked)
							}
						/>
					</div>
				)}
			</div>
		</Card>
	);
}
