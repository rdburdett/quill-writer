
# **Quill Project Context Capsule**

This document acts as the stable anchor for all work sessions on the Quill writing application. You can hand it to Cursor agents, GitHub Copilot, or any LLM to rehydrate your project context quickly without restating the full history.

It contains: goals, rationale, constraints, architectural expectations, workflow preferences, and guardrails that represent the design philosophy you’ve been shaping.

---

## **Purpose of Quill**

Quill is a web-first, mobile-resilient writing environment for fiction authors. Its north star is to help writers organize, manipulate, and explore story structure through scenes, blocks, characters, and conceptual relationships. It prioritizes flexible visualization over rigid text editors.

The project aims to synthesize a DAW-like workflow (timeline/arrangement) with novel-centric tools (character relationships, scene linking, metadata, preview states) while remaining lightweight, fast, and fun.

---

## **Core Principles (Guardrails)**

**1. Clarity over cleverness.** Code should be explicit, modular, and easy for future you (or agents) to reason about.

**2. Zero inline styling or DOM mutation.** UI must be built with React components, Tailwind (or a consistent component library), and predictable state flows.

**3. Architecture must scale.** Components, domain models, hooks, context providers, and utilities should live in well-defined folders. Avoid monolithic files.

**4. Mobile-resilient first.** The app should degrade gracefully down to narrow widths.

**5. Separation of domains.** Features like file browsing, arrangement views, and preview panes should remain independent but share a common data layer.

**6. Agents must follow the established patterns.** When spinning up new components or features, AI assistants should conform to the architecture choices encoded here.

**7. Writer experience comes before developer convenience.** Interfaces should feel smooth, snappy, and intuitive.

---

## **High-Level App Structure**

Quill’s internal layout breaks into:

- **File Area**: hierarchical browser (drop-down, collapsible lists, drag-and-drop support) where stories, scenes, and notes live.

- **Arrangement View**: vertically aligned blocks/scenes with drag-and-drop reordering, zoomable structure, and the potential for future visualization of relationships.

- **Preview/Editor Pane**: renders text or metadata for the currently selected item.

- **Concept Relationship Layer (future)**: representations of character-idea-links, relationship maps, and semantic tagging.

The app should allow quick context-switching and multi-pane behavior.

---

## **Checklist of Current Goals**

**\[ \] Implement a clean React-based UI architecture with no DOM mutation**

- Components should live in a logical folder tree: components/, features/, core/, lib/, etc.

- Remove inline CSS; rely on Tailwind or a consistent component library.

**\[ \] Build the File Browser**

- Collapsible structure.

- Drag-and-drop for reorganization.

- Clean event-driven updates.

- Room for metadata (icon, type, modified timestamp, etc.).

**\[ \] Build the Arrangement View**

- Likely use Pragmatic Drag & Drop by Atlassian.

- Vertical timeline-like layout for blocks/scenes.

- Visual representation should stay minimal but composable.

**\[ \] Establish a Shared Data Model**

- A central store (Context API, Zustand, Jotai, or similar) to unify file data, scene structure, and preview selection.

- Data types and interfaces kept in types/.

**\[ \] Create a Preview Pane**

- Renders text or structured metadata.

- Easily replaceable for long-term extensibility.

**\[ \] Add Responsive Layout Handling**

- Mobile, tablet, desktop breakpoints.

- Consider panel collapsibility.

**\[ \] Create an Agent-Ready Development Workflow**

- A Repeatable task entrypoint: “Next small step in the roadmap.”

- A clear set of rules for agents to avoid architectural drift.

---

## **Rationale Behind the Architecture**

**Writing software tends to rot** when UI layers mix concerns, when drag-and-drop is bolted on haphazardly, or when components become tangled. By establishing discipline early — feature separation, composable UI components, and well-defined shared state — the project stays navigable even if contributions come from several short coding sprints powered by various LLMs.

**The design is intentionally modular** so that larger future features (semantic graphs, timeline zooming, character relationship overlays) can attach to stable core primitives rather than forcing rewrites.

**The structure also supports short-session development.** Agents can be asked to build a feature from the checklist, fix a bug, or implement a UI element without needing a full project recap.

---

## **How to Use This Capsule With Agents**

When opening a new session, provide this document and a short instruction like:

- “Use the Quill Project Context Capsule. Identify and execute the next meaningful atomic task.”

- “I’m working on the file browser; use the Context Capsule and build the dropdown behavior next.”

- “Implement the Arrangement View component according to the principles in the Capsule.”

Agents should treat this file as the authoritative reference for:

- Feature scope.

- Coding style.

- Architectural boundaries.

This frees you from having to juggle all of it in your head each session.

---

## **Future Expansion Hooks**

- Semantic tagging.

- Real-time collaboration.

- Voxel or 3D relationship mapping.

- AI-assisted story node generation.

- Narrative graph view.

---

End of Quill Project Context Capsule.