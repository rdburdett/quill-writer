"use client";

import { useProjectContext } from "@/components/project-provider";
import { ProjectWelcome } from "@/components/project-welcome";
import { AppShell } from "@/components/app-shell";

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

	// Show app shell when project is open
	return <AppShell />;
}
