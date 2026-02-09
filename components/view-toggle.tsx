"use client";

import { cn } from "@/lib/utils";

// =============================================================================
// View Toggle Component (state-based)
// =============================================================================

export type ViewMode = "write" | "arrange";

interface ViewToggleProps {
	activeMode: ViewMode;
	onModeChange: (mode: ViewMode) => void;
}

export function ViewToggle({ activeMode, onModeChange }: ViewToggleProps) {
	const isWrite = activeMode === "write";
	const isArrange = activeMode === "arrange";

	return (
		<div className="inline-flex items-center rounded-md border bg-muted/50 p-1">
			<button
				onClick={() => onModeChange("write")}
				className={cn(
					"px-3 py-1.5 text-sm font-medium rounded transition-colors",
					"hover:bg-background/50",
					isWrite && "bg-background shadow-sm"
				)}
			>
				Write
			</button>
			<button
				onClick={() => onModeChange("arrange")}
				className={cn(
					"px-3 py-1.5 text-sm font-medium rounded transition-colors",
					"hover:bg-background/50",
					isArrange && "bg-background shadow-sm"
				)}
			>
				Arrange
			</button>
		</div>
	);
}
