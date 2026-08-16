# Conventions

Coding standards, patterns, and architectural conventions for the Project Dashboard codebase. This document serves as a guide for writing consistent, maintainable code across all layers.

---

## 1. Architecture & Layering Rules

The project strictly follows a **4-layer boundary**. Each layer may only call the layer directly below it:

```
UI Layer (pages/*.js, components/*.js)
  ↓
API Route Layer (pages/api/**/*.js)
  ↓
Repository Layer (lib/projectRepository.js)
  ↓
Storage Layer (data/projects/*.json, data/diagrams/*.html)
```

### Layer Responsibilities

- **UI Layer (`pages/`, `components/`)**
  - Renders React components and manages local transient UI state (e.g., modal visibility, draft input text).
  - Never imports Node filesystem modules (`fs`, `path`).
  - Calls API routes (`/api/projects/...`) for data mutation or loads data via `getServerSideProps` for initial page renders.

- **API Route Layer (`pages/api/`)**
  - Thin HTTP request handlers.
  - Responsible for HTTP method routing, input parsing/validation, and returning standard JSON responses (or raw HTML for diagram files).
  - Delegates all data operations to `lib/projectRepository.js`.

- **Repository Layer (`lib/projectRepository.js`)**
  - **The ONLY file allowed to touch the filesystem.** Uses `fs.readFileSync`, `fs.writeFileSync`, etc.
  - Owns directory creation (`data/projects/`, `data/diagrams/`), file naming (`{id}.json`, `{id}.html`), and schema normalization on read.

- **Storage Layer (`data/`)**
  - Flat files on disk. One JSON file per project in `data/projects/{id}.json` and optional single interactive HTML diagram per project in `data/diagrams/{id}.html`.

### Server-Side Data Loading Exception
Page components (`pages/index.js`, `pages/projects/[id].js`) use Next.js `getServerSideProps` to load initial data directly from `lib/projectRepository.js`. This runs exclusively on the server, bypassing unnecessary local HTTP round-trips while preserving the storage isolation seam.

---

## 2. Data Model & Field Configuration

- **Single `Project` Entity**
  - Projects move through status stages (`idea → planned → active → completed` / `archived`) as a single status field update. Never split projects into per-status database tables or schemas.

- **Centralized Field Configuration (`lib/projectFieldConfig.js`)**
  - All status definitions (`STATUS_ORDER`), field visibility rules (`fieldsFor(status)`), status transition logic (`nextStatus(status)`), and field locking rules (`isLocked(status, field)`) must live in `lib/projectFieldConfig.js`.
  - **Do not** write inline `if (status === ...)` visibility or locking checks inside components or page handlers.

- **Transparent Schema Upgrades on Read**
  - When a data shape evolves (e.g., roadmap steps gaining nested to-dos or completed dates), update `normalizeProject()` in `lib/projectRepository.js`.
  - Upgrades transform old shapes in memory on read and save in the new shape on the next write operation. Avoid manual one-time migration scripts.

---

## 3. UI Patterns & State Management

- **Single Source of Truth for State**
  - Page components maintain the canonical `project` object state.
  - After saving a field or changing status, the client updates its state directly from the server API response (`setProject(updated)`). Client state is never mutated optimistically without server confirmation.

- **Per-Field Independent Editing**
  - Editing plain text fields (title, description, vision, etc.) follows the pencil-edit pattern (`EditableField.js`):
    - **Read Mode**: Plain text display + pencil button (`✎`).
    - **Edit Mode**: Input/textarea + `✓ save` confirm and `cancel` buttons.
  - Each field saves itself independently via `saveField(key, value)` (sending a `PATCH` request to `/api/projects/[id]`). There is no global "Save All" button.

- **Locking Affordance Pattern**
  - Completed projects lock editing across fields via `isLocked(status, field)`.
  - When locked, edit affordances (pencil icons, add-row buttons, drag handles, remove buttons) are omitted from render entirely. Fields present clean read-only text rather than disabled form controls.
  - Exceptions: `insights` and `nextSteps` remain editable on completed projects; roadmap status checkmarks remain rendered as visual indicators but ignore click events.

- **Drag-and-Drop Safety**
  - When nesting draggable UI elements (e.g., draggable to-do items inside a draggable roadmap step in `RoadmapTimeline.js`), every native drag event handler (`dragstart`, `dragover`, `drop`, `dragend`) **must call `e.stopPropagation()`**.
  - This prevents drag event bubbling to parent containers and avoids stale closure state bugs during reordering.

---

## 4. Code Style & Naming Conventions

### File & Directory Naming

- **React Components**: `PascalCase.js` (e.g., `EditableField.js`, `RoadmapTimeline.js`, `ComponentsTable.js`).
- **Library Modules & Utilities**: `camelCase.js` (e.g., `projectRepository.js`, `projectFieldConfig.js`, `exportProject.js`).
- **API & Next.js Pages**: `kebab-case.js` or Next.js dynamic param syntax (e.g., `pages/projects/[id].js`, `pages/api/projects/[id]/diagram.js`).

### Functions & Exports

- Utility functions use **named exports** (e.g., `export function fieldsFor(status)`).
- React components and page components use **default exports** (e.g., `export default function EditableField(...)`).
- Event handlers follow standard `handleAction` or `onAction` naming conventions (e.g., `handleMarkCompleted`, `onSave`).

### Documentation & Comments

- Every file and non-trivial module should begin with a header comment explaining its role, layer, and architectural context.
- Document edge cases, CSS cascade ordering constraints, and non-obvious design rationales inline near the code.

---

## 5. Styling Conventions (`styles/globals.css`)

- **Single Global Stylesheet**
  - All application styles are written in vanilla CSS in `styles/globals.css`. Do not use CSS Modules, Tailwind, or inline CSS-in-JS libraries.

- **Design System Tokens (`:root`)**
  - Color palette is defined using CSS Custom Properties:
    ```css
    :root {
      --paper: #f7f8fa;
      --ink: #1e2733;
      --line: #dce1e8;
      --circuit-blue: #2955c5;
      --slate: #6b7684;
      --amber: #b96e1e;
      --moss: #2f7d58;
      --clay: #8b6f4e;
    }
    ```
  - Fonts loaded via Google Fonts:
    - Primary Body: `'IBM Plex Sans', sans-serif`
    - Headings: `'Space Grotesk', sans-serif`
    - Monospace / Dates / Code: `'IBM Plex Mono', monospace`

- **CSS Order & Specificity Rule**
  - Shared status modifier classes (e.g., `.status-in_progress`, `.status-done`, `.status-not_started`) **must be defined after** base node classes in `globals.css`. Equal specificity relies on source order; placing base classes below status modifiers will break status styling.

- **Visual Identity**
  - Light drafting / blueprint aesthetic with grid paper background (`background-size: 24px 24px`), thin borders (`1px solid var(--line)`), and corner fiducials (`Fiducials.js`).
