# Quill: Getting Started for Developers & Agents

> **Purpose**: Quick reference for anyone (human or AI) picking up development on Quill.

---

## Quick Start

```bash
# Clone and install
git clone https://github.com/[your-repo]/quill-writer.git
cd quill-writer
pnpm install

# Start development server
pnpm dev

# Open http://localhost:3000
```

---

## Project Structure

```
quill-writer/
├── app/                    # Next.js App Router
│   ├── page.tsx            # Main editor page
│   ├── settings/page.tsx   # Settings page
│   ├── layout.tsx          # Root layout
│   └── globals.css         # Global styles + CSS variables
├── components/
│   ├── editor-view.tsx     # Editor container component
│   ├── folder-sidebar.tsx  # File tree sidebar
│   ├── novel-editor.tsx    # Tiptap editor wrapper
│   ├── project-provider.tsx # Project context provider
│   ├── project-welcome.tsx # Welcome/onboarding screen
│   ├── tab-system.tsx      # Multi-file tab bar
│   ├── theme-provider.tsx  # Theme context (next-themes)
│   ├── theme-toggle.tsx    # Dark/light toggle
│   ├── theme/              # Theme-related components
│   ├── settings/           # Settings page components
│   └── ui/                 # shadcn/ui components
├── hooks/
│   ├── use-project.ts      # Project state hook
│   ├── use-folder-tree.ts  # Folder navigation hook
│   ├── use-editor-settings.ts # Editor preferences
│   ├── use-subtheme.ts     # Editor subtheme hook
│   └── use-block.ts        # Block manipulation hook
├── lib/
│   ├── filesystem/         # File System Access API
│   │   ├── index.ts        # Exports
│   │   ├── scanner.ts      # Directory scanning
│   │   ├── watcher.ts      # File change detection
│   │   └── writer.ts       # File writing
│   ├── project/
│   │   ├── loader.ts       # Project loading logic
│   │   └── types.ts        # Project type definitions
│   └── utils.ts            # Utility functions (cn, etc.)
├── theme/
│   └── themes.ts           # Editor subtheme definitions
├── types/
│   ├── file-system-access.d.ts  # FS API type declarations
│   └── novel.d.ts          # Novel editor type declarations
└── quill-mcp-server/       # MCP context server
    └── data/               # Project context files
        ├── context_capsule.md   # Main context (for agents)
        ├── project_dream.md     # Vision document
        ├── quill_context.md     # Technical reference
        ├── roadmap.json         # Development roadmap
        └── decisions.json       # Architectural decisions
```

---

## Key Files to Know

| File | Purpose |
|------|---------|
| `components/project-provider.tsx` | React context for project state |
| `components/folder-sidebar.tsx` | File tree navigation |
| `components/novel-editor.tsx` | The main writing editor |
| `components/tab-system.tsx` | Multi-file tab management |
| `lib/filesystem/scanner.ts` | Scans local directories |
| `theme/themes.ts` | Editor subtheme definitions |

---

## Development Workflow

### For AI Agents

1. **Read context first**:
   - `quill-mcp-server/data/context_capsule.md` — Architecture & principles
   - `quill-mcp-server/data/roadmap.json` — Current progress
   - `quill-mcp-server/data/decisions.json` — Key decisions

2. **Find next task**:
   - Look for `"status": "in-progress"` or `"status": "planned"` milestones

3. **Follow patterns**:
   - Use existing component structure
   - Use shadcn/ui for new UI elements
   - Put business logic in hooks or lib/
   - No inline styles or DOM mutation

4. **Update status**:
   - Mark milestones complete in roadmap.json
   - Add new decisions to decisions.json if needed

### Common Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm lint             # Run ESLint

# Add shadcn component
npx shadcn-ui@latest add button

# Type checking
pnpm tsc --noEmit
```

---

## Current State (as of December 2024)

### ✅ Completed

- [x] Clean React-based UI architecture
- [x] File Browser (Folder Sidebar) with File System Access API
- [x] Novel Editor integration (Tiptap-based)
- [x] Tab System for multi-file editing
- [x] Theme system with dark/light modes
- [x] Editor subthemes (customizable writing themes)
- [x] Settings page (font, tab size)
- [x] Project context provider

### 🔄 In Progress

- [ ] Responsive layout (mobile/tablet breakpoints)
- [ ] Panel collapsibility

### ⬜ Next Up

- [ ] Workspace Sidebar (Ideas, Chapters, Scenes)
- [ ] Command Palette
- [ ] Arrangement View

---

## Coding Conventions

### TypeScript

- Strict mode enabled
- Prefer explicit types over `any`
- Interfaces in `types/` for shared types
- Inline types for component-specific props

### React

- Functional components only
- Custom hooks for reusable logic
- Context for global state
- No class components

### Styling

- Tailwind CSS only
- No inline styles
- Use `cn()` utility for conditional classes
- CSS variables in `globals.css` for theming

### File Naming

- Components: `kebab-case.tsx` (e.g., `folder-sidebar.tsx`)
- Hooks: `use-kebab-case.ts` (e.g., `use-project.ts`)
- Types: `kebab-case.ts` or inline

---

## Adding a New Feature

### 1. Create the component

```tsx
// components/my-feature.tsx
"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MyFeatureProps {
  className?: string;
}

export function MyFeature({ className }: MyFeatureProps) {
  return (
    <div className={cn("p-4", className)}>
      <Button>Click me</Button>
    </div>
  );
}
```

### 2. Create a hook if needed

```tsx
// hooks/use-my-feature.ts
import { useState, useCallback } from "react";

export function useMyFeature() {
  const [state, setState] = useState(null);
  
  const doSomething = useCallback(() => {
    // logic here
  }, []);
  
  return { state, doSomething };
}
```

### 3. Add to page/layout

```tsx
// app/page.tsx
import { MyFeature } from "@/components/my-feature";

export default function Page() {
  return (
    <div>
      <MyFeature />
    </div>
  );
}
```

---

## Troubleshooting

### File System Access API not working

- Only works in Chromium browsers (Chrome, Edge)
- Requires HTTPS or localhost
- User must grant permission via picker

### Novel editor issues

- Check `types/novel.d.ts` for type declarations
- Editor content is ProseMirror JSON format
- Use `useBlock` hook for block manipulation

### Theme not applying

- Check `ThemeProvider` is wrapping the app
- CSS variables must be defined in `globals.css`
- Use `next-themes` for dark/light mode

---

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Novel Editor](https://novel.sh)
- [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)

---

*Happy coding! When in doubt, check the context capsule.*
