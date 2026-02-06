"use client";

import { useProjectContext } from "@/components/project-provider";
import { ProjectWelcome } from "@/components/project-welcome";
import { ArrangeView } from "@/components/arrange/arrange-view";

// =============================================================================
// Arrange Page Component
// =============================================================================

export default function ArrangePage() {
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

	// Show arrange view when project is open
	return <ArrangeView />;
}
