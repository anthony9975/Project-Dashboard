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
- **Old data formats upgrade transparently on read** (see `normalizeProject` in the
  repository) rather than requiring manual migration — this has already happened twice
  (roadmap strings → objects, then objects gaining a `todos` field) and is the pattern to
  keep using for future schema changes.
- **Gating and cross-project links are deferred, not abandoned.** The data model and
  config already have room for both (`ADVANCE_REQUIREMENTS`, the `links` field) — they're
  intentionally not built yet.
- **Gotcha:** shared status-color CSS classes (`.status-in_progress`, `.status-done`) must
  be defined *after* every node base class that uses them (`.rm-vnode`, `.rm-todo-node`,
  and any future one) — equal specificity means source order decides the winner, and this
  has already broken once (to-do dots showed the right symbol but no color).

## Visual identity, in one line

Light drafting/blueprint aesthetic — grid paper, hairline borders, small `+` corner marks
(PCB fiducial nod) — because the project spans software, hardware, and digital design, not
because "technical" has to mean dark mode. Palette and type are in the design doc.