"use client";

import { useRef, useEffect, useState } from "react";
import { draggable, dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// Draggable Panel Header Component
// =============================================================================

export interface PanelDragData {
	type: "panel";
	panelId: string;
}

interface DraggablePanelHeaderProps {
	panelId: string;
	title: string;
	children?: React.ReactNode;
	className?: string;
}

export function DraggablePanelHeader({
	panelId,
	title,
	children,
	className,
}: DraggablePanelHeaderProps) {
	const headerRef = useRef<HTMLDivElement>(null);
	const [isDragging, setIsDragging] = useState(false);

	// Set up drag source
	useEffect(() => {
		const element = headerRef.current;
		if (!element) return;

		return draggable({
			element,
			getInitialData: () => {
				const dragData: PanelDragData = {
					type: "panel",
					panelId,
				};
				return dragData;
			},
			onDragStart: () => {
				setIsDragging(true);
			},
			onDrop: () => {
				setIsDragging(false);
			},
		});
	}, [panelId]);

	return (
		<div
			ref={headerRef}
			className={cn(
				"flex items-center gap-2 cursor-grab active:cursor-grabbing",
				isDragging && "opacity-50",
				className
			)}
		>
			<GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
			<h2 className="text-sm font-semibold flex-1">{title}</h2>
			{children}
		</div>
	);
}
