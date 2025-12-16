"use client";

import { FolderOpen, FolderPlus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

// =============================================================================
// Types
// =============================================================================

export interface ProjectWelcomeProps {
	isLoading: boolean;
	isSupported: boolean;
	error: Error | null;
	onOpenProject: () => void;
	onCreateNewProject: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function ProjectWelcome({
	isLoading,
	isSupported,
	error,
	onOpenProject,
	onCreateNewProject,
}: ProjectWelcomeProps) {
	if (!isSupported) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
				<div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
					<AlertCircle className="h-8 w-8 text-destructive" />
				</div>
				<div className="space-y-2">
					<h1 className="text-2xl font-semibold">Browser Not Supported</h1>
					<p className="max-w-md text-muted-foreground">
						Quill Writer requires the File System Access API, which is not
						supported in your current browser.
					</p>
					<div className="mt-4 rounded-lg border bg-muted/30 p-4 text-left text-sm">
						<p className="font-medium text-foreground">Supported browsers:</p>
						<ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
							<li>Google Chrome</li>
							<li>Microsoft Edge</li>
							<li>Opera</li>
						</ul>
						<p className="mt-3 text-muted-foreground">
							<strong>Note:</strong> Embedded browsers (like in Cursor IDE or VS Code) 
							may not support this API. Please open{" "}
							<code className="rounded bg-muted px-1.5 py-0.5">localhost:3000</code>{" "}
							in Chrome or Edge.
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 text-center">
			{/* Logo/Title */}
			<div className="space-y-2">
				<h1 className="text-4xl font-bold tracking-tight">Quill Writer</h1>
				<p className="text-lg text-muted-foreground">
					A distraction-free writing environment
				</p>
			</div>

			{/* Error message */}
			{error && (
				<div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
					<AlertCircle className="h-4 w-4" />
					{error.message}
				</div>
			)}

			{/* Action buttons */}
			<div className="flex flex-col gap-3 sm:flex-row">
				<Button
					size="lg"
					onClick={onCreateNewProject}
					disabled={isLoading}
					className="gap-2"
				>
					<FolderPlus className="h-5 w-5" />
					{isLoading ? "Creating..." : "Create New Project"}
				</Button>
				<Button
					size="lg"
					variant="outline"
					onClick={onOpenProject}
					disabled={isLoading}
					className="gap-2"
				>
					<FolderOpen className="h-5 w-5" />
					Open Existing Folder
				</Button>
			</div>

			{/* Help text */}
			<div className="max-w-md space-y-4 text-sm text-muted-foreground">
				<p>
					<strong>Create New Project</strong> sets up a folder with default structure.
					<br />
					<strong>Open Existing</strong> works with any folder of markdown files.
				</p>
				<div className="rounded-lg border bg-muted/30 p-4 text-left">
					<p className="font-medium text-foreground">How it works:</p>
					<ul className="mt-2 list-inside list-disc space-y-1">
						<li>Your writing stays in plain .md files</li>
						<li>Edit files in any app (Word, VS Code, etc.)</li>
						<li>Project metadata stored in a .quill file</li>
						<li>No lock-in, your words belong to you</li>
					</ul>
				</div>
			</div>
		</div>
	);
}

