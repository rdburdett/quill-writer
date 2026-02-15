"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useProjectContext } from "@/components/project-provider";
import { cn } from "@/lib/utils";
import type { ArrangementTrack, ArrangementScene } from "@/lib/project/types";
import { createBlock } from "@/lib/project/loader";
import { titleToFilename } from "@/lib/filesystem/scanner";
import { useArrangementContext } from "./arrangement-context";
import { ArrangementGrid } from "./arrangement-grid";
import { EditorPanel } from "./editor-panel";
import { PanelBorder } from "./panel-border";

// =============================================================================
// Constants
// =============================================================================

/** Minimum panel width in pixels (CSS floor) */
const MIN_PANEL_PX = 150;
/** Panel width bounds as percentage of content area */
const MIN_PANEL_PCT = 10;
const MAX_PANEL_PCT = 60;
/** Default panel widths as percentage of content area */
const DEFAULT_WIDTHS: Record<string, number> = {
	editor: 30,
};

// =============================================================================
// Panel Types
// =============================================================================

type PanelId = "tracks" | "editor";

// =============================================================================
// Arrange Content Component
// =============================================================================

interface ArrangeContentProps {
	/** Register a file select handler (called when a file is clicked in sidebar) */
	onRegisterFileSelect: (handler: (path: string) => void) => void;
}

export function ArrangeContent({ onRegisterFileSelect }: ArrangeContentProps) {
	const { project, block, folderTree } = useProjectContext();
	const {
		selectedBlockPath,
		setSelectedBlockPath,
		sortedTracks,
		sortedScenes,
		handleBlockDrop,
	} = useArrangementContext();

	// =========================================================================
	// File select handler (selects block for inspector)
	// =========================================================================

	const handleFileSelectRef = useRef<((path: string) => void) | null>(null);

	const handleFileSelect = useCallback((path: string) => {
		folderTree.select(path);
		setSelectedBlockPath(path);
	}, [folderTree]);

	// Keep ref updated
	handleFileSelectRef.current = handleFileSelect;

	// Register the handler with the shell (only once)
	useEffect(() => {
		onRegisterFileSelect((path: string) => {
			if (handleFileSelectRef.current) {
				handleFileSelectRef.current(path);
			}
		});
	}, [onRegisterFileSelect]);

	// =========================================================================
	// Panel order (persisted to localStorage)
	// =========================================================================

	const [panelOrder, setPanelOrder] = useState<PanelId[]>(() => {
		if (typeof window === "undefined") return ["tracks", "editor"];
		const stored = window.localStorage.getItem("quill.arrange.panelOrder");
		if (!stored) return ["tracks", "editor"];
		const parsed = JSON.parse(stored) as string[];
		// Migrate: remove unassigned, map inspector->editor
		const migrated = parsed
			.filter((id) => id !== "unassigned")
			.map((id) => (id === "inspector" ? "editor" : id)) as PanelId[];
		return migrated.length > 0 ? migrated : ["tracks", "editor"];
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
		if (!stored) return DEFAULT_WIDTHS;
		const parsed = JSON.parse(stored) as Record<string, number>;
		const migrated = { ...parsed };
		if ("inspector" in migrated) {
			migrated.editor = migrated.inspector;
			delete migrated.inspector;
		}
		// Migrate old pixel values (>100) to percentage defaults
		for (const key of Object.keys(migrated)) {
			if (migrated[key] > 100) {
				migrated[key] = DEFAULT_WIDTHS[key] ?? 30;
			}
		}
		return { ...DEFAULT_WIDTHS, ...migrated };
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

	const containerRef = useRef<HTMLDivElement>(null);
	const resizeStateRef = useRef<{ panelId: string; startPct: number } | null>(null);

	const handleResizeStart = useCallback((leftPanel: PanelId, rightPanel: PanelId) => {
		const pcts = panelWidthsRef.current;
		if (leftPanel !== "tracks") {
			resizeStateRef.current = { panelId: leftPanel, startPct: pcts[leftPanel] ?? DEFAULT_WIDTHS[leftPanel] ?? 30 };
		} else if (rightPanel !== "tracks") {
			resizeStateRef.current = { panelId: rightPanel, startPct: pcts[rightPanel] ?? DEFAULT_WIDTHS[rightPanel] ?? 30 };
		}
	}, []);

	const handleResize = useCallback((leftPanel: PanelId, rightPanel: PanelId, deltaX: number) => {
		if (!resizeStateRef.current) return;
		const containerWidth = containerRef.current?.offsetWidth ?? 1000;
		const { panelId, startPct } = resizeStateRef.current;

		const isResizingLeft = panelId === leftPanel;
		const deltaPct = (deltaX / containerWidth) * 100;
		const newPct = isResizingLeft ? startPct + deltaPct : startPct - deltaPct;
		const clampedPct = Math.max(MIN_PANEL_PCT, Math.min(MAX_PANEL_PCT, newPct));

		setPanelWidths((prev) => ({ ...prev, [panelId]: clampedPct }));
	}, []);

	const handleResizeEnd = useCallback(() => {
		resizeStateRef.current = null;
	}, []);

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

	const handleAddScene = useCallback(() => {
		if (!project.project) return;
		const scenes = sortedScenes;
		const newScene: ArrangementScene = {
			id: crypto.randomUUID(),
			name: `Scene ${scenes.length + 1}`,
			order: scenes.length,
		};
		project.updateProject({
			arrangementScenes: [...scenes, newScene],
		});
	}, [project, sortedScenes]);

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

	const handleSceneRename = useCallback(
		(sceneId: string, newName: string) => {
			if (!project.project) return;
			const updatedScenes = sortedScenes.map((scene) =>
				scene.id === sceneId ? { ...scene, name: newName } : scene
			);
			project.updateProject({ arrangementScenes: updatedScenes });
		},
		[project, sortedScenes]
	);

	const handleTrackColorChange = useCallback(
		(trackId: string, color: string | undefined) => {
			if (!project.project) return;
			const updatedTracks = sortedTracks.map((track) =>
				track.id === trackId ? { ...track, color } : track
			);
			project.updateProject({ arrangementTracks: updatedTracks });
		},
		[project, sortedTracks]
	);

	const handleSceneColorChange = useCallback(
		(sceneId: string, color: string | undefined) => {
			if (!project.project) return;
			const updatedScenes = sortedScenes.map((scene) =>
				scene.id === sceneId ? { ...scene, color } : scene
			);
			project.updateProject({ arrangementScenes: updatedScenes });
		},
		[project, sortedScenes]
	);

	const handleTrackReorder = useCallback(
		(sourceTrackId: string, targetIndex: number) => {
			if (!project.project) return;
			const sourceIndex = sortedTracks.findIndex((t) => t.id === sourceTrackId);
			if (sourceIndex === -1 || sourceIndex === targetIndex) return;

			// Build old index -> trackId mapping for block updates
			const oldIndexToTrackId = new Map(
				sortedTracks.map((t, i) => [i, t.id])
			);
			// Reorder tracks (adjust target after removal)
			const reordered = [...sortedTracks];
			const [removed] = reordered.splice(sourceIndex, 1);
			const insertIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
			reordered.splice(insertIndex, 0, removed);

			// Assign new order values
			const updatedTracks = reordered.map((t, i) => ({ ...t, order: i }));

			// Update block arrangement.track indices
			const trackIdToNewIndex = new Map(
				updatedTracks.map((t, i) => [t.id, i])
			);

			const updatedBlocks = { ...project.project.blocks };
			for (const [filePath, metadata] of Object.entries(updatedBlocks)) {
				const arr = metadata.arrangement;
				if (!arr) continue;
				const oldIdx = arr.track;
				const trackId = oldIndexToTrackId.get(oldIdx);
				if (trackId === undefined) continue;
				const newIdx = trackIdToNewIndex.get(trackId);
				if (newIdx !== undefined && newIdx !== oldIdx) {
					updatedBlocks[filePath] = {
						...metadata,
						arrangement: { ...arr, track: newIdx },
					};
				}
			}

			project.updateProject({
				arrangementTracks: updatedTracks,
				blocks: updatedBlocks,
			});
		},
		[project, sortedTracks]
	);

	const handleDeleteTrack = useCallback(
		(trackId: string) => {
			if (!project.project) return;
			const deletedIndex = sortedTracks.findIndex((t) => t.id === trackId);
			if (deletedIndex === -1) return;

			const updatedTracks = sortedTracks
				.filter((t) => t.id !== trackId)
				.map((t, i) => ({ ...t, order: i }));

			const updatedBlocks = { ...project.project.blocks };
			for (const [filePath, metadata] of Object.entries(updatedBlocks)) {
				const arr = metadata.arrangement;
				if (!arr) continue;
				if (arr.track === deletedIndex) {
					const { arrangement: _a, ...rest } = metadata;
					updatedBlocks[filePath] = rest as typeof metadata;
				} else if (arr.track > deletedIndex) {
					updatedBlocks[filePath] = {
						...metadata,
						arrangement: { ...arr, track: arr.track - 1 },
					};
				}
			}

			project.updateProject({
				arrangementTracks: updatedTracks,
				blocks: updatedBlocks,
			});
		},
		[project, sortedTracks]
	);

	const handleDeleteScene = useCallback(
		(sceneId: string) => {
			if (!project.project) return;
			if (sortedScenes.length <= 1) return;
			const deletedIndex = sortedScenes.findIndex((s) => s.id === sceneId);
			if (deletedIndex === -1) return;

			const updatedScenes = sortedScenes
				.filter((s) => s.id !== sceneId)
				.map((s, i) => ({ ...s, order: i }));

			const updatedBlocks = { ...project.project.blocks };
			for (const [filePath, metadata] of Object.entries(updatedBlocks)) {
				const arr = metadata.arrangement;
				if (!arr) continue;
				const sceneIdx = arr.sceneIndex ?? 0;
				if (sceneIdx === deletedIndex) {
					const { arrangement: _a, ...rest } = metadata;
					updatedBlocks[filePath] = rest as typeof metadata;
				} else if (sceneIdx > deletedIndex) {
					updatedBlocks[filePath] = {
						...metadata,
						arrangement: { ...arr, sceneIndex: sceneIdx - 1 },
					};
				}
			}

			project.updateProject({
				arrangementScenes: updatedScenes,
				blocks: updatedBlocks,
			});
		},
		[project, sortedScenes]
	);

	const handleCreateBlockInCell = useCallback(
		async (trackIndex: number, sceneIndex: number) => {
			if (!project.directoryHandle || !project.project) return;

			const track = sortedTracks[trackIndex];
			const scene = sortedScenes[sceneIndex];
			if (!track || !scene) return;

			const folderPath = project.project.settings.defaultPoolPath ?? "unsorted";
			const baseTitle = `${track.name} - ${scene.name}`;
			let filename = titleToFilename(baseTitle);

			const existingInFolder =
				folderPath === ""
					? Object.keys(project.project.blocks).filter((p) => !p.includes("/"))
					: Object.keys(project.project.blocks).filter((p) =>
							p.startsWith(folderPath + "/")
						);
			const existingBasenames = new Set(
				existingInFolder.map((p) => p.split("/").pop() ?? "")
			);
			let counter = 1;
			while (existingBasenames.has(filename)) {
				filename = filename.replace(/\.md$/, `-${++counter}.md`);
			}

			const content = `# ${baseTitle}\n\n`;
			const initialArrangement = {
				track: trackIndex,
				slot: 0,
				sceneIndex,
				included: true,
			};

			try {
				const { project: updatedProject, filePath } = await createBlock(
					project.directoryHandle,
					project.project,
					folderPath,
					filename,
					content,
					initialArrangement
				);
				project.updateProject(updatedProject);
				await project.refreshTree();
				setSelectedBlockPath(filePath);
				folderTree.revealPath(filePath);
			} catch (err) {
				console.error("Failed to create block in cell:", err);
			}
		},
		[project, sortedTracks, sortedScenes, setSelectedBlockPath, folderTree]
	);

	const handleContentChange = useCallback(
		(filePath: string, content: string) => {
			block.updateContent(filePath, content);
		},
		[block]
	);

	const handlePanelReorder = useCallback((sourcePanelId: string, insertIndex: number) => {
		if (sourcePanelId === "unassigned") return; // No longer a panel
		const normalizedId = sourcePanelId === "inspector" ? "editor" : sourcePanelId;
		setPanelOrder((currentOrder) => {
			const newOrder = [...currentOrder];
			const sourceIndex = newOrder.indexOf(normalizedId as PanelId);
			if (sourceIndex === -1) return currentOrder;
			newOrder.splice(sourceIndex, 1);
			const adjustedIndex = sourceIndex < insertIndex ? insertIndex - 1 : insertIndex;
			newOrder.splice(adjustedIndex, 0, normalizedId as PanelId);
			return newOrder;
		});
	}, []);

	// =========================================================================
	// Panel rendering helpers
	// =========================================================================

	const getPanelStyle = (panelId: PanelId): React.CSSProperties => {
		if (panelId === "tracks") return { flex: 1, minWidth: MIN_PANEL_PX };
		const pct = panelWidths[panelId] ?? DEFAULT_WIDTHS[panelId] ?? 30;
		return { flex: `0 0 ${pct}%`, minWidth: MIN_PANEL_PX };
	};

	const renderPanel = (panelId: PanelId) => {
		if (panelId === "tracks") {
			return sortedTracks.length === 0 ? (
				<EmptyTracksState onAddTrack={handleAddTrack} />
			) : (
				<ArrangementGrid
					tracks={sortedTracks}
					scenes={sortedScenes}
					blocks={project.project?.blocks ?? {}}
					onBlockDrop={handleBlockDrop}
					onBlockSelect={setSelectedBlockPath}
					selectedBlockPath={selectedBlockPath}
					onTrackRename={handleTrackRename}
					onTrackColorChange={handleTrackColorChange}
					onSceneRename={handleSceneRename}
					onSceneColorChange={handleSceneColorChange}
					onTrackReorder={handleTrackReorder}
					onAddScene={handleAddScene}
					onAddTrack={handleAddTrack}
					onDeleteTrack={handleDeleteTrack}
					onDeleteScene={handleDeleteScene}
					onCreateBlockInCell={handleCreateBlockInCell}
				/>
			);
		}
		if (panelId === "editor") {
			return (
				<EditorPanel
					selectedBlockPath={selectedBlockPath}
					blocks={project.project?.blocks ?? {}}
					onContentChange={handleContentChange}
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
			<div ref={containerRef} className="flex flex-1 overflow-hidden">
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
