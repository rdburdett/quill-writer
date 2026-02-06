"use client";

import { useRef, useEffect, useState } from "react";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { cn } from "@/lib/utils";
import type { PanelDragData } from "./draggable-panel-header";

// =============================================================================
// Panel Border Component (combined resize handle + panel reorder drop zone)
// =============================================================================

interface PanelBorderProps {
	/** Whether this border supports drag-to-resize */
	resizable?: boolean;
	/** Called when a resize drag starts */
	onResizeStart?: () => void;
	/** Called on each mouse move with deltaX from drag start */
	onResize?: (deltaX: number) => void;
	/** Called when a resize drag ends */
	onResizeEnd?: () => void;
	/** Index to insert a panel at when dropped here */
	insertIndex: number;
	/** Called when a panel header is dropped on this border */
	onPanelDrop: (sourcePanelId: string, insertIndex: number) => void;
}

export function PanelBorder({
	resizable = false,
	onResizeStart,
	onResize,
	onResizeEnd,
	insertIndex,
	onPanelDrop,
}: PanelBorderProps) {
	const borderRef = useRef<HTMLDivElement>(null);
	const [isDragOver, setIsDragOver] = useState(false);
	const [isResizing, setIsResizing] = useState(false);
	const startXRef = useRef(0);

	// Resize via native mouse events
	const handleMouseDown = (e: React.MouseEvent) => {
		if (!resizable) return;
		e.preventDefault();
		e.stopPropagation();
		startXRef.current = e.clientX;
		setIsResizing(true);
		onResizeStart?.();
	};

	useEffect(() => {
		if (!isResizing) return;

		const handleMouseMove = (e: MouseEvent) => {
			e.preventDefault();
			const deltaX = e.clientX - startXRef.current;
			onResize?.(deltaX);
		};

		const handleMouseUp = () => {
			setIsResizing(false);
			onResizeEnd?.();
		};

		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);

		// Prevent text selection and lock cursor during resize
		document.body.style.userSelect = "none";
		document.body.style.cursor = "col-resize";

		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
			document.body.style.userSelect = "";
			document.body.style.cursor = "";
		};
	}, [isResizing, onResize, onResizeEnd]);

	// Drop zone for panel reordering (Pragmatic DnD)
	useEffect(() => {
		const element = borderRef.current;
		if (!element) return;

		return dropTargetForElements({
			element,
			canDrop: ({ source }) => source.data.type === "panel",
			onDragEnter: () => setIsDragOver(true),
			onDragLeave: () => setIsDragOver(false),
			onDrop: ({ source }) => {
				setIsDragOver(false);
				const dragData = source.data as unknown as PanelDragData;
				onPanelDrop(dragData.panelId, insertIndex);
			},
		});
	}, [insertIndex, onPanelDrop]);

	return (
		<div
			ref={borderRef}
			onMouseDown={handleMouseDown}
			className={cn(
				"shrink-0 relative z-40 transition-colors",
				resizable ? "w-1 cursor-col-resize" : "w-1",
				resizable && "hover:bg-border",
				isResizing && "bg-primary/30",
				isDragOver && "w-2 bg-primary/10 rounded"
			)}
			style={resizable ? { userSelect: "none" } : undefined}
		>
			{isDragOver && (
				<div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-primary rounded-full" />
			)}
		</div>
	);
}
