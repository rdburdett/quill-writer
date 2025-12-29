"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditorSettingsContext } from "@/components/theme-provider";
import { draggable, dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";

// =============================================================================
// Types
// =============================================================================

export interface Tab {
	filePath: string;
	title: string;
}

export interface TabSystemProps {
	/** Array of open tabs */
	tabs: Tab[];
	/** Currently active tab file path */
	activeTabPath: string | null;
	/** Called when a tab is clicked */
	onTabClick: (filePath: string) => void;
	/** Called when a tab is closed */
	onTabClose: (filePath: string) => void;
	/** Called when tabs are reordered */
	onTabsReorder: (newOrder: string[]) => void;
	/** Called when text is dropped on a tab */
	onDropText?: (targetFilePath: string, dragData: TextDragData) => void;
	/** Children to render in the editor area */
	children: React.ReactNode;
}

export interface TextDragData {
	type: "text-block";
	content: string;
	sourcePath: string;
	selectionRange?: { from: number; to: number };
}

// =============================================================================
// Tab System Component
// =============================================================================

export function TabSystem({
	tabs,
	activeTabPath,
	onTabClick,
	onTabClose,
	onTabsReorder,
	onDropText,
	children,
}: TabSystemProps) {
	const { showBorders } = useEditorSettingsContext();
	const [draggedTabPath, setDraggedTabPath] = useState<string | null>(null);
	const [dragOverTabPath, setDragOverTabPath] = useState<string | null>(null);
	const [dragOverTabBar, setDragOverTabBar] = useState(false);

	return (
		<div className="flex h-full flex-col">
			{/* Tab Bar */}
			<div
				className={cn("flex bg-muted/30", showBorders && "border-b border-border")}
				onDragOver={(e) => {
					e.preventDefault();
					setDragOverTabBar(true);
				}}
				onDragLeave={() => {
					setDragOverTabBar(false);
				}}
				onDrop={async (e) => {
					e.preventDefault();
					setDragOverTabBar(false);
					
					// Handle text drop on tab bar (create new tab)
					if (onDropText && e.dataTransfer) {
						try {
							const dragData = JSON.parse(e.dataTransfer.getData("application/x-quill-text")) as TextDragData;
							// For now, we'll need the file path from somewhere - this will be handled by parent
							// This is a placeholder for tab bar drops
						} catch {
							// Not a text drop, ignore
						}
					}
				}}
			>
				<div className="flex flex-1 overflow-x-auto">
					{tabs.map((tab, index) => (
						<TabItem
							key={tab.filePath}
							tab={tab}
							isActive={tab.filePath === activeTabPath}
							isDragging={draggedTabPath === tab.filePath}
							isDragOver={dragOverTabPath === tab.filePath}
							onClick={() => onTabClick(tab.filePath)}
							onClose={(e) => {
								e.stopPropagation();
								onTabClose(tab.filePath);
							}}
							onDragStart={() => setDraggedTabPath(tab.filePath)}
							onDragEnd={() => setDraggedTabPath(null)}
							onDragOver={() => setDragOverTabPath(tab.filePath)}
							onDragLeave={() => setDragOverTabPath(null)}
							onDrop={async (dragData) => {
								setDragOverTabPath(null);
								if (onDropText && dragData) {
									await onDropText(tab.filePath, dragData);
								}
							}}
							onReorder={(newIndex) => {
								const newOrder = [...tabs.map((t) => t.filePath)];
								const [removed] = newOrder.splice(index, 1);
								newOrder.splice(newIndex, 0, removed);
								onTabsReorder(newOrder);
							}}
						/>
					))}
				</div>
			</div>

			{/* Editor Area */}
			<div className="flex-1 overflow-auto">{children}</div>
		</div>
	);
}

// =============================================================================
// Tab Item Component
// =============================================================================

interface TabItemProps {
	tab: Tab;
	isActive: boolean;
	isDragging: boolean;
	isDragOver: boolean;
	onClick: () => void;
	onClose: (e: React.MouseEvent) => void;
	onDragStart: () => void;
	onDragEnd: () => void;
	onDragOver: () => void;
	onDragLeave: () => void;
	onDrop: (dragData: TextDragData | null) => void;
	onReorder: (newIndex: number) => void;
}

function TabItem({
	tab,
	isActive,
	isDragging,
	isDragOver,
	onClick,
	onClose,
	onDragStart,
	onDragEnd,
	onDragOver,
	onDragLeave,
	onDrop,
	onReorder,
}: TabItemProps) {
	const { showBorders } = useEditorSettingsContext();
	const tabRef = useRef<HTMLDivElement>(null);
	const [isDraggedOver, setIsDraggedOver] = useState(false);

	// Set up drag source for tab reordering
	useEffect(() => {
		const element = tabRef.current;
		if (!element) return;

		return draggable({
			element,
			getInitialData: () => ({
				type: "tab",
				filePath: tab.filePath,
			}),
			onDragStart: () => {
				onDragStart();
			},
			onDrop: () => {
				onDragEnd();
			},
		});
	}, [tab.filePath, onDragStart, onDragEnd]);

	// Set up drop target for tab reordering and text drops
	useEffect(() => {
		const element = tabRef.current;
		if (!element) return;

		let hoverTimeout: ReturnType<typeof setTimeout> | null = null;

		return dropTargetForElements({
			element,
			getData: ({ source }) => {
				// Check if it's a tab being dragged
				if (source.data.type === "tab") {
					return { type: "tab", filePath: source.data.filePath as string } as unknown as Record<string, unknown>;
				}
				// Check if it's text being dragged
				if (source.data.type === "text-block") {
					return source.data as unknown as Record<string, unknown>;
				}
				return {};
			},
			canDrop: ({ source }) => {
				// Allow tab drops (for reordering) and text drops
				return source.data.type === "tab" || source.data.type === "text-block";
			},
			onDragEnter: ({ source }) => {
				console.log("[TabSystem] Drag enter on tab:", tab.filePath, "Source:", source.data);
				setIsDraggedOver(true);
				onDragOver();
				// Switch to tab when dragging text over it (with delay to avoid flickering)
				if (source.data.type === "text-block") {
					hoverTimeout = setTimeout(() => {
						console.log("[TabSystem] Switching to tab:", tab.filePath);
						onClick(); // Switch to this tab
					}, 200); // 200ms delay
				}
			},
			onDragLeave: () => {
				setIsDraggedOver(false);
				onDragLeave();
				if (hoverTimeout) {
					clearTimeout(hoverTimeout);
					hoverTimeout = null;
				}
			},
			onDrop: ({ source }) => {
				setIsDraggedOver(false);
				onDragLeave();
				if (hoverTimeout) {
					clearTimeout(hoverTimeout);
					hoverTimeout = null;
				}

				// Handle tab reordering - calculate new index based on drop position
				if (source.data.type === "tab") {
					// The parent will handle reordering based on the tab index
					// We pass the current tab's index as the target
					const draggedFilePath = source.data.filePath as string;
					// Find current tab index - this will be passed from parent
					// For now, we'll let the parent handle it via onReorder callback
				}

				// Handle text drop
				if (source.data.type === "text-block") {
					const dragData = source.data as unknown as TextDragData;
					onDrop(dragData);
				} else {
					onDrop(null);
				}
			},
		});
	}, [tab.filePath, onDragOver, onDragLeave, onDrop, onClick]);

	return (
		<div
			ref={tabRef}
			className={cn(
				"group flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors",
				showBorders && "border-r border-border",
				"hover:bg-accent/50",
				isActive && "bg-background text-foreground",
				!isActive && "text-foreground/80",
				isDragging && "opacity-50",
				isDragOver && "bg-primary/20 border-l-4 border-l-primary shadow-sm ring-2 ring-primary/30"
			)}
			onClick={onClick}
		>
			<span className="truncate max-w-[200px]">{tab.title}</span>
			<button
				onClick={onClose}
				className={cn(
					"rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100",
					"hover:bg-background/50"
				)}
				title="Close tab"
			>
				<X className="h-3 w-3" />
			</button>
		</div>
	);
}

