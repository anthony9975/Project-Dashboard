# Codebase

A map of the actual files, for someone opening this project for the first time. For *why*
things are built this way, see `context.md` (fast version) or `Project_Dashboard_Design.md`
(full reasoning). This doc is just: what's here, and what talks to what.

The short version: this is a Next.js app with **four layers**, each only aware of the one
below it — `pages/*.js` (UI) → `pages/api/**` (API routes) → `lib/projectRepository.js`
(data access) → `data/**` (JSON files on disk). Nothing above the repository touches the
filesystem directly.

## File tree

```
project-dashboard/
├── data/
│   ├── index.json                 # known traits + cross-project links (not wired into UI yet)
│   └── projects/
│       ├── 1.json                 # one JSON file per project — the actual database
│       ├── 2.json
│       └── ...
├── lib/
│   ├── projectFieldConfig.js      # status order, field visibility, status-advance rules
│   └── projectRepository.js       # the ONLY file that touches the filesystem
├── components/
│   ├── EditableField.js           # plain text + pencil icon -> editable box + confirm/cancel
│   ├── Fiducials.js               # small "+" corner marks (style detail, used on cards)
│   ├── TraitPicker.js             # search/select trait widget (inline edit + compact filter)
│   └── RoadmapTimeline.js         # roadmap steps + nested to-do lists, drag-to-reorder
├── pages/
│   ├── _app.js                    # loads global styles, wraps every page
│   ├── index.js                   # dashboard: status tabs, trait filter, card grid
│   ├── new.js                     # capture a new idea (title + one-line note only)
│   ├── api/
│   │   └── projects/
│   │       ├── index.js           # GET (list), POST (create)
│   │       └── [id].js            # GET (one), PATCH (update)
│   └── projects/
│       └── [id].js                # project detail page — the most complex page
├── styles/
│   └── globals.css                # palette, type, and every component's CSS
├── next.config.js
├── package.json
├── README.md                      # how to run it locally
├── Project_Dashboard_Design.md    # full design reasoning
├── context.md                     # condensed decision log
└── Codebase.md                    # this file
```

## Layer by layer

### `data/` — storage

Flat JSON files. Each project is one file, named by its id (`data/projects/3.json`).
`data/index.json` holds a curated trait list and a `links` array for connecting related
projects — both exist in the data model but aren't used by any page yet.

There's no schema enforcement here beyond what `projectRepository.js` writes. If you open
one of these files, you're looking at the actual shape of a `Project` — see the schema
sketch in `Project_Dashboard_Design.md` if a field's purpose isn't obvious from its name.

### `lib/projectRepository.js` — data access

The only file allowed to call `fs.readFileSync` / `fs.writeFileSync`. Exports:

- `getAllProjects()`, `getProject(id)` — reads
- `saveProject(project)`, `createProject({title, note})` — writes
- `getAllTraits()` — derives the known-traits list from every project's `traits` array

It also runs `normalizeProject()` on every read, which transparently upgrades old data
shapes (e.g. a roadmap step that predates the nested-to-do feature, or predates the
`completedDate` field) so old projects don't break when the schema evolves. If you add a
new field or change a shape, this is where the upgrade logic goes.

### `lib/projectFieldConfig.js` — status + field rules

Not data access — this is pure configuration, imported by both API routes and pages.
Defines `STATUS_ORDER`, which fields are visible at each status (`fieldsFor(status)`), and
`nextStatus()` for the linear idea → planned → active progression. If you're wondering "why
does this field show up here but not there," this file has the answer.

### `pages/api/` — API routes

Thin. Each route calls the repository and returns JSON — no business logic lives here
beyond basic request validation (e.g. rejecting an empty title). If a page needs to read or
write a project, it goes through one of these routes rather than importing the repository
directly (except in `getServerSideProps`, which runs server-side and can call the
repository directly — see below).

### `pages/` — UI

- **`index.js`** (the dashboard) uses `getServerSideProps` to load all projects directly
  from the repository (server-side, no API round-trip needed for the initial load), then
  filters/renders client-side as you use the status tabs and trait filter.
- **`new.js`** posts to `/api/projects` to create an idea-stage project.
- **`projects/[id].js`** is the detail page. It also loads via `getServerSideProps`, then
  every field save goes through a single `saveField(key, value)` helper that PATCHes
  `/api/projects/[id]` and updates local state with the server's response — this is why
  editing one field never disturbs any other field's value.

### `components/` — reusable UI pieces

- **`EditableField`** is the generic "click pencil, edit, confirm" widget used for every
  plain-text field on the detail page (title included).
- **`TraitPicker`** has two visual modes controlled by a `variant` prop: `inline` (always-
  visible, used on the detail page, can create new traits) and `compact` (collapsed behind
  a button, used as the dashboard filter, can't create new traits — only pick existing
  ones). Same component, same underlying logic, different presentation.
- **`RoadmapTimeline`** is the most involved component: drag-to-reorder steps, a nested
  `StepRow` per step containing its own drag-to-reorder `TodoRow` list, and the two
  auto-behaviors (auto-expand on in-progress, auto-complete on all-to-dos-done) described
  in the design doc. Each step also carries an optional `completedDate`, auto-stamped when
  a step becomes done (only if blank) and editable via the same pencil flow as the step
  text — this is what makes the roadmap double as a completed project's finished timeline,
  so there's no separate `timeline` field or component.

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
trait) follows this same round-trip shape.