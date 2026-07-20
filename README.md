# Project dashboard

Simple version of the dashboard, matching `Project_Dashboard_Design.md`.

## Run it

```
npm install
npm run dev
```

Then open http://localhost:3000. Five sample projects are included, one per status, so the
dashboard isn't empty on first run — delete the files in `data/projects/` if you'd rather
start clean.

## What's here

- `pages/index.js` — dashboard with status tabs (idea, planned, active, completed, archived),
  a trait filter row (derived from whatever traits are actually in use across your projects),
  and a card grid. Trait filtering is OR-based: selecting multiple traits shows projects that
  match any of them.
- `pages/new.js` — capture a new idea (title + one-line note only, on purpose).
- `pages/projects/[id].js` — project detail page. Which fields show up is driven entirely by
  `lib/projectFieldConfig.js`, based on the project's status. `traits` (e.g. software,
  hardware, digital logic — one per line) is available starting at Idea, but optional there,
  so quick-capture stays frictionless. Also includes buttons to move a project forward a
  stage, mark it completed/archived from active, mark it back to active from completed or
  archived, or unarchive. Marking a project completed locks every field except Insights and
  Next steps (with a confirmation prompt first, since it's no longer a single reversible
  click) — "Move back to active" lifts the lock again.
- `lib/projectFieldConfig.js` — status order, labels, field visibility per status, and
  `isLocked(status, field)` (whether a field should be locked on a completed project). Edit
  this file to change what's shown — or locked — at each stage.
- `lib/projectRepository.js` — the only file that touches the filesystem. Read/write/create
  project JSON files live here, plus read/write/delete for uploaded diagram files.
- `pages/api/projects/` — thin API routes that call the repository. Pages never read/write
  files directly. `pages/api/projects/[id]/diagram.js` is the one route that isn't plain
  JSON — it handles uploading, serving, and deleting a project's diagram file.
- `data/projects/*.json` — one file per project.
- `data/diagrams/*.html` — one uploaded interactive diagram per project, if any (see
  "Technical specifications" below). Named by project id, same as the JSON files.
- `data/index.json` — a curated list of known traits and a `links` array for connecting
  related projects. Neither is consumed by the UI yet — the trait filter on the dashboard
  derives its options directly from whatever traits are actually on your projects, which is
  simpler for now. `data/index.json` is there for when you want a fixed vocabulary or
  autocomplete instead.

### Technical specifications

This is a single uploaded, self-contained interactive HTML diagram per project, rendered
in an iframe — not a form field. Design it in whatever tool you like and export it as one
`.html` file; the app doesn't care which tool made it.
[draw.io](https://www.drawio.com/) (File → Export as → HTML) is the recommended path — it's
free, produces a genuinely interactive export (pan/zoom, layers, clickable links), and
supports multiple pages in one file if you need that. By default that export loads its
viewer script from draw.io's own servers, so it needs an internet connection to display;
for a fully offline diagram, self-host draw.io's `viewer-static.min.js` instead (see their
docs) before exporting.

Uploads are capped at 15MB and only checked by file extension (`.html`/`.htm`) — there's no
deeper content validation, since this is a single-user local tool.

Since an interactive HTML file can't be embedded in a Markdown export, the diagram card
also has a collapsed **"+ add an export description"** toggle — a short hand-written
explanation used only by the `.md` export, hidden from the normal page view. It's
independent of the diagram file itself: uploading, replacing, or removing the diagram
doesn't touch it. Leave it blank and export just notes that a diagram is attached instead.

## Deferred on purpose (see design doc)

- Gating (requiring certain fields before advancing a stage) — `ADVANCE_REQUIREMENTS` in
  `projectFieldConfig.js` already lists what would be required, it's just not enforced yet.
- Linking related projects together in the UI.
- Swapping JSON files for a real database, if the project graph ever outgrows them — should
  only require changes inside `lib/projectRepository.js`.
- **PDF export** — a second export format alongside Markdown, planned to embed a static
  image of the diagram (Markdown uses the hand-written description above instead). No
  PDF-generation code exists yet.