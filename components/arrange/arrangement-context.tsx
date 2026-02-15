"use client";

import React, {
	createContext,
	useContext,
	useState,
	useCallback,
	useMemo,
} from "react";
import { useProjectContext } from "@/components/project-provider";
import {
	type ArrangementTrack,
	type ArrangementScene,
	createBlockMetadata,
} from "@/lib/project/types";
import {
	getUnassignedBlocks,
	getBlocksForCell,
	normalizeTrackSlots,
} from "./types";

// =============================================================================
// Context Types
// =============================================================================

interface ArrangementContextValue {
	selectedBlockPath: string | null;
	setSelectedBlockPath: (path: string | null) => void;
	unassignedBlocks: Array<{ filePath: string; metadata: import("@/lib/project/types").BlockMetadata }>;
	sortedTracks: ArrangementTrack[];
	sortedScenes: ArrangementScene[];
	handleBlockDrop: (
		filePath: string,
		targetTrackIndex: number,
		targetSceneIndex: number,
		targetSlot: number,
		sourceTrackIndex?: number,
		sourceSceneIndex?: number,
		sourceSlot?: number
	) => void;
}

const ArrangementContext = createContext<ArrangementContextValue | null>(null);

// =============================================================================
// Provider
// =============================================================================

export function ArrangementProvider({ children }: { children: React.ReactNode }) {
	const { project } = useProjectContext();
	const [selectedBlockPath, setSelectedBlockPath] = useState<string | null>(null);

	const sortedTracks = useMemo(() => {
		if (!project.project) return [];
		return [...project.project.arrangementTracks].sort(
			(a, b) => a.order - b.order
		);
	}, [project.project]);

	const sortedScenes = useMemo(() => {
		if (!project.project?.arrangementScenes) {
			return [{ id: "default", name: "Scene 1", order: 0 }];
		}
		return [...project.project.arrangementScenes].sort(
			(a, b) => a.order - b.order
		);
	}, [project.project]);

	const unassignedBlocks = useMemo(() => {
		if (!project.project) return [];
		return getUnassignedBlocks(
			project.project.blocks,
			sortedTracks
		);
	}, [project.project, sortedTracks]);

	const handleBlockDrop = useCallback(
		(
			filePath: string,
			targetTrackIndex: number,
			targetSceneIndex: number,
			targetSlot: number,
			sourceTrackIndex?: number,
			sourceSceneIndex?: number,
			sourceSlot?: number
		) => {
			if (!project.project) return;

			const updatedBlocks = { ...project.project.blocks };
			let blockMetadata = updatedBlocks[filePath];
			if (!blockMetadata) {
				blockMetadata = createBlockMetadata();
				updatedBlocks[filePath] = blockMetadata;
			}

			const srcScene = sourceSceneIndex ?? 0;

			if (sourceTrackIndex !== undefined && sourceSlot !== undefined) {
				const sourceBlocks = getBlocksForCell(
					updatedBlocks,
					sourceTrackIndex,
					srcScene
				);
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

			const targetBlocks = getBlocksForCell(
				updatedBlocks,
				targetTrackIndex,
				targetSceneIndex
			);
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
					sceneIndex: targetSceneIndex,
					included: blockMetadata.arrangement?.included ?? true,
				},
			};

			const normalizedBlocks = normalizeTrackSlots(
				updatedBlocks,
				targetTrackIndex,
				targetSceneIndex
			);
			if (sourceTrackIndex !== undefined) {
				const finalBlocks = normalizeTrackSlots(
					normalizedBlocks,
					sourceTrackIndex,
					srcScene
				);
				project.updateProject({ blocks: finalBlocks });
			} else {
				project.updateProject({ blocks: normalizedBlocks });
			}
		},
		[project]
	);

	const value = useMemo<ArrangementContextValue>(
		() => ({
			selectedBlockPath,
			setSelectedBlockPath,
			unassignedBlocks,
			sortedTracks,
			sortedScenes,
			handleBlockDrop,
		}),
		[
			selectedBlockPath,
			unassignedBlocks,
			sortedTracks,
			sortedScenes,
			handleBlockDrop,
		]
	);

	return (
		<ArrangementContext.Provider value={value}>
			{children}
		</ArrangementContext.Provider>
	);
}

export function useArrangementContext() {
	const ctx = useContext(ArrangementContext);
	if (!ctx) {
		throw new Error("useArrangementContext must be used within ArrangementProvider");
	}
	return ctx;
}
