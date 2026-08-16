# Project Dashboard — Features

This document provides a comprehensive map of all features in the Project Dashboard: the original vision, the currently built feature set, detailed feature specifications, and feature capabilities that are deferred for future consideration.

For architectural details, see `docs/Codebase.md`. For decision rationales and data shapes, see `docs/context.md` and `docs/Project_Dashboard_Design.md`. For code conventions, see `docs/CONVENTIONS.md`.

---

## 1. Original vision

The original goal of the Project Dashboard was to replace an unorganized Google Doc with a dedicated, local-first web application to track project ideas across categories (software, hardware, digital design) through their lifecycle.

- **Project Idea List** — List of all potential projects:
  - Organized into traits/categories (software, hardware, digital design, etc.).
  - Related ideas connected together (e.g. learning about AI → building an AI → building an AI agent using that self-built AI).
  - *Must haves:* description, vision for the end goal.
  - *Nice to haves:* list of components + costs, rough roadmap.
- **Project Status Tracker** — Tracks projects currently in progress:
  - Storage location reference (GitHub, KiCad, etc.).
  - Project timeline / roadmap, step-by-step implementation plan.
  - To-dos / next steps.
  - Research material being used.
  - **Archived Project Page**: Reason archived, blockers to resolve, and ability to unarchive once blockers are resolved.
- **Completed Project Page** — Shows all completed projects:
  - Accurate timeline of how long steps took and when they completed.
  - Finalized description suitable for sharing or linking on a personal site.
  - Next steps / ideas for building on the project.
  - Thoughts and insights gained during development.

---

## 2. Current feature set (built)

### Dashboard & Status Navigation
- **Status Tabs**: Filter project cards by lifecycle stage (`idea`, `planned`, `active`, `completed`, `archived`).
- **Trait Filter**: Searchable trait filter with multi-select chips and `ANY` (OR) / `ALL` (AND) matching mode toggle. Derived dynamically from active traits across all projects.
- **Card Grid**: Responsive grid displaying project cards with fiducial corner styling, title, one-line note or expanded description snippet, traits, and status tag.

### Frictionless Idea Capture
- **Quick-Capture Page (`/new`)**: Minimizes friction by asking only for a project title and a one-line note.
- **Organic Trait Tagging**: Optional traits can be attached at creation or added later.

### Status-Driven Field Visibility
Field availability expands additively as a project moves through its lifecycle (`idea → planned → active → archived / completed`), defined centrally in `lib/projectFieldConfig.js`:

| Field | Idea | Planned | Active | Archived | Completed |
|---|---|---|---|---|---|
| Name, one-line description | ✓ | ✓ | ✓ | ✓ | ✓ |
| Traits, links to other projects | optional | ✓ | ✓ | ✓ | ✓ |
| Expanded description, vision | | ✓ | ✓ | ✓ | ✓ |
| Technical specifications (diagram) | | ✓ | ✓ | ✓ | ✓ |
| Features (with nested sub-features) | | ✓ | ✓ | ✓ | ✓ |
| Initial roadmap / approach, research | | ✓ | ✓ | ✓ | ✓ |
| Components + costs, detailed roadmap | | optional | ✓ | ✓ | ✓ |
| Location | | | ✓ | ✓ | ✓ |
| Insights | | | ✓ | ✓ | ✓ |
| Reason archived, blockers | | | | ✓ | |
| Next steps | | | | | ✓ |

### Per-Field Independent Editing
- **Pencil Edit Pattern (`EditableField.js`)**: Plain text displays with a pencil icon (`✎`). Clicking opens an inline editing box with `✓ save` and `cancel` buttons.
- **No Global Save Button**: Each field saves independently via `PATCH /api/projects/[id]`, keeping client state aligned with server disk storage.

### Trait Management (`TraitPicker.js`)
- **Multi-Value Tagging**: Projects can carry any number of freeform traits (e.g., `["hardware", "software"]`).
- **Organic Vocabulary**: Known traits are dynamically derived from project data rather than a rigid enum.
- **Dual Visual Modes**: `inline` mode on detail pages (supports creating brand-new traits) and `compact` mode in dashboard filters (filters against existing traits).

### Features List (`FeaturesList.js`)
- **Nested Feature Hierarchy**: Bulleted list of feature items where each feature can contain nested sub-features.
- **Inline Display**: Features display as `Name - Description` (and `Sub-feature Name - Description`).
- **Collapsible Sub-Features**: Sub-feature containers collapse/expand to hide sub-items and add inputs when collapsed.
- **Drag-to-Reorder**: Native drag handles on features and sub-features with `e.stopPropagation()` event bubbling protection.
- **Inline Editing & Deletion**: Pencil icon opens inline inputs; `×` removes an entry or sub-entry.

### Research Entries (`ResearchList.js`)
- **Structured Entries**: List of research items with `{ id, name, link, description }`.
- **Unboxed Layout**: Renders directly on page layout without card container borders.
- **Clean Article Links**: Article Name acts as a clickable link hiding raw URLs when a link is supplied.
- **Indented Descriptions**: Description sits directly below the article title, indented to the right.
- **Early Stage Access**: Available from `planned` stage onward so research materials can be collected during initial planning.

### Interactive Roadmap & Auto-Timeline (`RoadmapTimeline.js`)
- **Vertical Timeline**: 3-state step status (`not_started`, `in_progress`, `done`) with progress bar reflecting step completion.
- **Nested Per-Step To-Dos**: Each step contains its own independently drag-reorderable mini to-do list with 3-state status.
- **Automated Step Behaviors**:
  - Setting a step to `in_progress` auto-expands its to-do list.
  - Completing all nested to-dos under a step auto-completes the parent step (one-directional; manual step completion is preserved).
- **Auto-Stamped Completion Dates**: Completing a step automatically stamps today's date into `completedDate` (unless already set/edited). Serves as the finished timeline when project reaches `completed` status.

### Components & Cost Tracking Table (`ComponentsTable.js`)
- **Structured Table Layout**: Columns for Component Name (clickable link when URL present), Price (strictly numeric or blank), Notes, and Actions.
- **Running Total Calculation**: Automatically sums numeric prices into a total row at the bottom of the table.
- **Whole-Row Editing**: Pencil opens all inputs for a row simultaneously to streamline editing.
- **Pinned Addition Row**: Pinned input row at bottom for quick entry.

### Technical Specifications Diagram (`DiagramSlot.js`)
- **Self-Contained HTML Diagram Upload**: Supports interactive HTML diagrams (draw.io exports recommended) stored as `data/diagrams/{id}.html`.
- **Isolated `<iframe>` Rendering**: Renders diagrams inside an isolated iframe via `/api/projects/[id]/diagram` to prevent script/style leakage.
- **15MB File Cap**: Generous cap for complex multi-page diagrams with embedded assets.
- **Independent Export Description (`diagramDescription`)**: Collapsible "+ add an export description" text field used exclusively for Markdown exports, preserving documentation clarity when raw HTML cannot be embedded.

### Project Locking & Lifecycle Gating
- **Immutable Completed Records**: Marking a project `completed` locks editing on all fields except `insights` and `nextSteps`.
- **Omitted Edit Affordances**: Locked fields omit pencils, add buttons, and drag handles completely to render clean read-only documents.
- **Confirmation Prompt**: Transitioning to `completed` requests explicit user confirmation.
- **Escape Hatch**: "Move back to active" button unlocks fields for edits when updates are needed.

### Markdown Export (`ExportModal.js`, `lib/exportProject.js`)
- **Single-Project Export**: Generates and downloads a structured `.md` file from detail page (available from `planned` onward).
- **Status-Driven Checklist**: Export checklist modal mirrors current status field visibility automatically.
- **Client-Side Generation**: Uses browser Blob & Object URLs without backend processing.

---

## 3. Deferred features

The following capabilities are explicitly designed into data models or architecture but deferred for future iterations:

- **PDF Export**: Planned second export format that will generate PDF documents with static rendered image snapshots of interactive diagrams.
- **Stage Advance Requirements (Gating)**: Enforcing mandatory field completion (e.g. requiring description & vision before advancing `idea → planned`) via `ADVANCE_REQUIREMENTS` in `lib/projectFieldConfig.js`.
- **Cross-Project Linking UI**: Visual graph and link manager to connect related projects (data schema `links` array exists in `data/index.json` and project entities).
- **Trait Categorization & Grouping**: Grouping flat trait tags into visual categories if the trait vocabulary grows significantly.
- **Database Backend Migration**: Swapping flat JSON files (`data/projects/*.json`) for an embedded SQLite database by swapping only `lib/projectRepository.js`.
- **Bulk / Dashboard Export**: Exporting multiple projects or an entire status category into a single multi-project export archive.
