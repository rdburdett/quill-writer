"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// =============================================================================
// View Toggle Component
// =============================================================================

export function ViewToggle() {
	const pathname = usePathname();
	const isWrite = pathname === "/";
	const isArrange = pathname === "/arrange";

	return (
		<div className="inline-flex items-center rounded-md border bg-muted/50 p-1">
			<Link
				href="/"
				className={cn(
					"px-3 py-1.5 text-sm font-medium rounded transition-colors",
					"hover:bg-background/50",
					isWrite && "bg-background shadow-sm"
				)}
			>
				Write
			</Link>
			<Link
				href="/arrange"
				className={cn(
					"px-3 py-1.5 text-sm font-medium rounded transition-colors",
					"hover:bg-background/50",
					isArrange && "bg-background shadow-sm"
				)}
			>
				Arrange
			</Link>
		</div>
	);
}
