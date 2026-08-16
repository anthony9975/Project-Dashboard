# Conventions

Coding standards, naming conventions, and styling rules for the Project Dashboard codebase. This document serves as a guide for writing consistent, maintainable code.

---

## 1. Architecture & Layering Reference

Architectural decisions, layer boundaries, and structural patterns are owned by **`docs/Codebase.md`** and **`docs/context.md`**. Key architectural boundaries to reference:

- **4-Layer Boundary**: UI (`pages/`, `components/`) → API Routes (`pages/api/`) → Repository (`lib/projectRepository.js`) → Storage (`data/`).
- **Filesystem Isolation**: `lib/projectRepository.js` is the *only* file allowed to import or call Node filesystem modules (`fs`, `path`).
- **Centralized Field Configuration**: All status order definitions (`STATUS_ORDER`), field visibility rules (`fieldsFor(status)`), status transition logic (`nextStatus(status)`), and field locking rules (`isLocked(status, field)`) live in `lib/projectFieldConfig.js`. Do not write inline `if (status === ...)` checks inside UI components or API handlers.
- **Transparent Schema Upgrades**: Data shape migrations on read are handled via `normalizeProject()` in `lib/projectRepository.js`.

For the complete architectural map, layer-by-layer responsibilities, and end-to-end action flows, see **`docs/Codebase.md`**.

---

## 2. Code Style & Naming Conventions

### File & Directory Naming

- **React Components**: `PascalCase.js` (e.g., `EditableField.js`, `RoadmapTimeline.js`, `ComponentsTable.js`).
- **Library Modules & Utilities**: `camelCase.js` (e.g., `projectRepository.js`, `projectFieldConfig.js`, `exportProject.js`).
- **API Routes & Pages**: `kebab-case.js` or Next.js dynamic param syntax (e.g., `pages/projects/[id].js`, `pages/api/projects/[id]/diagram.js`).

### Functions & Exports

- Utility functions use **named exports** (e.g., `export function fieldsFor(status)`).
- React components and page components use **default exports** (e.g., `export default function EditableField(...)`).
- Event handlers follow standard `handleAction` or `onAction` naming conventions (e.g., `handleMarkCompleted`, `onSave`).

### Documentation & Comments

- Every file and non-trivial module should begin with a header comment explaining its role, layer, and architectural context.
- Document edge cases, CSS cascade ordering constraints, and non-obvious design rationales inline near the relevant code.

---

## 3. Styling Conventions (`styles/globals.css`)

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
