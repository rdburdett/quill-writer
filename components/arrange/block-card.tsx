"use client";

import { useRef, useEffect } from "react";
import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { getBlockDisplayTitle, type BlockDragData } from "./types";
import type { BlockMetadata } from "@/lib/project/types";

// =============================================================================
// Block Card Component
// =============================================================================

interface BlockCardProps {
	filePath: string;
	metadata: BlockMetadata;
	isSelected: boolean;
	onSelect: () => void;
	onDrop: (
		filePath: string,
		targetTrackIndex: number,
		targetSlot: number,
		sourceTrackIndex?: number,
		sourceSlot?: number
	) => void;
	onToggleIncluded?: (filePath: string, included: boolean) => void;
}

export function BlockCard({
	filePath,
	metadata,
	isSelected,
	onSelect,
	onDrop,
	onToggleIncluded,
}: BlockCardProps) {
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
				"cursor-grab active:cursor-grabbing p-3 transition-all",
				"hover:shadow-md",
				isSelected && "ring-2 ring-primary",
				!isIncluded && "opacity-60"
			)}
			onClick={onSelect}
		>
			<div className="flex items-start justify-between gap-2">
				<div className="flex-1 min-w-0">
					<h3 className="text-sm font-medium truncate">{displayTitle}</h3>
					{metadata.tags.length > 0 && (
						<div className="flex flex-wrap gap-1 mt-1">
							{metadata.tags.slice(0, 3).map((tag) => (
								<span
									key={tag}
									className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
								>
									{tag}
								</span>
							))}
							{metadata.tags.length > 3 && (
								<span className="text-xs text-muted-foreground">
									+{metadata.tags.length - 3}
								</span>
							)}
						</div>
					)}
				</div>
				{onToggleIncluded && arrangement && (
					<div className="flex items-center gap-2 shrink-0">
						<Switch
							checked={isIncluded}
							onCheckedChange={(checked) => onToggleIncluded(filePath, checked)}
							onClick={(e) => e.stopPropagation()}
						/>
					</div>
				)}
			</div>
		</Card>
	);
}
