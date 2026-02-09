"use client";

import { useCallback } from "react";
import Link from "next/link";
import { Feather, Settings, FolderOpen, FolderPlus, Save, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// =============================================================================
// App Menu Component
// =============================================================================

export interface AppMenuProps {
	hasUnsavedChanges: boolean;
	onSaveProject: () => Promise<void>;
	onOpenProject: () => void;
	onCreateNewProject: () => void;
	onCloseProject: () => void;
}

export function AppMenu({
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
