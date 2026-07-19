# Context

Condensed key-decisions log for the project dashboard. For full reasoning, data shapes, and
the palette/type reference, see `Project_Dashboard_Design.md` — this file is the fast-scan
version of the same decisions, not a replacement.

## What this is

A personal, local-first tool for tracking project ideas from raw idea through completion.
Single user, runs on one machine, no auth.

## Architecture

- **Layered:** UI → API routes → repository (`lib/projectRepository.js`) → JSON files.
  Only the repository touches the filesystem — swapping storage later (e.g. to SQLite)
  should only require changing that one file.
- **One `Project` entity**, not a separate schema per status. A project moves through
  `status: idea → planned → active → archived/completed` as a single field change, not a
  data migration.
- **Status-driven field visibility**, defined in one config file
  (`lib/projectFieldConfig.js`), not scattered `if (status === ...)` checks.

## Key decisions and why

- **Idea capture is deliberately near-frictionless** (name + one-line note only) so
  ideation doesn't require committing to real thought. Real description/vision/roadmap
  come at the Planned stage.
- **Traits replaced a single `category` field** — a project can carry any number of them.
  The trait vocabulary isn't a fixed list; it's derived from whatever's actually in use,
  so it grows organically instead of needing upkeep.
- **Every field edits the same way**: plain text + pencil icon → editable box → confirm/
  cancel. No page-wide save button — each field saves itself. Applied everywhere except
  traits and the roadmap, which are rich widgets rather than plain text.
- **Roadmap steps have their own nested to-do lists.** Both steps and to-dos are drag-to-
  reorder (to-dos independently per step, so urgent ones can be pulled to the top). A step
  auto-expands its to-dos when set to "in progress," and auto-completes once every to-do
  is done — but never auto-reverts, since manually marking a step done early is allowed
  and shouldn't get silently undone later.
- **There's no separate top-level `todos` field anymore.** It used to sit alongside the
  roadmap as its own general to-do list, which became a confusing duplicate once the
  roadmap gained per-step to-do lists. Removed from `ACTIVE_FIELDS`, `blankProject`, and
  the detail page — the roadmap's nested to-dos are the only to-do tracking now. (It was
  confirmed empty across all existing projects before removal, so no migration was needed;
  if that's ever not true for some future field removal, migrate the data or ask first.)
- **Components + costs is a structured table, not free text.** Each row is
  `{id, name, link, price, notes}`. Price is strictly numeric (unlike every other
  list-style field, which stays free text) so it can be summed into a running total shown
  at the bottom of the table. A component's name is the clickable link when one's given,
  rather than showing a separate raw-URL column. Whole rows edit at once — pencil opens
  all four fields, confirm/cancel saves them together — same pattern as a roadmap step's
  text, not per-cell editing. Lives in its own `ComponentsTable.js` component, alongside
  `RoadmapTimeline.js`.
- **Old data formats upgrade transparently on read** (see `normalizeProject` in the
  repository) rather than requiring manual migration — this has already happened three
  times (roadmap strings → objects, objects gaining a `todos` field, then a `completedDate`
  field) and is the pattern to keep using for future schema changes.
- **The separate `timeline` field is gone.** The roadmap now doubles as the finished
  timeline: each step carries an optional `completedDate`, auto-stamped with today's date
  the moment a step becomes "done" (manually or via the all-todos-done auto-complete), but
  only if that step doesn't already have a date — so it never overwrites one you've set or
  edited. It's always editable/clearable via the same pencil/confirm/cancel flow as the
  step text. Completed projects just keep showing the same roadmap they've had since
  Planned; there's no separate text field to fill in a second time.
- **Gating and cross-project links are deferred, not abandoned.** The data model and
  config already have room for both (`ADVANCE_REQUIREMENTS`, the `links` field) — they're
  intentionally not built yet.
- **Gotcha:** shared status-color CSS classes (`.status-in_progress`, `.status-done`) must
  be defined *after* every node base class that uses them (`.rm-vnode`, `.rm-todo-node`,
  and any future one) — equal specificity means source order decides the winner, and this
  has already broken once (to-do dots showed the right symbol but no color).
- **Gotcha:** nested draggable elements need `e.stopPropagation()` in every drag handler
  (`dragstart`/`dragover`/`drop`/`dragend`). To-do rows are draggable inside their step's
  own draggable row, and native drag events bubble — without stopping them, dragging a
  to-do also fired the step's own drag handlers on the way up, whose `onDrop` used a stale
  closure and would intermittently overwrite a just-saved reorder with the old order (this
  was the "to-do reordering sometimes doesn't save" bug). Any future draggable-inside-
  draggable UI needs the same treatment.
- **Markdown export, one project at a time**, from a button on the detail page (hidden at
  "idea"). The export checklist reuses the same status-driven `fields` array the page
  itself renders from, so it can never fall out of sync with what's actually visible. Full
  reasoning in `Project_Dashboard_Design.md` under "Export to Markdown."
- **`insights` moved from completed-only into `ACTIVE_FIELDS`** so it's available to write
  down while a project is actually being worked on, not just after the fact. It now carries
  forward into "archived" and "completed" automatically, same as every other
  `ACTIVE_FIELDS` entry. `nextSteps` stayed completed-only — it's inherently a look-forward
  field that only makes sense once a project is actually finished.
- **A "completed" project locks every field**, to preserve it as a finished record —
  clicking "Mark completed" now asks for confirmation first, since it's no longer a
  reversible-feeling single click. The two exceptions are `insights` and `nextSteps`, which
  stay editable even after completion, since reflections tend to keep evolving after a
  project wraps up. Locking hides edit affordances entirely (pencils, add-rows, drag
  handles) rather than disabling them — a completed project should read as a clean,
  finished record, not a form with greyed-out controls. Roadmap status dots are the one
  exception to "hide the control": they stay visible with their current color/checkmark
  (so the roadmap still reads as a timeline) but stop responding to clicks. Done steps/
  to-dos also stop rendering with strikethrough text once locked — useful as a "this is
  behind you" cue while active, but just adds noise on a record meant to stay fully
  readable once finished.
- **A completed project can move back to "active"** via a "Move back to active" button
  (mirroring "Unarchive"), which lifts the lock everywhere again. This is the intended path
  if something needs correcting after completion, rather than editing a "finished" record
  in place.
- **The locking rule lives in one place**: `isLocked(status, field)` in
  `projectFieldConfig.js`. Whole-widget fields (traits, technicalSpecs, roadmap,
  components) call it with just `status`; individual `EditableField` instances pass their
  own field key so the `insights`/`nextSteps` exception applies automatically. No component
  re-derives the rule itself.

## Visual identity, in one line

Light drafting/blueprint aesthetic — grid paper, hairline borders, small `+` corner marks
(PCB fiducial nod) — because the project spans software, hardware, and digital design, not
because "technical" has to mean dark mode. Palette and type are in the design doc.

- **Technical specifications got its own bespoke visual treatment** ("Circuit Blueprint",
  from `Technical-Specs-Table-Design.md`), applied to this component only — the rest of the
  app hasn't had this pass yet, on purpose. It sits in its own elevated card (hairline
  border, corner fiducials, subtle shadow) with a header row, a subtly dotted background
  behind the spec rows specifically (not the header, not the add-row footer), 4px-radius
  chips instead of the pill-shaped `.trait-chip` used elsewhere, and a split
  value/divider/close style for chips while a row's being edited. The persistent add-row
  starts collapsed as a single "+ add a technical spec" row and expands into inputs on
  click — unlike Components/Roadmap, whose add-rows are always expanded.