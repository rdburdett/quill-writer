/**
 * Types for the Arrange view drag-and-drop system
 */

import type { BlockMetadata, ArrangementTrack } from "@/lib/project/types";

// =============================================================================
// Drag Data Types
// =============================================================================

export interface BlockDragData {
	type: "arrange-block";
	filePath: string;
	sourceTrack?: number;
	sourceSlot?: number;
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
 * Get blocks assigned to a specific track
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
	
	// Sort by slot
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
 * Recompute slot numbers for a track to be contiguous
 */
export function normalizeTrackSlots(
	blocks: Record<string, BlockMetadata>,
	trackIndex: number
): Record<string, BlockMetadata> {
	const trackBlocks = getBlocksForTrack(blocks, trackIndex);
	const updatedBlocks = { ...blocks };
	
	trackBlocks.forEach(({ filePath, metadata }, index) => {
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
