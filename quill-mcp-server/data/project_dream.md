# Quill: The Dream

> *A writing tool that thinks like a musician's workstation*

---

## The Core Insight

Writers don't think linearly. They oscillate between:
- **Capturing fragments** — a line of dialogue, a scene idea, a character moment
- **Grouping them** — this goes with that, these form a chapter
- **Reorganizing** — no, this scene comes *before* that one
- **Building structure** — the skeleton reveals itself
- **Returning to the blank page** — back to flow

Traditional writing tools force linear thinking. Scrivener is powerful but complex. Notion is flexible but not built for narrative. Google Docs is... a word processor.

**Quill is a DAW for writers.**

---

## The DAW Metaphor

In Ableton Live:
- The **Session View** is for jamming — throw clips around, experiment
- The **Arrangement View** is for structure — sequence the final piece
- **Automation lanes** hold the invisible magic — tempo, effects, mixing

In Quill:
- **Idea Buckets** are Session View — capture fragments, reorder freely
- **Arrangement View** is the manuscript — scenes in order, chapters stacked
- **Embeddings + metadata** are automation — invisible, but power the intelligence

Musicians don't write songs top-to-bottom. They loop, layer, cut, paste, remix.

Writers should work the same way.

---

## What Makes Quill Different

### 1. Modular Writing

Any block → any bucket → any chapter → any scene → any order.

Write a scene. Drag it out. Put it in the "ideas" pile. Work on something else. Come back. Drag it into Chapter 7. Move it to Chapter 3. The writing is *modular*.

### 2. Intelligence Underneath

Every block silently accumulates metadata:
- **Who's in this scene?** (character extraction)
- **Where is this?** (location tagging)
- **What's the mood?** (tone classification)
- **Where in the story arc?** (setup/conflict/resolution)
- **Whose perspective?** (POV detection)

You never see this. But then you ask:

> "Show me every scene where Evelyn is alone and the mood is tense."

And Quill finds them all.

### 3. Sacred Writing Space

The editor is *clean*. No metadata panels. No tag clouds. No analytics. No distraction.

All the power lives in the sidebar and command palette. You summon it when you need it. Otherwise, you're just you and the words.

### 4. Structural Visualization

Zoom out. See your novel as a timeline. Colored by POV. Sized by word count. Grouped by chapter.

Drag a scene. The whole structure updates.

This is the "God view" that Scrivener hints at but never fully delivers.

---

## The Minimum Lovable Product

Before embeddings. Before AI. Before the App Store.

The MLP is:
1. **Open a folder** — your novel lives in plain Markdown files
2. **See the structure** — folder tree, collapsible
3. **Edit beautifully** — Novel editor, blocks, slash commands
4. **Reorganize** — drag files, drag blocks
5. **Multiple files open** — tabs, like a code editor
6. **Themes** — because writers care about aesthetics

This alone is valuable. This alone is shippable.

---

## The Intelligence Roadmap

### Stage 1: Metadata Extraction (local)
- Parse character names from dialogue attribution
- Detect locations from scene-setting paragraphs
- Classify mood from vocabulary distribution

### Stage 2: Embeddings (cloud)
- Generate embeddings for each block/scene
- Store in pgvector
- Enable semantic search

### Stage 3: AI Organization
- "Cluster similar ideas"
- "Suggest scene order based on timeline"
- "Find continuity errors"
- "Auto-outline the next chapter from unused fragments"

### Stage 4: AI Collaboration
- "Expand this outline into a scene"
- "Write dialogue in [character]'s voice"
- "Suggest what happens next"

Each stage is optional. Each stage adds value. No stage requires previous adoption.

---

## The Mobile Story

Writers write everywhere. On the train. In bed. At the café.

The web app should feel native on mobile:
- Sidebars collapse into hamburgers
- Editor goes full-screen
- Touch targets are large
- Fonts are readable
- Offline works

Capacitor wraps this as an iOS app. Same code. Same experience. App Store approved.

---

## The Long-Term Vision

### Character Relationship Graphs
Visual maps of who knows whom, who loves whom, who killed whom. Clickable. Filterable. Connected to scenes where relationships evolve.

### Timeline Visualization
A horizontal timeline. Plot events placed on it. Zoom in, zoom out. See the whole story. See a single day.

### Collaboration
Real-time co-editing with CRDTs. No conflicts. Comments and suggestions. "Track changes" that actually makes sense for creative work.

### Export
One click to manuscript format. DOCX for agents. EPUB for self-publishing. PDF for printing. Consistent, beautiful, ready.

---

## Why This Matters

Writing is hard. The tools shouldn't make it harder.

Every writer has felt the pain of:
- Losing track of a scene they wrote weeks ago
- Forgetting a character's eye color (and contradicting themselves)
- Staring at a linear document when the story isn't linear
- Fighting their tool instead of trusting it

Quill is for the writer who thinks in fragments. Who structures later. Who wants the machine to help without getting in the way.

Quill is the writing tool I wish existed.

So I'm building it.

---

*The dream continues in code.*
