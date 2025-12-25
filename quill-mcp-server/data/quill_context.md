# Quill Technical Reference

> **Purpose**: Deep-dive technical details for architecture, mobile strategy, and DevOps. Reference this for implementation decisions.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Frontend Stack](#frontend-stack)
3. [Mobile Strategy](#mobile-strategy)
4. [Monorepo Structure](#monorepo-structure)
5. [Backend Architecture](#backend-architecture)
6. [CI/CD Pipeline](#cicd-pipeline)
7. [Responsive Design](#responsive-design)

---

## Architecture Overview

### Current State (MVP)

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js App (Web)                    │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ Folder       │  │ Tab System   │  │ Editor View  │   │
│  │ Sidebar      │  │              │  │ (Novel)      │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
├─────────────────────────────────────────────────────────┤
│  Project Provider (Context) ← useProject, useFolderTree │
├─────────────────────────────────────────────────────────┤
│  File System Access API (lib/filesystem/)               │
└─────────────────────────────────────────────────────────┘
                           ↓
              User's Local Filesystem (Markdown)
```

### Future State (Full Product)

```
┌─────────────────────────────────────────────────────────┐
│                    apps/web (Next.js)                   │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ Workspace    │  │ Arrangement  │  │ Command      │   │
│  │ Sidebar      │  │ View         │  │ Palette      │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
├─────────────────────────────────────────────────────────┤
│  packages/core (Document models, CRDT, embeddings)      │
├─────────────────────────────────────────────────────────┤
│  packages/ui (shadcn components, themes)                │
└─────────────────────────────────────────────────────────┘
        ↓                                    ↓
   Local Storage                    Cloud (Neon + pgvector)
   (IndexedDB)                      (Supabase Auth)
```

---

## Frontend Stack

### Core Dependencies

| Package | Purpose |
|---------|---------|
| `next` | React framework with App Router |
| `novel` | Notion-like Tiptap editor |
| `@radix-ui/*` | Accessible UI primitives (via shadcn) |
| `tailwindcss` | Utility-first CSS |
| `zustand` (planned) | Client state management |
| `dnd-kit` or `@atlaskit/pragmatic-drag-and-drop` | Drag-and-drop |

### shadcn/ui Components

Components are copied into `components/ui/`. Current usage:
- `button.tsx`
- `card.tsx`
- `select.tsx`

Add new components via:
```bash
npx shadcn-ui@latest add [component-name]
```

### Theme System

- Dark/light mode via `next-themes`
- Editor subthemes defined in `theme/themes.ts`
- CSS variables in `globals.css` for consistent theming

---

## Mobile Strategy

### Recommended Path: Capacitor

**Why Capacitor over React Native:**
- Fastest path to App Store
- Reuse 100% of shadcn UI
- No component rewrites
- Tiptap is web-only anyway
- Notion uses this approach

**How it works:**
1. Next.js builds to static/SSR output
2. Capacitor syncs build into iOS Xcode project
3. App runs in WKWebView with native API access
4. Native features via Capacitor plugins (file picker, share sheet, etc.)

### App Store Requirements

Apple checks for:
- ✅ Not just a website wrapper (rich editor with native features)
- ✅ Usable offline state
- ✅ No broken routes
- ✅ Settings/about page
- ✅ Privacy declarations

For a writing app specifically:
- First-launch onboarding screen
- "New Document" CTA
- Offline document storage
- Sync doesn't break in airplane mode

### Capacitor Setup

```bash
# Initialize Capacitor
npx cap init "Quill" "com.quill.writer"

# Add iOS platform
npx cap add ios

# Sync web build to native project
npx cap sync ios

# Open in Xcode
npx cap open ios
```

---

## Monorepo Structure

### Target Structure

```
quill/
├── apps/
│   ├── web/                # Next.js app
│   │   ├── app/
│   │   ├── components/
│   │   └── package.json
│   └── mobile/             # Capacitor shell
│       ├── ios/
│       ├── android/
│       └── capacitor.config.ts
├── packages/
│   ├── core/               # Shared business logic
│   │   ├── src/
│   │   │   ├── models/     # Document, Block, Scene types
│   │   │   ├── crdt/       # Y.js or Automerge sync
│   │   │   ├── storage/    # Abstract persistence layer
│   │   │   └── embeddings/ # Metadata extraction
│   │   └── package.json
│   ├── ui/                 # Shared UI components
│   │   ├── src/
│   │   │   ├── components/ # shadcn components
│   │   │   └── themes/     # Theme definitions
│   │   └── package.json
│   └── lib/                # Shared utilities
│       ├── src/
│       └── package.json
├── package.json            # Workspace root
├── pnpm-workspace.yaml
└── tsconfig.json           # Base TypeScript config
```

### Workspace Configuration

**pnpm-workspace.yaml:**
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**Root package.json:**
```json
{
  "name": "quill",
  "private": true,
  "workspaces": ["apps/*", "packages/*"]
}
```

### Cross-Package Imports

From apps/web:
```typescript
import { DocumentModel } from "@quill/core";
import { Button } from "@quill/ui";
import { formatDate } from "@quill/lib";
```

---

## Backend Architecture

### Technology Stack (Future)

| Component | Technology | Purpose |
|-----------|------------|---------|
| Database | Neon (Postgres) | Document storage, metadata |
| Vector Store | pgvector extension | Semantic search embeddings |
| Auth | Supabase or Clerk | User accounts, sessions |
| API | Next.js Route Handlers / TRPC | Type-safe API layer |
| Cache | Upstash Redis | Hot data, recent blocks |
| File Storage | Vercel Blob / S3 | Larger assets |

### Embeddings Pipeline

```
Block Created/Updated
        ↓
Background API Route (/api/embed)
        ↓
OpenAI Embeddings API (text-embedding-3-small)
        ↓
Store in pgvector (1536 dimensions)
        ↓
Available for semantic search
```

### Metadata Extraction

For each block, extract:
- **Characters**: Named entities with dialogue attribution
- **Locations**: Scene-setting nouns and phrases
- **Mood/Tone**: Vocabulary distribution analysis
- **Plot Phase**: setup/conflict/rising/climax/resolution classification
- **POV**: First/third person, narrator identification

---

## CI/CD Pipeline

### Web Deployment (Vercel)

```yaml
# Automatic on git push
main branch → Production
PR branches → Preview deployments
```

### iOS Deployment (GitHub Actions)

```yaml
name: iOS Build

on:
  push:
    branches: [main]
    paths: ['apps/web/**', 'apps/mobile/**', 'packages/**']

jobs:
  build-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        
      - name: Install dependencies
        run: pnpm install
        
      - name: Build web app
        run: pnpm --filter @quill/web build
        
      - name: Sync Capacitor
        run: pnpm --filter @quill/mobile cap sync ios
        
      - name: Build Xcode archive
        run: |
          xcodebuild -workspace apps/mobile/ios/App/App.xcworkspace \
            -scheme App \
            -configuration Release \
            -archivePath build/App.xcarchive \
            archive
            
      - name: Export IPA
        run: |
          xcodebuild -exportArchive \
            -archivePath build/App.xcarchive \
            -exportOptionsPlist exportOptions.plist \
            -exportPath build
            
      - name: Upload to TestFlight
        run: fastlane deliver --ipa build/App.ipa --skip_metadata --skip_screenshots
        env:
          FASTLANE_APPLE_ID: ${{ secrets.APPLE_ID }}
          FASTLANE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
```

### Required Secrets

- `APPLE_ID`: Apple Developer account email
- `APPLE_PASSWORD`: App-specific password for Fastlane
- Code signing certificates (stored in GitHub secrets or match)

---

## Responsive Design

### Tailwind Breakpoints

```css
/* Mobile first approach */
sm: 640px   /* Large phones */
md: 768px   /* Tablets */
lg: 1024px  /* Laptops */
xl: 1280px  /* Desktops */
2xl: 1536px /* Large screens */
```

### Layout Behavior

| Breakpoint | Sidebar | Tabs | Editor |
|------------|---------|------|--------|
| `xs` (<640px) | Hidden (hamburger) | Hidden | Full screen |
| `sm` (640px) | Hamburger menu | Horizontal scroll | Full width |
| `md` (768px) | Collapsible (closed default) | Visible | Flexible |
| `lg` (1024px+) | Always visible | Visible | Flexible |

### Component Pattern

```tsx
<div className="
  hidden lg:block           // Desktop: visible
  md:hidden                 // Tablet: hidden
">
  {/* Sidebar */}
</div>

<button className="
  lg:hidden                 // Desktop: hidden
  block                     // Mobile: visible
">
  {/* Hamburger toggle */}
</button>
```

### Touch Optimization

- Minimum tap target: 44x44px
- No hover-dependent interactions on mobile
- Swipe gestures for sidebar toggle
- Pull-to-refresh where appropriate

---

## Performance Considerations

### Editor Performance

- Novel/Tiptap handles virtualization internally
- Large documents should use lazy block loading
- Avoid re-rendering entire document on state changes

### Bundle Size

- Tree-shake unused shadcn components
- Dynamic imports for heavy features (arrangement view, graphs)
- Lazy load themes and fonts

### Offline First

- LocalForage for client-side document caching
- Service worker for static asset caching
- Optimistic updates with eventual sync

---

*This document is the technical source of truth for Quill implementation details.*
