"use client";

import {
	createContext,
	useContext,
	type ReactNode,
	useEffect,
	useState,
} from "react";
import { useProject, type ProjectState, type ProjectActions } from "@/hooks/use-project";
import { useBlock, type BlockState, type BlockActions } from "@/hooks/use-block";
import { useFolderTree, type FolderTreeState, type FolderTreeActions } from "@/hooks/use-folder-tree";
import { isFileSystemAccessSupported } from "@/lib/filesystem";

// =============================================================================
// Types
// =============================================================================

export interface ProjectContextValue {
	// Project state and actions
	project: ProjectState & ProjectActions;
	// Block state and actions
	block: BlockState & BlockActions;
	// Folder tree state and actions
	folderTree: FolderTreeState & FolderTreeActions;
	// File System Access API support
	isFileSystemSupported: boolean;
}

// =============================================================================
// Context
// =============================================================================

const ProjectContext = createContext<ProjectContextValue | null>(null);

// =============================================================================
// Provider
// =============================================================================

export function ProjectProvider({ children }: { children: ReactNode }) {
	const [isSupported, setIsSupported] = useState(false);
	
	// Check for File System Access API support on client
	useEffect(() => {
		setIsSupported(isFileSystemAccessSupported());
	}, []);

	// Project state
	const project = useProject();

	// Block state (depends on project)
	const block = useBlock({
		directoryHandle: project.directoryHandle,
		project: project.project,
		onBlockSaved: () => {
			// Optionally refresh tree after save
		},
	});

	// Folder tree state (depends on project's folder tree)
	const folderTree = useFolderTree(project.folderTree);

	// Try to restore last project on mount
	useEffect(() => {
		if (isSupported && !project.isOpen && !project.isLoading) {
			project.restoreLastProject();
		}
	}, [isSupported]); // eslint-disable-line react-hooks/exhaustive-deps

	// Start file watcher when project opens
	useEffect(() => {
		if (project.isOpen) {
			project.startWatching();
		}
		return () => {
			project.stopWatching();
		};
	}, [project.isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

	const value: ProjectContextValue = {
		project,
		block,
		folderTree,
		isFileSystemSupported: isSupported,
	};

	return (
		<ProjectContext.Provider value={value}>
			{children}
		</ProjectContext.Provider>
	);
}

// =============================================================================
// Hook
// =============================================================================

export function useProjectContext(): ProjectContextValue {
	const context = useContext(ProjectContext);
	if (!context) {
		throw new Error("useProjectContext must be used within a ProjectProvider");
	}
	return context;
}

