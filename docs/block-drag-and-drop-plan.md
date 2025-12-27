# Block Drag and Drop Implementation Plan

## Overview

This document outlines the plan for implementing a unified block drag-and-drop system that enables:
- Dragging blocks within the same editor (reordering)
- Dragging blocks between different tabs/pages
- Consistent drag experience using Pragmatic Drag and Drop

## Current State

- ✅ **Fixed**: Tiptap's `GlobalDragHandle` now works without conflicts
- ✅ **Working**: Text selection dragging between tabs works
- ❌ **Missing**: Block dragging between tabs/pages
- ❌ **Issue**: Tiptap's `GlobalDragHandle` only works within a single editor instance

## Proposed Solution

Replace Tiptap's `GlobalDragHandle` with a custom implementation using Pragmatic Drag and Drop. This provides:
1. **Unified drag system** - One library for all drag operations
2. **Cross-tab support** - Blocks can be dragged between any tabs/pages
3. **Full control** - Complete control over drag behavior and UX

## Architecture

### Components

1. **BlockDragHandle Component** (`components/block-drag-handle.tsx`)
   - Renders drag handles for each block
   - Uses Pragmatic Drag and Drop for dragging
   - Serializes block data for cross-tab dragging

2. **BlockDropTarget Component** (`components/block-drop-target.tsx`)
   - Renders drop zones between blocks
   - Handles drop events
   - Inserts blocks at drop position

3. **Tiptap Extension** (`lib/tiptap/custom-drag-handle.ts`)
   - ProseMirror plugin that renders drag handles
   - Uses ProseMirror decorations API
   - Integrates with React components

### Data Flow

```
User drags block handle
  ↓
BlockDragHandle.getInitialData()
  ↓
Serialize block to BlockDragData (ProseMirror JSON)
  ↓
Pragmatic Drag and Drop handles drag
  ↓
Drop on target (same editor or different tab)
  ↓
BlockDropTarget.onDrop()
  ↓
Insert block at target position
  ↓
Remove block from source (if different file)
```

## Implementation Steps

### Phase 1: Remove Tiptap GlobalDragHandle
- [ ] Remove `GlobalDragHandle` from extensions
- [ ] Remove related CSS (if any)
- [ ] Update comments/documentation

### Phase 2: Create Block Drag Handle System

#### 2.1 Create BlockDragData Type
- [ ] Add `BlockDragData` interface to `components/tab-system.tsx`
  ```typescript
  export interface BlockDragData {
    type: "block";
    content: unknown; // ProseMirror JSON node
    sourcePath: string;
    blockPos: number;
    blockType: string;
  }
  ```

#### 2.2 Create BlockDragHandle Component
- [ ] Create `components/block-drag-handle.tsx`
- [ ] Implement drag handle rendering
- [ ] Integrate with Pragmatic Drag and Drop
- [ ] Serialize block data using ProseMirror API

#### 2.3 Create Tiptap Extension for Drag Handles
- [ ] Create `lib/tiptap/custom-drag-handle.ts`
- [ ] Use ProseMirror Plugin with decorations
- [ ] Render drag handles for each top-level block
- [ ] Position handles correctly (left side of blocks)

### Phase 3: Implement Drop Targets

#### 3.1 Create BlockDropTarget Component
- [ ] Create `components/block-drop-target.tsx`
- [ ] Render drop zones between blocks
- [ ] Handle drop events using Pragmatic Drag and Drop
- [ ] Show visual feedback during drag

#### 3.2 Add Drop Zones to Editor
- [ ] Integrate drop targets into editor
- [ ] Position drop zones between blocks
- [ ] Handle drop at beginning/end of document

### Phase 4: Implement Block Insertion Logic

#### 4.1 Same-Editor Block Reordering
- [ ] Detect drop within same editor
- [ ] Remove block from original position
- [ ] Insert block at new position
- [ ] Update editor state

#### 4.2 Cross-Tab Block Dragging
- [ ] Detect drop on different tab/file
- [ ] Get target editor instance
- [ ] Insert block into target editor
- [ ] Remove block from source editor
- [ ] Update both files

#### 4.3 Update EditorView Component
- [ ] Add `onDropBlock` handler
- [ ] Integrate with block management system
- [ ] Handle file updates

### Phase 5: Update Tab System

#### 5.1 Add Block Drop Support to Tabs
- [ ] Update `TabSystem` component
- [ ] Add `onDropBlock` prop
- [ ] Handle block drops on tabs
- [ ] Switch to target tab on hover

#### 5.2 Update EditorView
- [ ] Add `handleDropBlock` callback
- [ ] Integrate with file system operations
- [ ] Handle cross-file block moves

### Phase 6: Polish & Testing

#### 6.1 Visual Feedback
- [ ] Add drag preview
- [ ] Show drop indicators
- [ ] Animate block insertion
- [ ] Handle edge cases (empty document, etc.)

#### 6.2 Error Handling
- [ ] Handle invalid drops
- [ ] Handle file system errors
- [ ] Handle editor state errors
- [ ] Add user-friendly error messages

#### 6.3 Testing
- [ ] Test same-editor reordering
- [ ] Test cross-tab dragging
- [ ] Test cross-file dragging
- [ ] Test with different block types
- [ ] Test edge cases

## Technical Details

### ProseMirror Integration

**Getting Block Positions:**
```typescript
const { state } = editor;
const $pos = state.doc.resolve(pos);
const blockNode = $pos.parent;
const blockPos = $pos.start($pos.depth);
```

**Serializing Blocks:**
```typescript
const blockJson = blockNode.toJSON();
```

**Inserting Blocks:**
```typescript
const tr = state.tr;
const node = state.schema.nodeFromJSON(blockJson);
tr.insert(pos, node);
editor.view.dispatch(tr);
```

**Removing Blocks:**
```typescript
const tr = state.tr;
tr.delete(blockPos, blockPos + blockNode.nodeSize);
editor.view.dispatch(tr);
```

### Pragmatic Drag and Drop

**Draggable Setup:**
```typescript
draggable({
  element: handleElement,
  getInitialData: () => blockDragData,
  onDragStart: () => { /* show preview */ },
  onDrop: () => { /* cleanup */ },
});
```

**Drop Target Setup:**
```typescript
dropTargetForElements({
  element: dropZoneElement,
  canDrop: ({ source }) => source.data.type === "block",
  onDrop: ({ source }) => { /* insert block */ },
});
```

## Open Questions

1. **Block Selection**: Should we support dragging multiple blocks at once?
2. **Nested Blocks**: How should we handle dragging nested structures (lists, blockquotes)?
3. **Undo/Redo**: How should block moves interact with undo/redo?
4. **Performance**: Will rendering handles for every block impact performance?
5. **Accessibility**: How should keyboard users interact with block dragging?

## Success Criteria

- ✅ Blocks can be reordered within the same editor
- ✅ Blocks can be dragged between tabs
- ✅ Blocks can be dragged between different files
- ✅ Visual feedback is clear and intuitive
- ✅ No conflicts with text selection dragging
- ✅ Performance is acceptable with many blocks
- ✅ Works with all block types (paragraphs, headings, lists, etc.)

## Future Enhancements

- Multi-block selection and dragging
- Drag handles for nested structures
- Keyboard shortcuts for block movement
- Block templates/library
- Drag to create new files

## References

- [Pragmatic Drag and Drop Docs](https://github.com/atlassian/pragmatic-drag-and-drop)
- [Tiptap Drag Handle Extension](https://tiptap.dev/docs/editor/extensions/functionality/drag-handle-react)
- [ProseMirror Decorations](https://prosemirror.net/docs/ref/#view.Decoration)
- [ProseMirror Transactions](https://prosemirror.net/docs/ref/#state.Transaction)

