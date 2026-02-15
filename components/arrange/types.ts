/**
 * Types for the Arrange view drag-and-drop system
 */

import type { BlockMetadata, ArrangementTrack } from "@/lib/project/types";

// =============================================================================
// Drag Data Types
// =============================================================================

export interface BlockDragData {
	[key: string]: unknown;
	type: "arrange-block";
	filePath: string;
	sourceTrack?: number;
	sourceSceneIndex?: number;
	sourceSlot?: number;
}

export interface TrackDragData {
	[key: string]: unknown;
	type: "arrange-track";
	trackId: string;
	trackIndex: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get display title for a block from its file path
 */
export function getBlockDisplayTitle(filePath: string): string {
	const filename = filePath.split("/").pop() ?? filePath;
	return filename.replace(/\.(md|txt)$/i, "");
}

/**
 * Get blocks assigned to a specific track (all scenes)
 */
export function getBlocksForTrack(
	blocks: Record<string, BlockMetadata>,
	trackIndex: number
): Array<{ filePath: string; metadata: BlockMetadata }> {
	const result: Array<{ filePath: string; metadata: BlockMetadata }> = [];

	for (const [filePath, metadata] of Object.entries(blocks)) {
		if (metadata.arrangement?.track === trackIndex) {
			result.push({ filePath, metadata });
		}
	}

	// Sort by sceneIndex then slot
	result.sort((a, b) => {
		const sceneA = a.metadata.arrangement?.sceneIndex ?? 0;
		const sceneB = b.metadata.arrangement?.sceneIndex ?? 0;
		if (sceneA !== sceneB) return sceneA - sceneB;
		const slotA = a.metadata.arrangement?.slot ?? 0;
		const slotB = b.metadata.arrangement?.slot ?? 0;
		return slotA - slotB;
	});

	return result;
}

/**
 * Get blocks at a specific grid cell (track x scene)
 */
export function getBlocksForCell(
	blocks: Record<string, BlockMetadata>,
	trackIndex: number,
	sceneIndex: number
): Array<{ filePath: string; metadata: BlockMetadata }> {
	const result: Array<{ filePath: string; metadata: BlockMetadata }> = [];

	for (const [filePath, metadata] of Object.entries(blocks)) {
		const arr = metadata.arrangement;
		if (
			arr &&
			arr.track === trackIndex &&
			(arr.sceneIndex ?? 0) === sceneIndex
		) {
			result.push({ filePath, metadata });
		}
	}

	result.sort((a, b) => {
		const slotA = a.metadata.arrangement?.slot ?? 0;
		const slotB = b.metadata.arrangement?.slot ?? 0;
		return slotA - slotB;
	});

	return result;
}

/**
 * Get unassigned blocks (no arrangement or invalid track)
 */
export function getUnassignedBlocks(
	blocks: Record<string, BlockMetadata>,
	tracks: ArrangementTrack[]
): Array<{ filePath: string; metadata: BlockMetadata }> {
	const validTrackIndices = new Set(tracks.map((_, i) => i));
	const result: Array<{ filePath: string; metadata: BlockMetadata }> = [];
	
	for (const [filePath, metadata] of Object.entries(blocks)) {
		const arrangement = metadata.arrangement;
		if (!arrangement || !validTrackIndices.has(arrangement.track)) {
			result.push({ filePath, metadata });
		}
	}
	
	return result;
}

/**
 * Recompute slot numbers for a track+scene cell to be contiguous
 */
export function normalizeTrackSlots(
	blocks: Record<string, BlockMetadata>,
	trackIndex: number,
	sceneIndex?: number
): Record<string, BlockMetadata> {
	const cellBlocks =
		sceneIndex !== undefined
			? getBlocksForCell(blocks, trackIndex, sceneIndex)
			: getBlocksForTrack(blocks, trackIndex);
	const updatedBlocks = { ...blocks };

	cellBlocks.forEach(({ filePath, metadata }, index) => {
		if (metadata.arrangement) {
			updatedBlocks[filePath] = {
				...metadata,
				arrangement: {
					...metadata.arrangement,
					slot: index,
				},
			};
		}
	});

	return updatedBlocks;
}
