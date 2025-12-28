# Current PR Summary: Drag Handle Conflict Fix

## Problem

Tiptap's `GlobalDragHandle` extension and Pragmatic Drag and Drop were conflicting, causing blocks to become undraggable after the first drag operation.

## Solution

Implemented conflict detection and temporary disabling of Pragmatic Drag and Drop when Tiptap's drag handles are in use.

## Changes Made

### 1. Fixed Drag Handle Conflicts (`components/novel-editor.tsx`)
- Added detection for Tiptap drag operations via native `dragstart` events
- Temporarily disable Pragmatic Drag and Drop when Tiptap drag handles are used
- Re-enable Pragmatic Drag and Drop after Tiptap drag completes
- Updated comments to clarify the conflict resolution approach

### 2. Recent Projects Feature (`components/project-welcome.tsx`, `hooks/use-project.ts`, `lib/filesystem/recent-projects.ts`)
- Added IndexedDB storage for recently opened projects
- Display recent projects on welcome page
- Quick access to reopen previous work
- Automatic cleanup of invalid handles

### 3. Project Menu (`components/editor-view.tsx`)
- Added dropdown menu in editor header
- Quick access to save, open, create, and close project actions
- Visual indicator for unsaved changes

### 4. CRDT Project Format (from previous work)
- New `.quill` project file format
- Yjs integration for conflict-free editing
- Oplog-based synchronization

## Testing

- ✅ Blocks can be dragged multiple times within the same editor
- ✅ Text selection dragging still works between tabs
- ✅ No conflicts between the two drag systems
- ✅ Recent projects display and work correctly
- ✅ Project menu functions correctly

## Known Limitations

- Block dragging only works within the same editor (not between tabs)
- This is a temporary fix - full solution requires custom drag handle implementation

## Next Steps

See `docs/block-drag-and-drop-plan.md` for the full implementation plan to enable cross-tab block dragging.

