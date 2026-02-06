"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { Feather, Settings, FolderOpen, FolderPlus, Save, XCircle, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProjectContext } from "@/components/project-provider";
import { useEditorSettingsContext } from "@/components/theme-provider";
import { FolderSidebar } from "@/components/folder-sidebar";
import { ViewToggle } from "@/components/view-toggle";
import { cn } from "@/lib/utils";
import type { ArrangementTrack } from "@/lib/project/types";
import { getUnassignedBlocks, getBlocksForTrack, normalizeTrackSlots } from "./types";
import { UnassignedPanel } from "./unassigned-panel";
import { TracksCanvas } from "./tracks-canvas";
import { InspectorPanel } from "./inspector-panel";
import { PanelBorder } from "./panel-border";

// =============================================================================
// Constants
// =============================================================================

const MIN_PANEL_WIDTH = 150;
const MAX_PANEL_WIDTH = 800;
const DEFAULT_WIDTHS: Record<string, number> = {
	unassigned: 256,
	inspector: 320,
};

// =============================================================================
// Panel Types
// =============================================================================

type PanelId = "unassigned" | "tracks" | "inspector";

// =============================================================================
// Arrange View Component
// =============================================================================

export function ArrangeView() {
	const { project, folderTree } = useProjectContext();
	const { showBorders } = useEditorSettingsContext();
	const [selectedBlockPath, setSelectedBlockPath] = useState<string | null>(null);

	// =========================================================================
	// Sidebar state (shared localStorage key with Write view)
	// =========================================================================

	const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
		if (typeof window === "undefined") return false;
		const stored = window.localStorage.getItem("sidebar.collapsed");
		return stored === "true";
	});

	useEffect(() => {
		if (typeof window !== "undefined") {
			window.localStorage.setItem("sidebar.collapsed", String(isSidebarCollapsed));
		}
	}, [isSidebarCollapsed]);

	const handleToggleSidebar = useCallback(() => {
		setIsSidebarCollapsed((prev) => !prev);
	}, []);

	// =========================================================================
	// Panel order (persisted to localStorage)
	// =========================================================================

	const [panelOrder, setPanelOrder] = useState<PanelId[]>(() => {
		if (typeof window === "undefined") return ["unassigned", "tracks", "inspector"];
		const stored = window.localStorage.getItem("quill.arrange.panelOrder");
		return stored ? JSON.parse(stored) : ["unassigned", "tracks", "inspector"];
	});

	useEffect(() => {
		if (typeof window !== "undefined") {
			window.localStorage.setItem("quill.arrange.panelOrder", JSON.stringify(panelOrder));
		}
	}, [panelOrder]);

	// =========================================================================
	// Panel widths (persisted to localStorage)
	// =========================================================================

	const [panelWidths, setPanelWidths] = useState<Record<string, number>>(() => {
		if (typeof window === "undefined") return DEFAULT_WIDTHS;
		const stored = window.localStorage.getItem("quill.arrange.panelWidths");
		return stored ? { ...DEFAULT_WIDTHS, ...JSON.parse(stored) } : DEFAULT_WIDTHS;
	});

	const panelWidthsRef = useRef(panelWidths);
	useEffect(() => { panelWidthsRef.current = panelWidths; }, [panelWidths]);

	useEffect(() => {
		if (typeof window !== "undefined") {
			window.localStorage.setItem("quill.arrange.panelWidths", JSON.stringify(panelWidths));
		}
	}, [panelWidths]);

	// =========================================================================
	// Resize state
	// =========================================================================

	const resizeStateRef = useRef<{ panelId: string; startWidth: number } | null>(null);

	const handleResizeStart = useCallback((leftPanel: PanelId, rightPanel: PanelId) => {
		const widths = panelWidthsRef.current;
		if (leftPanel !== "tracks") {
			resizeStateRef.current = { panelId: leftPanel, startWidth: widths[leftPanel] ?? DEFAULT_WIDTHS[leftPanel] ?? 256 };
		} else if (rightPanel !== "tracks") {
			resizeStateRef.current = { panelId: rightPanel, startWidth: widths[rightPanel] ?? DEFAULT_WIDTHS[rightPanel] ?? 256 };
		}
	}, []);

	const handleResize = useCallback((leftPanel: PanelId, rightPanel: PanelId, deltaX: number) => {
		if (!resizeStateRef.current) return;
		const { panelId, startWidth } = resizeStateRef.current;

		// If resizing the left panel: width increases with positive deltaX
		// If resizing the right panel (left is flex): width decreases with positive deltaX
		const isResizingLeft = panelId === leftPanel;
		const newWidth = isResizingLeft ? startWidth + deltaX : startWidth - deltaX;
		const clampedWidth = Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, newWidth));

		setPanelWidths((prev) => ({ ...prev, [panelId]: clampedWidth }));
	}, []);

	const handleResizeEnd = useCallback(() => {
		resizeStateRef.current = null;
	}, []);

	// =========================================================================
	// Project data
	// =========================================================================

	const sortedTracks = useMemo(() => {
		if (!project.project) return [];
		return [...project.project.arrangementTracks].sort((a, b) => a.order - b.order);
	}, [project.project]);

	const unassignedBlocks = useMemo(() => {
		if (!project.project) return [];
		return getUnassignedBlocks(project.project.blocks, sortedTracks);
	}, [project.project, sortedTracks]);

	// =========================================================================
	// Handlers
	// =========================================================================

	const handleFileSelect = useCallback((path: string) => {
		folderTree.select(path);
		setSelectedBlockPath(path);
	}, [folderTree]);

	const handleAddTrack = useCallback(() => {
		if (!project.project) return;
		const newTrack: ArrangementTrack = {
			id: crypto.randomUUID(),
			name: `Track ${sortedTracks.length + 1}`,
			order: sortedTracks.length,
		};
		project.updateProject({
			arrangementTracks: [...sortedTracks, newTrack],
		});
	}, [project, sortedTracks]);

	const handleBlockDrop = useCallback(
		(
			filePath: string,
			targetTrackIndex: number,
			targetSlot: number,
			sourceTrackIndex?: number,
			sourceSlot?: number
		) => {
			if (!project.project) return;

			const updatedBlocks = { ...project.project.blocks };
			const blockMetadata = updatedBlocks[filePath];
			if (!blockMetadata) return;

			if (sourceTrackIndex !== undefined && sourceSlot !== undefined) {
				const sourceBlocks = getBlocksForTrack(updatedBlocks, sourceTrackIndex);
				sourceBlocks.forEach(({ filePath: otherPath, metadata }) => {
					if (otherPath === filePath) return;
					const slot = metadata.arrangement?.slot ?? 0;
					if (slot > sourceSlot) {
						updatedBlocks[otherPath] = {
							...metadata,
							arrangement: { ...metadata.arrangement!, slot: slot - 1 },
						};
					}
				});
			}

			const targetBlocks = getBlocksForTrack(updatedBlocks, targetTrackIndex);
			targetBlocks.forEach(({ filePath: otherPath, metadata }) => {
				if (otherPath === filePath) return;
				const slot = metadata.arrangement?.slot ?? 0;
				if (slot >= targetSlot) {
					updatedBlocks[otherPath] = {
						...metadata,
						arrangement: { ...metadata.arrangement!, slot: slot + 1 },
					};
				}
			});

			updatedBlocks[filePath] = {
				...blockMetadata,
				arrangement: {
					track: targetTrackIndex,
					slot: targetSlot,
					included: blockMetadata.arrangement?.included ?? true,
				},
			};

			const normalizedBlocks = normalizeTrackSlots(updatedBlocks, targetTrackIndex);
			if (sourceTrackIndex !== undefined) {
				const finalBlocks = normalizeTrackSlots(normalizedBlocks, sourceTrackIndex);
				project.updateProject({ blocks: finalBlocks });
			} else {
				project.updateProject({ blocks: normalizedBlocks });
			}
		},
		[project]
	);

	const handleToggleIncluded = useCallback(
		(filePath: string, included: boolean) => {
			if (!project.project) return;
			const updatedBlocks = { ...project.project.blocks };
			const blockMetadata = updatedBlocks[filePath];
			if (!blockMetadata?.arrangement) return;
			updatedBlocks[filePath] = {
				...blockMetadata,
				arrangement: { ...blockMetadata.arrangement, included },
			};
			project.updateProject({ blocks: updatedBlocks });
		},
		[project]
	);

	const handleTrackRename = useCallback(
		(trackId: string, newName: string) => {
			if (!project.project) return;
			const updatedTracks = sortedTracks.map((track) =>
				track.id === trackId ? { ...track, name: newName } : track
			);
			project.updateProject({ arrangementTracks: updatedTracks });
		},
		[project, sortedTracks]
	);

	const handlePanelReorder = useCallback((sourcePanelId: string, insertIndex: number) => {
		setPanelOrder((currentOrder) => {
			const newOrder = [...currentOrder];
			const sourceIndex = newOrder.indexOf(sourcePanelId as PanelId);
			if (sourceIndex === -1) return currentOrder;
			newOrder.splice(sourceIndex, 1);
			const adjustedIndex = sourceIndex < insertIndex ? insertIndex - 1 : insertIndex;
			newOrder.splice(adjustedIndex, 0, sourcePanelId as PanelId);
			return newOrder;
		});
	}, []);

	// =========================================================================
	// Panel rendering helpers
	// =========================================================================

	const getPanelStyle = (panelId: PanelId): React.CSSProperties => {
		if (panelId === "tracks") return { flex: 1 };
		return { width: `${panelWidths[panelId] ?? DEFAULT_WIDTHS[panelId] ?? 256}px`, flexShrink: 0 };
	};

	const renderPanel = (panelId: PanelId) => {
		if (panelId === "unassigned") {
			return (
				<UnassignedPanel
					blocks={unassignedBlocks}
					onBlockSelect={setSelectedBlockPath}
					selectedBlockPath={selectedBlockPath}
					onBlockDrop={handleBlockDrop}
				/>
			);
		}
		if (panelId === "tracks") {
			return sortedTracks.length === 0 ? (
				<EmptyTracksState onAddTrack={handleAddTrack} />
			) : (
				<TracksCanvas
					tracks={sortedTracks}
					blocks={project.project?.blocks ?? {}}
					onBlockDrop={handleBlockDrop}
					onToggleIncluded={handleToggleIncluded}
					onBlockSelect={setSelectedBlockPath}
					selectedBlockPath={selectedBlockPath}
					onTrackRename={handleTrackRename}
				/>
			);
		}
		if (panelId === "inspector") {
			return (
				<InspectorPanel
					selectedBlockPath={selectedBlockPath}
					blocks={project.project?.blocks ?? {}}
				/>
			);
		}
		return null;
	};

	// =========================================================================
	// Render
	// =========================================================================

	return (
		<div className="flex h-screen flex-col">
			{/* Header Bar - matches Write view */}
			<div className={cn("flex items-center justify-between bg-muted/30 px-4 py-2", showBorders && "border-b border-border")}>
				<div className="flex items-center gap-4">
					{/* Sidebar Toggle Button */}
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8"
						onClick={handleToggleSidebar}
						title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
						aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
					>
						{isSidebarCollapsed ? (
							<PanelLeftOpen className="h-4 w-4" />
						) : (
							<PanelLeftClose className="h-4 w-4" />
						)}
					</Button>

					{/* View Toggle */}
					<ViewToggle />

					{/* Project Name & Status */}
					<div className="flex items-center gap-2">
						<span className="font-medium">{project.project?.name || "Quill"}</span>
						{project.hasUnsavedChanges && (
							<span className="h-2 w-2 rounded-full bg-amber-500" title="Unsaved changes" />
						)}
					</div>
				</div>

				{/* App Menu */}
				<AppMenu
					hasUnsavedChanges={project.hasUnsavedChanges}
					onSaveProject={project.saveProject}
					onOpenProject={project.openProject}
					onCreateNewProject={project.createNewProject}
					onCloseProject={project.closeProject}
				/>
			</div>

			{/* Content Area */}
			<div className="flex flex-1 overflow-hidden">
				{/* Folder Sidebar - same as Write view */}
				{!isSidebarCollapsed && (
					<div className="w-64 shrink-0 h-full">
						<FolderSidebar
							tree={folderTree.filteredTree}
							selectedPath={folderTree.selectedPath}
							expandedPaths={folderTree.expandedPaths}
							searchQuery={folderTree.searchQuery}
							onSelect={handleFileSelect}
							onToggleFolder={folderTree.toggleExpanded}
							onSearchChange={folderTree.setSearchQuery}
							onRefresh={project.refreshTree}
						/>
					</div>
				)}

				{/* Arrange Panels with resize handles between them */}
				{panelOrder.map((panelId, index) => {
					const isLast = index === panelOrder.length - 1;
					const nextPanelId = isLast ? null : panelOrder[index + 1];

					return (
						<React.Fragment key={panelId}>
							{/* Drop zone before first panel */}
							{index === 0 && (
								<PanelBorder
									insertIndex={0}
									onPanelDrop={handlePanelReorder}
								/>
							)}

							{/* Panel */}
							<div
								className={cn(
									"flex flex-col overflow-hidden",
									panelId === "tracks" && "overflow-auto"
								)}
								style={getPanelStyle(panelId)}
							>
								{renderPanel(panelId)}
							</div>

							{/* Border after panel (resize + drop zone), or trailing drop zone */}
							{nextPanelId ? (
								<PanelBorder
									resizable
									onResizeStart={() => handleResizeStart(panelId, nextPanelId)}
									onResize={(deltaX) => handleResize(panelId, nextPanelId, deltaX)}
									onResizeEnd={handleResizeEnd}
									insertIndex={index + 1}
									onPanelDrop={handlePanelReorder}
								/>
							) : (
								<PanelBorder
									insertIndex={panelOrder.length}
									onPanelDrop={handlePanelReorder}
								/>
							)}
						</React.Fragment>
					);
				})}
			</div>
		</div>
	);
}

// =============================================================================
// App Menu (matches Write view)
// =============================================================================

interface AppMenuProps {
	hasUnsavedChanges: boolean;
	onSaveProject: () => Promise<void>;
	onOpenProject: () => void;
	onCreateNewProject: () => void;
	onCloseProject: () => void;
}

function AppMenu({
	hasUnsavedChanges,
	onSaveProject,
	onOpenProject,
	onCreateNewProject,
	onCloseProject,
}: AppMenuProps) {
	const handleSave = useCallback(async () => {
		await onSaveProject();
	}, [onSaveProject]);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8 relative"
					aria-label="Open app menu"
				>
					<Feather className="h-4 w-4" />
					{hasUnsavedChanges && (
						<span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-500" />
					)}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuLabel>Project</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={handleSave} disabled={!hasUnsavedChanges}>
					<Save className="mr-2 h-4 w-4" />
					Save Project
				</DropdownMenuItem>
				<DropdownMenuItem onClick={onOpenProject}>
					<FolderOpen className="mr-2 h-4 w-4" />
					Open Project
				</DropdownMenuItem>
				<DropdownMenuItem onClick={onCreateNewProject}>
					<FolderPlus className="mr-2 h-4 w-4" />
					New Project
				</DropdownMenuItem>
				<DropdownMenuItem onClick={onCloseProject} variant="destructive">
					<XCircle className="mr-2 h-4 w-4" />
					Close Project
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuLabel>App</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<Link href="/settings">
					<DropdownMenuItem>
						<Settings className="mr-2 h-4 w-4" />
						Settings
					</DropdownMenuItem>
				</Link>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

// =============================================================================
// Empty Tracks State
// =============================================================================

function EmptyTracksState({ onAddTrack }: { onAddTrack: () => void }) {
	return (
		<div className="flex h-full items-center justify-center">
			<div className="text-center space-y-4">
				<h2 className="text-xl font-medium">No tracks yet</h2>
				<p className="text-muted-foreground">
					Create your first track to start arranging blocks
				</p>
				<Button onClick={onAddTrack}>
					Add First Track
				</Button>
			</div>
		</div>
	);
}
