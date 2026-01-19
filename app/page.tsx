"use client";

import { useProjectContext } from "@/components/project-provider";
import { ProjectWelcome } from "@/components/project-welcome";
import { EditorView } from "@/components/editor-view";

// =============================================================================
// Page Component
// =============================================================================

export default function Home() {
	const { project, isFileSystemSupported } = useProjectContext();

	// Show welcome screen if no project is open
	if (!project.isOpen) {
		return (
			<ProjectWelcome
				isLoading={project.isLoading}
				isSupported={isFileSystemSupported}
				error={project.error}
				onOpenProject={project.openProject}
				onCreateNewProject={project.createNewProject}
				onOpenProjectFromHandle={project.openProjectFromHandle}
			/>
		);
	}

	// Show editor view when project is open
	return <EditorView />;
}
