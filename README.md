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

- `pages/index.js` — dashboard with status tabs (idea, planned, active, completed, archived)
  and a card grid.
- `pages/new.js` — capture a new idea (title + one-line note only, on purpose).
- `pages/projects/[id].js` — project detail page. Which fields show up is driven entirely by
  `lib/projectFieldConfig.js`, based on the project's status. Includes buttons to move a
  project forward a stage, mark it completed/archived from active, or unarchive.
- `lib/projectFieldConfig.js` — status order, labels, and field visibility per status. Edit
  this file to change what's shown at each stage.
- `lib/projectRepository.js` — the only file that touches the filesystem. Read/write/create
  project JSON files live here.
- `pages/api/projects/` — thin API routes that call the repository. Pages never read/write
  files directly.
- `data/projects/*.json` — one file per project.
- `data/index.json` — categories list and a `links` array for connecting related projects.
  The data model supports this (see `links` in the design doc), but the UI for browsing/
  creating links isn't built yet — that's a good next iteration.

## Deferred on purpose (see design doc)

- Gating (requiring certain fields before advancing a stage) — `ADVANCE_REQUIREMENTS` in
  `projectFieldConfig.js` already lists what would be required, it's just not enforced yet.
- Linking related projects together in the UI.
- Swapping JSON files for a real database, if the project graph ever outgrows them — should
  only require changes inside `lib/projectRepository.js`.
