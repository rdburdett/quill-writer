"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { draggable, dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEditorSettingsContext } from "@/components/theme-provider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { GridCell } from "./grid-cell";
import { DraggablePanelHeader } from "./draggable-panel-header";
import type { TrackDragData } from "./types";
import type { ArrangementTrack, ArrangementScene, BlockMetadata } from "@/lib/project/types";

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_TRACK_WIDTH = 200;
const MIN_TRACK_WIDTH = 100;
const MAX_TRACK_WIDTH = 600;

const DEFAULT_SCENE_WIDTH = 120;
const MIN_SCENE_WIDTH = 80;
const MAX_SCENE_WIDTH = 300;

/** Preset colors for track/scene color picker (hex) */
const COLOR_PALETTE = [
	"#94a3b8", // slate-400
	"#64748b", // slate-500
	"#f87171", // red-400
	"#fb923c", // orange-400
	"#fbbf24", // amber-400
	"#4ade80", // green-400
	"#22d3ee", // cyan-400
	"#60a5fa", // blue-400
	"#a78bfa", // violet-400
	"#f472b6", // pink-400
] as const;

// =============================================================================
// Arrangement Grid Component
// =============================================================================

interface ArrangementGridProps {
	tracks: ArrangementTrack[];
	scenes: ArrangementScene[];
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
	onTrackRename: (trackId: string, newName: string) => void;
	onTrackColorChange?: (trackId: string, color: string | undefined) => void;
	onSceneRename?: (sceneId: string, newName: string) => void;
	onSceneColorChange?: (sceneId: string, color: string | undefined) => void;
	onTrackReorder?: (sourceTrackId: string, targetIndex: number) => void;
	onAddScene?: () => void;
	onAddTrack?: () => void;
	onDeleteTrack?: (trackId: string) => void;
	onDeleteScene?: (sceneId: string) => void;
	/** Double-click on empty cell: create new block in that cell and open in editor */
	onCreateBlockInCell?: (trackIndex: number, sceneIndex: number) => void;
}

export function ArrangementGrid({
	tracks,
	scenes,
	blocks,
	selectedBlockPath,
	onBlockSelect,
	onBlockDrop,
	onTrackRename,
	onTrackColorChange,
	onSceneRename,
	onSceneColorChange,
	onTrackReorder,
	onAddScene,
	onAddTrack,
	onDeleteTrack,
	onDeleteScene,
	onCreateBlockInCell,
}: ArrangementGridProps) {
	const { showBorders } = useEditorSettingsContext();

	// =========================================================================
	// Track column widths (persisted to localStorage)
	// =========================================================================

	const [trackWidths, setTrackWidths] = useState<Record<string, number>>(() => {
		if (typeof window === "undefined") return {};
		const stored = window.localStorage.getItem("quill.arrange.trackWidths");
		if (!stored) return {};
		return JSON.parse(stored) as Record<string, number>;
	});

	useEffect(() => {
		if (typeof window !== "undefined") {
			window.localStorage.setItem("quill.arrange.trackWidths", JSON.stringify(trackWidths));
		}
	}, [trackWidths]);

	const [sceneWidth, setSceneWidth] = useState(() => {
		if (typeof window === "undefined") return DEFAULT_SCENE_WIDTH;
		const stored = window.localStorage.getItem("quill.arrange.sceneWidth");
		if (!stored) return DEFAULT_SCENE_WIDTH;
		const n = Number.parseInt(stored, 10);
		return Number.isNaN(n) ? DEFAULT_SCENE_WIDTH : Math.max(MIN_SCENE_WIDTH, Math.min(MAX_SCENE_WIDTH, n));
	});

	useEffect(() => {
		if (typeof window !== "undefined") {
			window.localStorage.setItem("quill.arrange.sceneWidth", String(sceneWidth));
		}
	}, [sceneWidth]);

	const getTrackWidth = (trackId: string) =>
		trackWidths[trackId] ?? DEFAULT_TRACK_WIDTH;

	// =========================================================================
	// Track resize
	// =========================================================================

	const resizeRef = useRef<{ trackId: string; startWidth: number; startX: number } | null>(null);
	const [isResizing, setIsResizing] = useState(false);

	const handleTrackResizeStart = useCallback((trackId: string, startX: number) => {
		resizeRef.current = {
			trackId,
			startWidth: trackWidths[trackId] ?? DEFAULT_TRACK_WIDTH,
			startX,
		};
		setIsResizing(true);
	}, [trackWidths]);

	useEffect(() => {
		if (!isResizing) return;

		const handleMouseMove = (e: MouseEvent) => {
			const state = resizeRef.current;
			if (!state) return;
			e.preventDefault();
			const delta = e.clientX - state.startX;
			const newWidth = Math.max(
				MIN_TRACK_WIDTH,
				Math.min(MAX_TRACK_WIDTH, state.startWidth + delta)
			);
			setTrackWidths((prev) => ({ ...prev, [state.trackId]: newWidth }));
		};

		const handleMouseUp = () => {
			resizeRef.current = null;
			setIsResizing(false);
		};

		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);
		document.body.style.userSelect = "none";
		document.body.style.cursor = "col-resize";

		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
			document.body.style.userSelect = "";
			document.body.style.cursor = "";
		};
	}, [isResizing]);

	// =========================================================================
	// Scene column resize
	// =========================================================================

	const sceneResizeRef = useRef<{ startWidth: number; startX: number } | null>(null);
	const [isResizingScene, setIsResizingScene] = useState(false);

	const handleSceneResizeStart = useCallback((startX: number) => {
		sceneResizeRef.current = {
			startWidth: sceneWidth,
			startX,
		};
		setIsResizingScene(true);
	}, [sceneWidth]);

	useEffect(() => {
		if (!isResizingScene) return;

		const handleMouseMove = (e: MouseEvent) => {
			const state = sceneResizeRef.current;
			if (!state) return;
			e.preventDefault();
			const delta = e.clientX - state.startX;
			const newWidth = Math.max(
				MIN_SCENE_WIDTH,
				Math.min(MAX_SCENE_WIDTH, state.startWidth + delta)
			);
			setSceneWidth(newWidth);
		};

		const handleMouseUp = () => {
			sceneResizeRef.current = null;
			setIsResizingScene(false);
		};

		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);
		document.body.style.userSelect = "none";
		document.body.style.cursor = "col-resize";

		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
			document.body.style.userSelect = "";
			document.body.style.cursor = "";
		};
	}, [isResizingScene]);

	// =========================================================================
	// Grid layout
	// =========================================================================

	if (tracks.length === 0) return null;

	const hasDropZones = onTrackReorder != null;

	// Column indices (1-based for CSS grid)
	// Layout: scene | sceneBorder(4px) | [border | track] × N | border | add | 1fr
	const trackCol = (i: number) => (hasDropZones ? 4 + i * 2 : 3 + i);
	const borderCol = (i: number) => (hasDropZones ? 3 + i * 2 : 0);
	const addCol = hasDropZones ? 4 + tracks.length * 2 : 3 + tracks.length;
	const sceneBorderCol = 2;

	const trackColDefs = tracks
		.map((track) => {
			const w = getTrackWidth(track.id);
			return hasDropZones ? `4px ${w}px` : `${w}px`;
		})
		.join(" ");

	const gridTemplateColumns = hasDropZones
		? `${sceneWidth}px 4px ${trackColDefs} 4px${onAddTrack ? " 36px" : ""} 1fr`
		: `${sceneWidth}px 4px ${trackColDefs}${onAddTrack ? " 36px" : ""} 1fr`;

	return (
		<div className="flex h-full flex-col">
			{/* Grid container */}
			<div
				className="flex-1 overflow-auto"
				style={{
					display: "grid",
					gridTemplateColumns,
					gridAutoRows: "min-content",
				}}
			>
				{/* Corner cell: Arranger panel header (draggable) */}
				<div
					className={cn(
						"sticky left-0 top-0 z-10 flex shrink-0 items-center bg-background px-2 py-1.5",
						showBorders && "border-b border-r border-border"
					)}
				>
					<DraggablePanelHeader panelId="tracks" title="Arranger" />
				</div>

				{/* Scene border (resize handle between scene column and first track) */}
				<SceneBorder
					onResizeStart={handleSceneResizeStart}
					isResizing={isResizingScene}
					gridColumn={sceneBorderCol}
				/>

				{/* Track borders (reorder drop + resize) and headers */}
				{hasDropZones
					? tracks.flatMap((track, trackIndex) => [
							<TrackBorder
								key={`border-${trackIndex}`}
								targetIndex={trackIndex}
								onReorder={onTrackReorder}
								trackIdLeft={trackIndex > 0 ? tracks[trackIndex - 1].id : undefined}
								onResizeStart={handleTrackResizeStart}
								isResizing={isResizing}
								gridColumn={borderCol(trackIndex)}
							/>,
							<TrackHeaderCell
								key={track.id}
								track={track}
								trackIndex={trackIndex}
								onRename={onTrackRename}
								onColorChange={onTrackColorChange}
								onTrackReorder={onTrackReorder}
								onDeleteTrack={onDeleteTrack}
								gridColumn={trackCol(trackIndex)}
								showBorders={showBorders}
							/>,
						])
					: tracks.map((track, trackIndex) => (
							<TrackHeaderCell
								key={track.id}
								track={track}
								trackIndex={trackIndex}
								onRename={onTrackRename}
								onColorChange={onTrackColorChange}
								onTrackReorder={onTrackReorder}
								onDeleteTrack={onDeleteTrack}
								gridColumn={trackCol(trackIndex)}
								showBorders={showBorders}
							/>
						))}

				{/* Border after last track */}
				{hasDropZones && (
					<TrackBorder
						targetIndex={tracks.length}
						onReorder={onTrackReorder}
						trackIdLeft={tracks.length > 0 ? tracks[tracks.length - 1].id : undefined}
						onResizeStart={handleTrackResizeStart}
						isResizing={isResizing}
						gridColumn={borderCol(tracks.length)}
					/>
				)}

				{/* Add Track button */}
				{onAddTrack && (
					<AddTrackCell
						onAddTrack={onAddTrack}
						onTrackReorder={onTrackReorder}
						trackCount={tracks.length}
						gridColumn={addCol}
						showBorders={showBorders}
					/>
				)}

				{/* Scene rows */}
				{scenes.map((scene, sceneIndex) => (
					<React.Fragment key={scene.id}>
						{/* Scene label */}
						<SceneLabel
							scene={scene}
							sceneIndex={sceneIndex}
							scenesCount={scenes.length}
							onRename={onSceneRename}
							onColorChange={onSceneColorChange}
							onDeleteScene={onDeleteScene}
							showBorders={showBorders}
						/>

						{/* Cells for each track */}
						{tracks.map((track, trackIndex) => (
							<div
								key={`${track.id}-${scene.id}`}
								className="border-b border-border"
								style={{
									gridColumn: trackCol(trackIndex),
									gridRow: sceneIndex + 2,
								}}
							>
								<GridCell
									trackIndex={trackIndex}
									sceneIndex={sceneIndex}
									trackColor={track.color}
									blocks={blocks}
									selectedBlockPath={selectedBlockPath}
									onBlockSelect={onBlockSelect}
									onBlockDrop={onBlockDrop}
									onCellDoubleClick={onCreateBlockInCell}
								/>
							</div>
						))}
					</React.Fragment>
				))}

				{/* Add Scene row (below all scenes) */}
				{onAddScene && (
					<Button
						variant="subtle"
						size="zone"
						className="sticky left-0 flex w-full items-center justify-center rounded-none opacity-70 hover:opacity-100 hover:bg-transparent"
						style={{
							gridColumn: 1,
							gridRow: scenes.length + 2,
						}}
						onClick={onAddScene}
						title="Add scene"
						aria-label="Add scene"
					>
						<Plus className="h-3.5 w-3.5" />
					</Button>
				)}
			</div>
		</div>
	);
}

// =============================================================================
// Scene Border (resize handle for scene column width)
// =============================================================================

function SceneBorder({
	onResizeStart,
	isResizing,
	gridColumn,
}: {
	onResizeStart: (startX: number) => void;
	isResizing: boolean;
	gridColumn: number;
}) {
	const handleMouseDown = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		onResizeStart(e.clientX);
	};

	return (
		<div
			onMouseDown={handleMouseDown}
			className={cn(
				"relative flex shrink-0 items-stretch justify-center transition-colors cursor-col-resize hover:bg-muted-foreground/15",
				isResizing && "bg-muted-foreground/25"
			)}
			style={{ gridColumn, gridRow: "1 / -1" }}
		/>
	);
}

// =============================================================================
// Track Border (combined resize handle + reorder drop zone)
// =============================================================================

function TrackBorder({
	targetIndex,
	onReorder,
	trackIdLeft,
	onResizeStart,
	isResizing,
	gridColumn,
}: {
	targetIndex: number;
	onReorder: (sourceTrackId: string, targetIndex: number) => void;
	trackIdLeft?: string;
	onResizeStart: (trackId: string, startX: number) => void;
	isResizing: boolean;
	gridColumn: number;
}) {
	const zoneRef = useRef<HTMLDivElement>(null);
	const [isDragOver, setIsDragOver] = useState(false);

	useEffect(() => {
		const element = zoneRef.current;
		if (!element) return;

		return dropTargetForElements({
			element,
			canDrop: ({ source }) => source.data.type === "arrange-track",
			onDragEnter: () => setIsDragOver(true),
			onDragLeave: () => setIsDragOver(false),
			onDrop: ({ source }) => {
				setIsDragOver(false);
				const data = source.data as unknown as TrackDragData;
				onReorder(data.trackId, targetIndex);
			},
		});
	}, [targetIndex, onReorder]);

	const handleMouseDown = (e: React.MouseEvent) => {
		if (!trackIdLeft) return;
		e.preventDefault();
		e.stopPropagation();
		onResizeStart(trackIdLeft, e.clientX);
	};

	return (
		<div
			ref={zoneRef}
			onMouseDown={handleMouseDown}
			className={cn(
				"relative flex shrink-0 items-stretch justify-center transition-colors",
				trackIdLeft ? "cursor-col-resize hover:bg-muted-foreground/15" : "cursor-default",
				isResizing && trackIdLeft && "bg-muted-foreground/25",
				isDragOver && "bg-primary/5"
			)}
			style={{ gridColumn, gridRow: "1 / -1" }}
		>
			{isDragOver && (
				<div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-primary" />
			)}
		</div>
	);
}

// =============================================================================
// Color Dot (click opens color picker popover)
// =============================================================================

function ColorDot({
	id,
	color,
	onColorChange,
}: {
	id: string;
	color?: string;
	onColorChange?: (id: string, color: string | undefined) => void;
}) {
	if (!onColorChange) {
		return (
			<div
				className="h-3 w-3 shrink-0 rounded-full border border-border/50 bg-muted-foreground/40"
				style={color ? { backgroundColor: color } : undefined}
			/>
		);
	}

	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					className={cn(
						"h-3 w-3 shrink-0 rounded-full border border-border/50 hover:ring-2 hover:ring-ring hover:ring-offset-1",
						!color && "bg-muted-foreground/40"
					)}
					style={color ? { backgroundColor: color } : undefined}
					onClick={(e) => e.stopPropagation()}
					title="Change color"
					aria-label="Change color"
				/>
			</PopoverTrigger>
			<PopoverContent
				className="w-auto p-2"
				align="start"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="grid grid-cols-5 gap-1">
					{COLOR_PALETTE.map((hex) => (
						<button
							key={hex}
							type="button"
							className="h-6 w-6 rounded border border-border hover:ring-2 hover:ring-ring"
							style={{ backgroundColor: hex }}
							onClick={() => {
								onColorChange(id, hex);
							}}
							aria-label={`Color ${hex}`}
						/>
					))}
					<button
						type="button"
						className="h-6 w-6 rounded border border-border bg-muted-foreground/40 hover:ring-2 hover:ring-ring"
						onClick={() => onColorChange(id, undefined)}
						title="Clear color"
						aria-label="Clear color"
					/>
				</div>
			</PopoverContent>
		</Popover>
	);
}

// =============================================================================
// Item Header (shared: color dot + name + pencil, inline rename)
// =============================================================================

function ItemHeader({
	id,
	name,
	color,
	nameColor,
	onRename,
	onColorChange,
}: {
	id: string;
	name: string;
	color?: string;
	/** When set (e.g. track/scene color), the label text uses this color */
	nameColor?: string;
	onRename?: (id: string, newName: string) => void;
	onColorChange?: (id: string, color: string | undefined) => void;
}) {
	const [isRenaming, setIsRenaming] = useState(false);
	const [editName, setEditName] = useState(name);

	const handleSubmit = () => {
		if (editName.trim() && editName.trim() !== name) {
			onRename?.(id, editName.trim());
		}
		setIsRenaming(false);
	};

	const handleCancel = () => {
		setEditName(name);
		setIsRenaming(false);
	};

	if (isRenaming) {
		return (
			<div className="flex min-w-0 flex-1 items-center gap-1.5">
				<ColorDot id={id} color={color} onColorChange={onColorChange} />
				<input
					type="text"
					value={editName}
					onChange={(e) => setEditName(e.target.value)}
					onBlur={handleSubmit}
					onKeyDown={(e) => {
						if (e.key === "Enter") handleSubmit();
						else if (e.key === "Escape") handleCancel();
					}}
					className="min-w-0 flex-1 px-1.5 py-0.5 text-xs font-medium rounded border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
					autoFocus
				/>
			</div>
		);
	}

	return (
		<div className="flex min-w-0 flex-1 items-center gap-1.5">
			<ColorDot id={id} color={color} onColorChange={onColorChange} />
			<span
				className={cn(
					"min-w-0 flex-1 truncate text-xs font-medium cursor-default",
					!nameColor && "text-muted-foreground"
				)}
				style={nameColor ? { color: nameColor } : undefined}
				onDoubleClick={() => {
					if (!onRename) return;
					setEditName(name);
					setIsRenaming(true);
				}}
			>
				{name}
			</span>
			{onRename && (
				<Button
					variant="ghost"
					size="icon-sm"
					className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100!"
					onClick={(e) => {
						e.stopPropagation();
						setEditName(name);
						setIsRenaming(true);
					}}
				>
					<Pencil className="h-3 w-3" />
				</Button>
			)}
		</div>
	);
}

// =============================================================================
// Track Header Cell (draggable for reorder)
// =============================================================================

function TrackHeaderCell({
	track,
	trackIndex,
	onRename,
	onColorChange,
	onTrackReorder,
	onDeleteTrack,
	gridColumn,
	showBorders,
}: {
	track: ArrangementTrack;
	trackIndex: number;
	onRename: (trackId: string, newName: string) => void;
	onColorChange?: (trackId: string, color: string | undefined) => void;
	onTrackReorder?: (sourceTrackId: string, targetIndex: number) => void;
	onDeleteTrack?: (trackId: string) => void;
	gridColumn: number;
	showBorders: boolean;
}) {
	const cellRef = useRef<HTMLDivElement>(null);
	const [isDragging, setIsDragging] = useState(false);

	useEffect(() => {
		const element = cellRef.current;
		if (!element || !onTrackReorder) return;

		return draggable({
			element,
			getInitialData: () =>
				({
					type: "arrange-track",
					trackId: track.id,
					trackIndex,
				}) satisfies TrackDragData,
			onDragStart: () => setIsDragging(true),
			onDrop: () => setIsDragging(false),
		});
	}, [track.id, trackIndex, onTrackReorder]);

	return (
		<div
			ref={cellRef}
			className={cn(
				"group sticky top-0 z-10 flex items-center gap-1.5 border-b border-border bg-muted/30 px-2 py-1.5",
				onTrackReorder && "cursor-grab active:cursor-grabbing",
				showBorders && "border-border",
				isDragging && "opacity-50"
			)}
			style={{ gridColumn, gridRow: 1 }}
		>
			<ItemHeader
				id={track.id}
				name={track.name}
				color={track.color}
				nameColor={track.color}
				onRename={onRename}
				onColorChange={onColorChange}
			/>
			{onDeleteTrack && (
				<Button
					variant="ghost"
					size="icon-sm"
					className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100!"
					onClick={(e) => {
						e.stopPropagation();
						onDeleteTrack(track.id);
					}}
					title="Delete track"
					aria-label="Delete track"
				>
					<Trash2 className="h-3 w-3" />
				</Button>
			)}
		</div>
	);
}

// =============================================================================
// Add Track Cell (button + drop target for insert at end)
// =============================================================================

function AddTrackCell({
	onAddTrack,
	onTrackReorder,
	trackCount,
	gridColumn,
	showBorders,
}: {
	onAddTrack: () => void;
	onTrackReorder?: (sourceTrackId: string, targetIndex: number) => void;
	trackCount: number;
	gridColumn: number;
	showBorders: boolean;
}) {
	const cellRef = useRef<HTMLDivElement>(null);
	const [isDragOver, setIsDragOver] = useState(false);

	useEffect(() => {
		const element = cellRef.current;
		if (!element || !onTrackReorder) return;

		return dropTargetForElements({
			element,
			canDrop: ({ source }) => source.data.type === "arrange-track",
			onDragEnter: () => setIsDragOver(true),
			onDragLeave: () => setIsDragOver(false),
			onDrop: ({ source }) => {
				setIsDragOver(false);
				const data = source.data as unknown as TrackDragData;
				onTrackReorder(data.trackId, trackCount);
			},
		});
	}, [trackCount, onTrackReorder]);

	return (
		<div
			ref={cellRef}
			className={cn(
				"sticky top-0 z-10 flex shrink-0 items-center justify-center border-b border-border",
				showBorders && "border-border",
				isDragOver && "bg-primary/20"
			)}
			style={{ gridColumn, gridRow: 1 }}
		>
			<Button
				variant="subtle"
				size="zone"
				className="rounded-none opacity-70 hover:opacity-100 hover:bg-transparent"
				onClick={onAddTrack}
				title="Add track"
				aria-label="Add track"
			>
				<Plus className="h-3.5 w-3.5" />
			</Button>
		</div>
	);
}

// =============================================================================
// Scene Label (uses ItemHeader for unified design)
// =============================================================================

function SceneLabel({
	scene,
	sceneIndex,
	scenesCount,
	onRename,
	onColorChange,
	onDeleteScene,
	showBorders,
}: {
	scene: ArrangementScene;
	sceneIndex: number;
	scenesCount: number;
	onRename?: (sceneId: string, newName: string) => void;
	onColorChange?: (sceneId: string, color: string | undefined) => void;
	onDeleteScene?: (sceneId: string) => void;
	showBorders: boolean;
}) {
	const canDelete = scenesCount > 1 && onDeleteScene;

	return (
		<div
			className={cn(
				"group sticky left-0 z-5 flex items-center border-b border-border bg-background px-2 py-1.5",
				showBorders && "border-r border-border"
			)}
			style={{
				gridColumn: 1,
				gridRow: sceneIndex + 2,
			}}
		>
			<ItemHeader
				id={scene.id}
				name={scene.name}
				color={scene.color}
				nameColor={scene.color}
				onRename={onRename}
				onColorChange={onColorChange}
			/>
			{canDelete && (
				<Button
					variant="ghost"
					size="icon-sm"
					className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100!"
					onClick={(e) => {
						e.stopPropagation();
						onDeleteScene(scene.id);
					}}
					title="Delete scene"
					aria-label="Delete scene"
				>
					<Trash2 className="h-3 w-3" />
				</Button>
			)}
		</div>
	);
}
