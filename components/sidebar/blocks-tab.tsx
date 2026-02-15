"use client";

import { useArrangementContext } from "@/components/arrange/arrangement-context";
import { BlockCard } from "@/components/arrange/block-card";
import { cn } from "@/lib/utils";
import { useEditorSettingsContext } from "@/components/theme-provider";

// =============================================================================
// Blocks Tab Component
// =============================================================================

export function BlocksTab() {
	const {
		unassignedBlocks,
		selectedBlockPath,
		setSelectedBlockPath,
		handleBlockDrop,
	} = useArrangementContext();
	const { showBorders } = useEditorSettingsContext();

	return (
		<div className="flex h-full flex-col bg-muted/30">
			{/* Header */}
			<div
				className={cn(
					"px-4 py-3 shrink-0",
					showBorders && "border-b border-border"
				)}
			>
				<h3 className="text-sm font-medium">Blocks</h3>
				<p className="text-xs text-muted-foreground">
					{unassignedBlocks.length}{" "}
					{unassignedBlocks.length === 1 ? "block" : "blocks"} unassigned
				</p>
			</div>

			{/* Blocks List */}
			<div className="flex-1 overflow-auto p-3 space-y-2">
				{unassignedBlocks.length === 0 ? (
					<div className="py-8 text-center text-sm text-muted-foreground">
						All blocks are assigned
					</div>
				) : (
					unassignedBlocks.map(({ filePath, metadata }) => (
						<BlockCard
							key={filePath}
							filePath={filePath}
							metadata={metadata}
							isSelected={selectedBlockPath === filePath}
							onSelect={() => setSelectedBlockPath(filePath)}
							onDrop={handleBlockDrop}
						/>
					))
				)}
			</div>
		</div>
	);
}
