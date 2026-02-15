Future Roadmap (captured from design conversation)
The following features were discussed in detail during the design session that produced this plan. They are documented here to preserve context for future agent threads.

Core Vision: DAW-Inspired Writing Production Environment
The app should feel like Ableton Live for writers. The arrangement grid is the primary workspace. Blocks are clips. Tracks are parallel layers of concern. The editor is a detail panel that opens contextually when a block is selected. There is no separate "write mode" -- writing happens inside the arrangement.

Near-Term (build after this plan)
2D Arrangement Grid

Transform the current track rows into a proper 2D grid
Y axis = time/narrative sequence (Scenes). Scenes are user-defined containers -- not strictly "chapters" but flexible encapsulations of blocks that feel right for the user's workflow
X axis = tracks (parallel concerns: Prose, Outline, Mood, Research, etc.)
Blocks sit at grid intersections and can stack vertically within a cell
Loose grid snapping (not strict) -- blocks can span partial areas, similar to how DAW clips can be trimmed
Scene boundaries are soft dividers, not rigid rows
Existing data model (ArrangementPosition) would evolve to: { trackId: string, column: number, span?: number, included: boolean }
Tracks need: user-defined names, colors, add/remove/reorder capability
Move Unassigned Panel to Sidebar

The "Unassigned" block pool moves into the sidebar's "Blocks" tab (already has a placeholder in components/sidebar/sidebar-container.tsx)
This clears the arrangement area to be purely the grid + editor panel
The sidebar becomes the block discovery/navigation tool; the grid is the spatial organization tool
Zen Mode

A keyboard shortcut (e.g., Cmd+\` or `Escape) that collapses all panels except the editor
Hides: sidebar, arrangement grid, header bar
The editor expands to fill the full viewport for distraction-free writing
A subtle indicator (small Feather icon in corner) allows exiting zen mode
Pressing the shortcut again restores the full workspace exactly as it was
Implementation: a zenMode boolean state in AppShell that conditionally hides/shows panels with smooth transitions
Dockable Editor Panel

Users can drag the editor panel to dock it at the right (vertical split) or bottom (horizontal split) of the arrangement
Wide monitors may prefer vertical split; laptops may prefer horizontal
The existing PanelBorder resize handles and DraggablePanelHeader reorder system provide the foundation
Needs: drop zones that indicate orientation based on drag position, flex-direction switching between row and column
Mid-Term
Track Templates

Preconfigured track sets suited for different writer types:
Fiction Novel: Prose, Outline, Characters, World-building, Research
Academic Paper: Draft, Sources, Methodology, Data, Notes
Legal Brief: Argument, Precedent, Statutes, Counter-arguments, Client Notes
Screenplay: Scene Description, Dialogue, Stage Directions, Notes
New users pick a template on project creation, get sensible defaults
Power users build custom templates
Templates are exportable/importable JSON definitions
Future: community-sourced template marketplace
Block Splitting

Users can cut a block into two smaller blocks at a chosen point
The split blocks remain within the same scene/cell
Implementation: split the markdown content at the cursor position, create two new block files, update arrangement positions
Edge cases: headings, formatting that spans the split point
Related to vertical zoom (see below)
Vertical Zoom

Like a DAW zooming into finer time divisions (1/4 notes to 1/16th notes)
Zoomed out: block cards show titles and maybe a preview line
Zoomed in: blocks get taller, showing more content preview, enabling finer positioning
Controls: scroll wheel + modifier key, or a zoom slider
Block splitting becomes more natural at higher zoom levels
Simple Mixdown (Phase 1)

Concatenate blocks in scene order from tracks marked as "output"
Walk down the Y axis, for each scene grab blocks from designated output tracks, concatenate into a single markdown document
Export as markdown, plain text, or other formats
The output lives on a "Master" track row that is read-only and auto-updates
Long-Term
LLM-Assisted Mixdown (Phase 2)

A master track where an LLM takes all block data (prose + outlines + mood + research from parallel tracks) and generates coherent output sections
Requires: LLM integration layer, prompt management, context assembly from adjacent tracks
The generated output is editable by the user
Each master block can have multiple versions (see below)
Block Versioning

Each block (especially master/output blocks) can have multiple saved versions
Users can compare, switch between, and choose versions
Useful for: exploring alternate phrasings, comparing LLM outputs, saving draft variations
Think git branches but per-block, not per-project
UI: a version selector dropdown or timeline within the editor panel
Data model: versions stored alongside the block, with timestamps and optional labels
No-Tab Philosophy

The tab system is deliberately removed. Navigation happens through:
The arrangement grid (primary) -- click a block to edit it
The block pool in the sidebar (unplaced blocks)
The file browser in the sidebar (power-user access)
This reinforces the DAW metaphor: you don't open files in tabs, you click clips in the arrangement
The editor panel always shows the single selected block
Architecture Notes for Future Agents
The app uses Next.js App Router, but routing is minimal -- the main page (app/page.tsx) renders AppShell which contains everything
components/app-shell.tsx is the persistent frame: header, sidebar, content area
components/arrange/arrange-content.tsx is the arrangement workspace
components/arrange/ contains all arrangement-specific components (panels, block cards, track rows, drop zones)
components/sidebar/sidebar-container.tsx has a tabbed sidebar with placeholder tabs for Blocks, Outline, and Projects
The block system lives in hooks/use-block.ts -- it handles open/close, content updates, auto-save, dirty tracking
Project metadata (arrangement tracks, block positions) lives in .quill files managed by hooks/use-project.ts
The PanelBorder component (components/arrange/panel-border.tsx) handles both resize dragging and panel reorder drop zones
@atlaskit/pragmatic-drag-and-drop is the drag-and-drop library used throughout
All UI uses Tailwind CSS + shadcn/ui components
User preferences stored in localStorage (sidebar state, panel order, panel widths)
The NovelEditor is Tiptap/ProseMirror-based, converts markdown to/from ProseMirror JSON internally