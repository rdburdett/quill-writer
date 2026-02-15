"use client";

import { useState } from "react";
import { FolderTree, LayoutGrid, ListTree, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { FolderSidebar, type FolderSidebarProps } from "@/components/folder-sidebar";
import { BlocksTab } from "./blocks-tab";

// =============================================================================
// Sidebar Tab Types
// =============================================================================

type SidebarTabId = "files" | "blocks" | "outline" | "projects";

interface SidebarTab {
	id: SidebarTabId;
	label: string;
	icon: React.ComponentType<{ className?: string }>;
}

const SIDEBAR_TABS: SidebarTab[] = [
	{ id: "files", label: "Files", icon: FolderTree },
	{ id: "blocks", label: "Blocks", icon: LayoutGrid },
	{ id: "outline", label: "Outline", icon: ListTree },
	{ id: "projects", label: "Projects", icon: BookOpen },
];

// =============================================================================
// Sidebar Container Props
// =============================================================================

interface SidebarContainerProps extends FolderSidebarProps {
	/** Called when a file is selected (mode-specific behavior) */
	onFileSelect: (path: string) => void;
}

// =============================================================================
// Sidebar Container Component
// =============================================================================

export function SidebarContainer(props: SidebarContainerProps) {
	const [activeTab, setActiveTab] = useState<SidebarTabId>("files");

	const { onFileSelect, ...folderSidebarProps } = props;

	// Wrap onSelect to use the mode-specific handler
	const handleFileSelect = (path: string) => {
		onFileSelect(path);
		// Also call the original onSelect for FolderSidebar's internal state
		props.onSelect(path);
	};

	return (
		<div className="flex h-full flex-col">
			{/* Tab Bar */}
			<div className="flex shrink-0 border-b border-border bg-muted/30">
				{SIDEBAR_TABS.map((tab) => {
					const Icon = tab.icon;
					const isActive = activeTab === tab.id;
					return (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id)}
							className={cn(
								"flex flex-1 items-center justify-center p-2 transition-colors",
								"hover:bg-muted/50",
								isActive && "bg-background text-foreground",
								!isActive && "text-muted-foreground"
							)}
							title={tab.label}
							aria-label={tab.label}
						>
							<Icon className="h-4 w-4" />
						</button>
					);
				})}
			</div>

			{/* Tab Content */}
			<div className="flex-1 overflow-hidden">
				{activeTab === "files" && (
					<FolderSidebar {...folderSidebarProps} onSelect={handleFileSelect} />
				)}
				{activeTab === "blocks" && <BlocksTab />}
				{activeTab === "outline" && (
					<div className="flex h-full items-center justify-center p-4">
						<p className="text-sm text-muted-foreground">Outline view coming soon</p>
					</div>
				)}
				{activeTab === "projects" && (
					<div className="flex h-full items-center justify-center p-4">
						<p className="text-sm text-muted-foreground">Saved projects coming soon</p>
					</div>
				)}
			</div>
		</div>
	);
}
