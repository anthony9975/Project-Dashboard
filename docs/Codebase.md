# Codebase

A map of the actual files, for someone opening this project for the first time. For *why*
things are built this way, see `docs/context.md` (fast version) or `docs/Project_Dashboard_Design.md`
(full reasoning). This doc is just: what's here, and what talks to what.

The short version: this is a Next.js app with **four layers**, each only aware of the one
below it — `pages/*.js` (UI) → `pages/api/**` (API routes) → `lib/projectRepository.js`
(data access) → `data/**` (JSON files on disk, plus one uploaded HTML diagram per project).
Nothing above the repository touches the filesystem directly.

## File tree

```
project-dashboard/
├── data/
│   ├── index.json                 # known traits + cross-project links (not wired into UI yet)
│   ├── projects/
│   │   ├── 1.json                 # one JSON file per project — the actual database
│   │   ├── 2.json
│   │   └── ...
│   └── diagrams/
│       ├── 1.html                 # one uploaded interactive diagram per project, if any
│       └── ...
├── lib/
│   ├── projectFieldConfig.js      # status order, field visibility, status-advance rules
│   ├── projectRepository.js       # the ONLY file that touches the filesystem
│   └── exportProject.js           # builds a project's Markdown export + triggers download
├── components/
│   ├── EditableField.js           # plain text + pencil icon -> editable box + confirm/cancel
│   ├── Fiducials.js               # small "+" corner marks (style detail, used on cards)
│   ├── TraitPicker.js             # search/select trait widget (inline edit + compact filter)
│   ├── FeaturesList.js            # nested features and sub-features list with drag-to-reorder
│   ├── ResearchList.js            # research entries (name, link, description) with drag-to-reorder
│   ├── RoadmapTimeline.js         # roadmap steps + nested to-do lists, drag-to-reorder
│   ├── ComponentsTable.js         # components + cost table (name, link, price, notes)
│   ├── DiagramSlot.js             # upload/replace/remove an interactive HTML diagram,
│   │                               # plus a hidden export-description toggle
│   └── ExportModal.js             # checklist modal for exporting a project to Markdown
├── pages/
│   ├── _app.js                    # loads global styles, wraps every page
│   ├── index.js                   # dashboard: status tabs, trait filter, card grid
│   ├── new.js                     # capture a new idea (title + one-line note only)
│   ├── api/
│   │   └── projects/
│   │       ├── index.js           # GET (list), POST (create)
│   │       ├── [id].js            # GET (one), PATCH (update)
│   │       └── [id]/
│   │           └── diagram.js     # GET (serve), POST (upload), DELETE (remove) a diagram
│   └── projects/
│       └── [id].js                # project detail page — the most complex page
├── styles/
│   └── globals.css                # palette, type, and every component's CSS
├── docs/
│   ├── CONVENTIONS.md                 # coding standards, UI patterns, and layer rules
│   ├── Codebase.md                    # this file
│   ├── Project_Dashboard_Design.md    # full design reasoning
│   └── context.md                     # condensed decision log
├── next.config.js
├── package.json
└── README.md                      # how to run it locally
```

## Layer by layer

### `data/` — storage

Flat JSON files. Each project is one file, named by its id (`data/projects/3.json`).
`data/index.json` holds a curated trait list and a `links` array for connecting related
projects — both exist in the data model but aren't used by any page yet. `data/diagrams/`
holds one uploaded interactive HTML diagram per project, named by id (`data/diagrams/
3.html`) — the only non-JSON, non-JavaScript content this app stores.

There's no schema enforcement here beyond what `projectRepository.js` writes. If you open
one of these files, you're looking at the actual shape of a `Project` — see the schema
sketch in `docs/Project_Dashboard_Design.md` if a field's purpose isn't obvious from its name.

### `lib/projectRepository.js` — data access

The only file allowed to call `fs.readFileSync` / `fs.writeFileSync` (or their diagram-file
equivalents). Exports:

- `getAllProjects()`, `getProject(id)` — reads
- `saveProject(project)`, `createProject({title, note})` — writes
- `getAllTraits()` — derives the known-traits list from every project's `traits` array
- `saveDiagramFile(id, buffer)`, `getDiagramFile(id)`, `deleteDiagramFile(id)` — the
  project-JSON functions above only ever touch `data/projects/`; these three are the
  matching read/write/delete trio for `data/diagrams/`, added when Technical specifications
  became an uploaded file instead of table data (see docs/context.md)

It also runs `normalizeProject()` on every read, which transparently upgrades old data
shapes (e.g. a roadmap step that predates the nested-to-do feature or the `completedDate`
field, a component that predates the name/link/price/notes shape, or a project that
predates `diagram` entirely — the last of these also drops the old `technicalSpecs` field
if a project still has it, rather than upgrading it into a new shape).
If you add a new field or change a shape, this is where the upgrade logic goes.

### `lib/projectFieldConfig.js` — status + field rules

Not data access — this is pure configuration, imported by both API routes and pages.
Defines `STATUS_ORDER`, which fields are visible at each status (`fieldsFor(status)`),
`nextStatus()` for the linear idea → planned → active progression, and `isLocked(status,
field)` for whether a "completed" project's fields should be locked from editing (true for
everything except `insights` and `nextSteps`). If you're wondering "why does this field
show up here but not there" or "why can/can't I edit this," this file has the answer.

### `lib/exportProject.js` — Markdown export logic

Pure functions, no React and no filesystem access — this is the only `lib/` file that isn't
part of the four-layer data path, since export never touches `data/` at all. It works
entirely off the project object the detail page already has in memory.

- `buildProjectMarkdown(project, selectedFields)` — returns the export as a plain string
  (kept separate from the download step so it's testable/reusable on its own)
- `downloadProjectMarkdown(project, selectedFields)` — calls the above, then triggers the
  browser download via a Blob + object URL

`selectedFields` drives which sections get included and in what order; each field has its
own renderer (e.g. the roadmap renderer walks steps and their nested to-dos, the components
renderer emits a Markdown table with a computed total row, the diagram renderer prefers
`diagramDescription` — a hand-written explanation, edited via a hidden toggle on
`DiagramSlot` — falling back to a note that a diagram is attached if no description was
written; see docs/context.md under "Technical diagram"). Deliberately kept separate from
`ExportModal.js` so this generation logic could be reused by a future export entry point
(e.g. a dashboard-level bulk export) without duplicating it.

### `pages/api/` — API routes

Thin. Each route calls the repository and returns JSON — no business logic lives here
beyond basic request validation (e.g. rejecting an empty title). If a page needs to read or
write a project, it goes through one of these routes rather than importing the repository
directly (except in `getServerSideProps`, which runs server-side and can call the
repository directly — see below). One exception to "thin" and "returns JSON":
`pages/api/projects/[id]/diagram.js` handles file upload/serve/delete instead — it's the
one route that turns off Next's default JSON body parser (`bodyParser: false`) to read a
raw `multipart/form-data` upload via `busboy`, and its GET returns the raw HTML file with
a `text/html` content type rather than a JSON body.

### `pages/` — UI

- **`index.js`** (the dashboard) uses `getServerSideProps` to load all projects directly
  from the repository (server-side, no API round-trip needed for the initial load), then
  filters/renders client-side as you use the status tabs and trait filter.
- **`new.js`** posts to `/api/projects` to create an idea-stage project.
- **`projects/[id].js`** is the detail page. It also loads via `getServerSideProps`, then
  every field save goes through a single `saveField(key, value)` helper that PATCHes
  `/api/projects/[id]` and updates local state with the server's response — this is why
  editing one field never disturbs any other field's value. It also owns the "Export"
  button next to the status tag (hidden at "idea") and the `showExport` boolean that
  controls whether `ExportModal` is rendered — export never goes through `saveField` or the
  API, since it doesn't write anything.

### `components/` — reusable UI pieces

- **`EditableField`** is the generic "click pencil, edit, confirm" widget used for every
  plain-text field on the detail page (title included).
- **`TraitPicker`** has two visual modes controlled by a `variant` prop: `inline` (always-
  visible, used on the detail page, can create new traits) and `compact` (collapsed behind
  a button, used as the dashboard filter, can't create new traits — only pick existing
  ones). Same component, same underlying logic, different presentation.
- **`locked` prop convention:** `EditableField`, `TraitPicker` (inline variant only),
  `FeaturesList`, `ResearchList`, `RoadmapTimeline`, `ComponentsTable`, and `DiagramSlot` all
  accept a `locked` boolean. When true, every edit affordance (pencils, add-rows, drag handles,
  remove buttons, upload controls) is omitted from render entirely rather than disabled — read
  display is unaffected. The detail page is the only caller; it derives the value from
  `isLocked(project.status, field)` in `projectFieldConfig.js` rather than any component
  checking `project.status` itself.
- **`FeaturesList`** renders `features` as a bulleted list where each feature item can carry
  its own nested sub-features list, with Feature Name and Description displayed inline (`Name - Description`).
  Sub-feature lists are collapsible (hiding sub-features and the add sub-feature input when collapsed).
  Supports drag-to-reorder for both features and sub-features (calling `e.stopPropagation()` to prevent
  nested drag bubbling), inline editing (pencil icon), removal (`×`), and adding new features or sub-features.
- **`ResearchList`** renders `research` as structured entries (`{ id, name, link, description }`) sitting unboxed
  directly on the page layout. Displays Article Name on top (clickable link hiding the raw URL when a link is provided),
  with Description placed directly below it and indented to the right. Supports inline editing, deletion (`×`), and
  persistent add inputs.
- **`RoadmapTimeline`** is the most involved component: drag-to-reorder steps, a nested
  `StepRow` per step containing its own drag-to-reorder `TodoRow` list, and the two
  auto-behaviors (auto-expand on in-progress, auto-complete on all-to-dos-done) described
  in the design doc. Each step also carries an optional `completedDate`, auto-stamped when
  a step becomes done (only if blank) and editable via the same pencil flow as the step
  text — this is what makes the roadmap double as a completed project's finished timeline,
  so there's no separate `timeline` field or component.
- **`ComponentsTable`** renders `components` as a table (name, price, notes, plus an
  edit/remove column) instead of the plain-text pattern every other list field uses. Price
  is stored as a real number (or `null` if left blank) so it can be summed into a total row;
  every other field on this table stays a string. A component's name is itself the link
  (when one's set) rather than a separate URL column. Editing works on the whole row at
  once — pencil turns all four cells into inputs, confirm/cancel saves or discards
  together — rather than per-cell, since four separate pencils per row would be noisy.
- **`DiagramSlot`** replaced `TechnicalSpecsTable` — Technical specifications is now a
  single uploaded, self-contained interactive HTML diagram rather than a table (see
  "Technical diagram" in `docs/Project_Dashboard_Design.md`). The component never parses the
  uploaded file itself; it renders an `<iframe src="/api/projects/{id}/diagram">` so the
  diagram's own scripts/styles stay isolated from the rest of the app. Upload/replace both
  go through the same `POST` to that route as a `multipart/form-data` request; remove is a
  `DELETE`. Unlike every other editable widget on the page, its `onUpdate` callback receives
  the *whole* updated project (the API route already returns it via `saveProject()`), not
  just the changed field — so the detail page wires it straight to `setProject` rather than
  through the generic `saveField` helper. It also owns a second, unrelated piece of state:
  `diagramDescription`, a hand-written explanation used only by the Markdown export (see
  `lib/exportProject.js`), edited through a collapsed toggle inside the same card. Unlike
  the diagram file, saving it *does* go through the normal `saveField('diagramDescription',
  v)` path from the detail page, since it's a plain project field, not a file.
- **`ExportModal`** is the checklist overlay opened by the detail page's "Export" button.
  Its checkbox list is literally the same `fields` array the detail page already computes
  from `fieldsFor(status)` (plus `traits` when shown) — not a second, separately-maintained
  visibility list — so the export options can never fall out of sync with what the page
  actually displays for that status. Everything's checked by default, selection isn't
  remembered between opens, and confirming hands the selected field keys off to
  `lib/exportProject.js` to actually build and download the file.

### `styles/globals.css`

One file for everything — palette as CSS variables (`--paper`, `--ink`, `--circuit-blue`,
etc.), type, and every component's classes. No CSS-in-JS, no per-component stylesheets.
Worth knowing: shared status-color classes (`.status-in_progress`, `.status-done`) must be
defined *after* every node class that uses them, or the cascade silently picks the wrong
one — see the gotcha note in the design doc if touching this file.

## Tracing one action end to end

As a concrete example, here's what happens when you click a to-do's status dot on the
detail page:

1. `RoadmapTimeline`'s `cycleTodoStatus()` computes the new `roadmap` array (with the
   to-do's status advanced, and the parent step auto-completed if that was the last to-do).
2. It calls `onChange(updatedRoadmap)`, a prop passed down from `pages/projects/[id].js`.
3. That prop is wired to `saveField('roadmap', updatedRoadmap)`, which sends a `PATCH` to
   `pages/api/projects/[id].js`.
4. The API route calls `saveProject()` in the repository, which writes the updated JSON
   file to disk and returns the saved project.
5. The page's `setProject(updated)` updates local state with the server's response, and
   the UI re-renders from that — nothing is assumed client-side; the displayed state always
   reflects what's actually on disk.

Every other interaction in the app (editing a field, changing a project's status, adding a
trait, reordering technical specs) follows this same round-trip shape — with one exception:
exporting a project never leaves the browser. `ExportModal` and `lib/exportProject.js` work
entirely off the project object already sitting in the page's state, so there's no API call
and nothing written back to `data/`.