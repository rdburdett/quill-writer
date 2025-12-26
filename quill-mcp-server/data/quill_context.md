# Quill Technical Reference

> **Purpose**: Deep-dive technical details for architecture, mobile strategy, and DevOps. Reference this for implementation decisions.

---

## Table of Contents

1. [Vision & Core Concepts](#vision--core-concepts)
2. [Architecture Overview](#architecture-overview)
3. [Frontend Stack](#frontend-stack)
4. [Mobile Strategy](#mobile-strategy)
5. [Monorepo Structure](#monorepo-structure)
6. [Backend Architecture](#backend-architecture)
7. [CI/CD Pipeline](#cicd-pipeline)
8. [Responsive Design](#responsive-design)

---

## Vision & Core Concepts

### Primary Inspiration: Digital Audio Workstations (DAWs)

Quill's core vision is to bring the robust organizational and workflow features from professional DAWs like **Ableton Live** into a writing environment. This DAW-inspired approach, combined with deep AI integration (similar to modern IDEs like Cursor), creates a transformative writing experience.

### Two Main Views

1. **Clean Writing Space**: Distraction-free editor for focused composition
2. **Grid-Based Arrangement View**: Ableton Session View-inspired timeline where users can:
   - Color-code writing blocks
   - Arrange blocks chronologically (vertical axis)
   - Stack blocks horizontally for mixing/composition
   - Drag blocks from browser panel (sample library) into arrangement

### Browser Panel (Sample Library)

Unsorted writing blocks are collected in a browser panel, functioning like a producer's sample library:
- Drag ideas from browser into arrangement
- Organize loose thoughts, fragments, and bullet points
- Quick access to reusable content

### File Format & Portability

**Project Structure:**
- Simple, familiar text file formats (Markdown, plain text)
- Main project file contains:
  - Organizational metadata
  - Timeline positions of text "clips"
  - Block relationships and structure
  - Color coding and naming
  - Automation curves
  - Style fingerprints and personas

**Portability Goals:**
- Users can back up and open work in other environments (Microsoft Word, Google Docs)
- Share project folders via email to other Quill users
- All information necessary to reopen project contained within project folder
- No cloud dependency for core functionality

### Block System

- **Hierarchical Blocks**: Small blocks can be grouped into larger blocks
- **Drag & Drop**: Move blocks between folders, arrangement, and browser
- **Visual Organization**: Color-code and rename blocks
- **Click-to-Preview**: Clicking a block in arrangement reveals editable preview
- **Locked Content**: Some blocks can be marked as immutable/preserved

### Arrangement View Axes

- **Vertical Axis**: Chronological order of clips (timeline progression)
- **Horizontal Axis**: Stacking for mixing/composition
  - Multiple blocks can be stacked horizontally
  - "Mix down" by writer or LLM
  - Supports locked content preservation
  - Handles fragmented ideas and bullet points

### Automations (DAW-Style)

Like DAW automation curves, users can draw automations that control:
- **Tension**: Intended tension levels in sections
- **Pacing**: Narrative pacing parameters
- **Mood**: Emotional tone throughout story

**Use Cases:**
- Guide text generation when "mixing" clips to master document
- Trigger suggestions nudging writer to reconsider tone
- Visual representation of narrative arc

### Reroll Feature

- Stack a cluster of text blocks
- Generate multiple composition variations
- Save and scroll between different versions
- Compare alternative arrangements

### Metadata & Intelligent Search

**Auto-Generated Metadata:**
- Characters (with dialogue attribution)
- Locations and settings
- Mood/tone analysis
- Plot phase classification
- POV identification
- Style metrics (gloomy, cynical, highly descriptive, dialogue-heavy, etc.)

**Search Capabilities:**
- Natural language queries: "Find all passages where Mark talks to Susan"
- Tag-based filtering
- Cross-reference multiple tags

**Visual Tag Filtering:**
- Click tag(s) to filter timeline
- Grey out clips not related to selected tags
- Highlight clips matching tag criteria

### Intelligent Notifications

AI-powered guidance for writers:
- "John has been missing from the story for over 2,000 words. Is this intentional?"
- Continuity checks
- Character presence tracking
- Pacing suggestions

### Writing Style Fingerprinting

**Personalized Embeddings:**
- Form a fingerprint of writer's style through usage
- Enable LLM assistive generation that feels natural and on-brand
- Capture writing patterns and preferences

**Writing Personas:**
- Manage multiple writing personas for versatile writers
- Switch between different tones/styles
- Writers can interact with their personalized embedding

**Style Metrics:**
- Auto-detected tags based on recognized patterns:
  - "gloomy, cynical, highly descriptive, dialogue-heavy"
  - Vocabulary distribution
  - Sentence structure patterns
  - Dialogue vs. narrative ratios

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

## Arrangement View (DAW-Inspired)

### Layout Structure

The Arrangement View is modeled after Ableton Live's Session View:

```
┌─────────────────────────────────────────────────────────┐
│  Browser Panel (Sample Library)                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                   │
│  │Block │ │Block │ │Block │ │Block │  ...               │
│  └──────┘ └──────┘ └──────┘ └──────┘                   │
├─────────────────────────────────────────────────────────┤
│  Arrangement Timeline                                    │
│  Row 0: [Block A] [Block B] [Block C]                  │
│  Row 1:        [Block D] [Block E]                      │
│  Row 2: [Block F]                                        │
│  Row 3: [Block G] [Block H] [Block I]                   │
│         ↑                                                │
│    Vertical = Chronological                              │
│    Horizontal = Stacking/Mixing                          │
└─────────────────────────────────────────────────────────┘
```

### Vertical Axis (Chronological)

- Each row represents a point in the narrative timeline
- Blocks are ordered top-to-bottom by story progression
- Scrolling vertically navigates through story time
- Can insert rows to add new chronological positions

### Horizontal Axis (Stacking/Mixing)

- Multiple blocks can occupy the same horizontal position
- Stacked blocks represent alternative versions or parallel threads
- "Mix down" operation combines stacked blocks:
  - Writer manually selects/edits combination
  - LLM generates coherent blend based on automations
- Supports locked content preservation during mixing

### Block Interactions

- **Color Coding**: Visual organization (characters, scenes, themes)
- **Renaming**: Descriptive names for quick identification
- **Click-to-Preview**: Click block to see editable content preview
- **Drag & Drop**: Move blocks between rows, columns, and browser
- **Grouping**: Small blocks → larger blocks (scenes, chapters)

### Browser Panel Integration

- Drag blocks from browser into arrangement
- Drag blocks from arrangement back to browser
- Browser acts as "sample library" for reusable content
- Supports fragmented ideas, bullet points, and locked content

---

## Automations (DAW-Style)

### Concept

Like DAW automation curves, users can draw parameter curves that control narrative elements throughout the story.

### Supported Parameters

- **Tension**: Intended tension levels (0.0 - 1.0)
- **Pacing**: Narrative pacing (slow, medium, fast)
- **Mood**: Emotional tone (gloomy, optimistic, tense, etc.)

### Automation Interface

- Draw curves directly on timeline
- X-axis: Story position (word count or chronological position)
- Y-axis: Parameter value
- Bezier curves for smooth transitions
- Keyframe editing for precise control

### Use Cases

1. **Guide LLM Generation**: When mixing stacked blocks, automations inform AI about desired tension/pacing/mood
2. **Suggestions**: System can suggest tone adjustments based on automation curves
3. **Visual Feedback**: Visualize narrative arc and pacing
4. **Consistency**: Maintain consistent pacing across long-form works

### Implementation

- Stored in `project.json` as curve data
- Real-time visualization in Arrangement View
- Accessible to LLM during generation
- Can be exported/imported between projects

---

## Reroll Feature

### Concept

Generate multiple composition variations from a cluster of stacked blocks, allowing writers to explore different narrative arrangements.

### Workflow

1. **Select Blocks**: Stack multiple blocks horizontally in Arrangement View
2. **Generate Variations**: Click "Reroll" to generate N alternative compositions
3. **Save Versions**: Each variation saved as separate version
4. **Compare**: Scroll between versions to compare alternatives
5. **Select Best**: Choose preferred version or continue iterating

### Generation Parameters

- Respects automation curves (tension, pacing, mood)
- Uses writer's style fingerprint for consistency
- Preserves locked content
- Can blend dialogue, narrative, and fragmented ideas

### Version Management

- Each reroll creates a new version snapshot
- Versions are stored in project file
- Can revert to previous versions
- Compare versions side-by-side

---

## Intelligent Notifications

### Purpose

AI-powered guidance to help writers maintain consistency, continuity, and narrative flow.

### Notification Types

1. **Character Presence**: "John has been missing from the story for over 2,000 words. Is this intentional?"
2. **Continuity Checks**: "Mark's eye color changed from blue to brown. Is this intentional?"
3. **Pacing Alerts**: "Tension has been low for 3,000 words. Consider adding conflict?"
4. **Tag Suggestions**: "This passage might involve 'tension' and 'character:Susan'. Add tags?"
5. **Style Consistency**: "This block's style differs significantly from your usual tone."

### Implementation

- Background analysis of project metadata
- Word count tracking per character/scene
- Style fingerprint comparison
- Configurable thresholds and sensitivity
- Non-intrusive UI (toast notifications, sidebar alerts)

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

**Block-Level Embeddings:**
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

**Style Fingerprint Embeddings:**
```
Writer Usage Patterns
        ↓
Aggregate writing samples
        ↓
Generate style embedding (text-embedding-3-small)
        ↓
Store per-persona fingerprint
        ↓
Use for personalized LLM generation
```

**Use Cases:**
- Semantic search: "Find all passages where Mark talks to Susan"
- Style-consistent AI generation
- Similarity matching for block suggestions
- Continuity detection

### Metadata Extraction

For each block, extract:
- **Characters**: Named entities with dialogue attribution
- **Locations**: Scene-setting nouns and phrases
- **Mood/Tone**: Vocabulary distribution analysis
- **Plot Phase**: setup/conflict/rising/climax/resolution classification
- **POV**: First/third person, narrator identification
- **Style Metrics**: Auto-detected writing style characteristics:
  - Tone descriptors (gloomy, cynical, optimistic, etc.)
  - Descriptive density (highly descriptive, sparse, etc.)
  - Dialogue ratio (dialogue-heavy, narrative-heavy, balanced)
  - Sentence structure patterns
  - Vocabulary complexity

### Project File Format

**Structure:**
```
project-folder/
├── project.json          # Main project file with metadata
├── blocks/
│   ├── block-001.md      # Individual text blocks
│   ├── block-002.md
│   └── ...
├── scenes/
│   └── scene-001.md      # Scene containers
└── chapters/
    └── chapter-001.md    # Chapter containers
```

**project.json Schema:**
```json
{
  "version": "1.0",
  "blocks": [
    {
      "id": "block-001",
      "file": "blocks/block-001.md",
      "position": { "row": 0, "column": 0 },
      "color": "#FF5733",
      "name": "Opening Scene",
      "locked": false,
      "tags": ["character:Mark", "location:coffee-shop"],
      "metadata": {
        "characters": ["Mark", "Susan"],
        "locations": ["coffee-shop"],
        "mood": "tense",
        "style": ["dialogue-heavy", "descriptive"]
      }
    }
  ],
  "automations": [
    {
      "parameter": "tension",
      "curve": [[0, 0.2], [1000, 0.8], [2000, 0.5]],
      "unit": "words"
    }
  ],
  "styleFingerprint": {
    "persona": "default",
    "metrics": {
      "tone": ["cynical", "descriptive"],
      "dialogueRatio": 0.45,
      "avgSentenceLength": 18.5
    },
    "embedding": "base64-encoded-vector"
  },
  "timeline": {
    "clips": [
      { "blockId": "block-001", "start": 0, "end": 500 }
    ]
  }
}
```

**Portability:**
- Text files are standard Markdown/plain text (openable in any editor)
- Project file is JSON (human-readable, version-controllable)
- All organizational data self-contained in project folder
- Shareable via email, cloud storage, or version control

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
