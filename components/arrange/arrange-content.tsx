"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useProjectContext } from "@/components/project-provider";
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
// Arrange Content Component
// =============================================================================

interface ArrangeContentProps {
	/** Register a file select handler (called when a file is clicked in sidebar) */
	onRegisterFileSelect: (handler: (path: string) => void) => void;
}

export function ArrangeContent({ onRegisterFileSelect }: ArrangeContentProps) {
	const { project, folderTree } = useProjectContext();
	const [selectedBlockPath, setSelectedBlockPath] = useState<string | null>(null);

	// =========================================================================
	// File select handler (selects block for inspector)
	// =========================================================================

	const handleFileSelect = useCallback((path: string) => {
		folderTree.select(path);
		setSelectedBlockPath(path);
	}, [folderTree]);

	// Register the handler with the shell
	useEffect(() => {
		onRegisterFileSelect(handleFileSelect);
	}, [handleFileSelect, onRegisterFileSelect]);

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
		<div className="flex h-full flex-col overflow-hidden">
			{/* Arrange Panels with resize handles between them */}
			<div className="flex flex-1 overflow-hidden">
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
