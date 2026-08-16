# Project Dashboard — Design Reference

## Pain point

I have many project ideas floating around in my head and would like a good way to store/display them for the future. Currently stored in a Google Doc, but a dedicated application would allow for a project status page, a completed projects page, and hopefully more motivation to actually work on projects.

## Features (original vision)

- **Project Idea List** — list of all potential projects
  - Organized into categories (software, hardware, digital design, etc.)
  - Related ideas connected together (e.g. learning about AI → building an AI → building an AI agent using that self-built AI)
  - Each project includes:
    - *Must haves:* description, vision for the end goal
    - *Nice to haves:* list of components + costs, rough roadmap
- **Project Status Tracker** — tracks projects currently in progress
  - Where the project is stored (GitHub, KiCad, etc.)
  - Project timeline / roadmap, step-by-step implementation plan
  - To-dos / next steps
  - Research material being used
  - **Archived Project Page**
    - Why the project was archived
    - Any blockers that need to be resolved
    - A way to unarchive once blockers are resolved
- **Completed Project Page**
  - Shows all completed projects, pulling from the Idea and Tracker pages
  - Accurate timeline of how long everything took and the steps taken
  - Finalized description (so it can be linked to from a personal website)
  - Next steps / ideas for building on the project
  - Thoughts and insights gained

## Architecture decisions

### Layered architecture

Four layers, each layer only aware of the one directly below it:

1. **UI** — React / Next.js. Renders the Idea, Tracker, Archive, and Completed views.
2. **API layer** — validation and business rules. If using Next.js, this can just be its built-in API routes — no separate backend server needed.
3. **Data access layer** — a `ProjectRepository` module (repository pattern) with methods like `getAll()`, `getById()`, `save()`, `updateStatus()`. The UI and API never touch storage directly — they only call this layer.
4. **Storage** — JSON files to start. One file per project (`/data/projects/{id}.json`), plus an `index.json` holding categories and the links between projects.

**Why this matters:** the repository layer is the seam that lets storage be swapped later (e.g. JSON → SQLite, if the project graph outgrows flat files) without rewriting the UI or API.

### One unified `Project` entity, not five separate schemas

Rather than each page (Idea / Planned / Active / Archive / Completed) having its own data shape, every project is a single object that moves through a `status` field: `idea → planned → active → archived / completed`, with `archived → active` (unarchive) as a valid transition too. Moving a project between stages becomes a one-field update, not a data migration.

The **Idea** stage is intentionally near-frictionless — just a name and a one-line note, so capturing a raw idea takes no real thought. Moving to **Planned** is the point where a project gets a real description, a vision, and an initial approach; this is the stage where you're actually committing some thought to it. **Active**, **Archived**, and **Completed** stay as before.

Rough shape:

```
{
  id, title, status: "idea" | "planned" | "active" | "archived" | "completed",
  traits: [...],   // e.g. "software", "hardware" — optional even at "idea"
  links: [{ toId, relationship }],   // optional even at "idea"
  description,   // starts as a one-liner, expanded in place at "planned"
  vision,
  diagram: { originalFilename, uploadedAt } | null,  // a single uploaded, self-contained
                         // interactive HTML diagram (e.g. a draw.io export) — the file
                         // itself lives at data/diagrams/{id}.html, not inline in this
                         // JSON; this is just the reference to it. Visible from "planned"
                         // onward, alongside the roadmap. Was a freeform label -> values
                         // table ("technicalSpecs") before the redesign — see "Technical
                         // diagram" below.
  diagramDescription,   // hand-written explanation of the technical specifications, used
                         // only by the Markdown export — independent of `diagram` itself,
                         // persists across uploading/replacing/removing it. Hidden from
                         // the normal page view (collapsed toggle) — see "Technical
                         // diagram" below.
  features: [...],      // bullet list of features where each feature can carry nested
                         // sub-features: [{id, text, subFeatures: [{id, text}]}]
                         // visible from "planned" onward
  roadmap: [...],       // initial approach at "planned", fleshed out at "active",
                         // and doubles as the finished timeline once "completed"
                         // each step: {id, text, status, completedDate, todos: [{id, text, status}]}
  components: [...],    // optional, mainly filled in by "active"
                         // each item: {id, name, link, price, notes}
                         // price is a real number (or null) — the one strictly-typed
                         // field on an otherwise free-text project
  location: { type: "github" | "kicad" | ..., url },
  research: [...],
  archivedReason, blockers,
  insights, nextSteps
}
```

Note that `description` is a single field, not separate brief/detailed versions — it just gets expanded in place once the project moves to Planned. All fields past `status` are optional — visibility is handled separately (see below), not by having separate schemas.

There is no top-level `todos` field either — the roadmap's per-step to-do lists (below) are
the only to-do tracking in the app. A separate project-wide to-do list used to exist
alongside them; it was removed as a duplicate once the roadmap gained its own nested
to-dos, rather than keeping two different "things to do" lists on the same page.

There is no separate `timeline` field. A roadmap step's `completedDate` is auto-stamped with
today's date the moment that step becomes "done" (whether by manually cycling its status or
via the all-todos-done auto-complete), but only if the step doesn't already have a date —
so it never overwrites one that's been set or edited. The date is always editable/clearable
through the same pencil/confirm/cancel flow as the step's text. The result: a project's
roadmap, which already exists from Planned onward, naturally becomes its dated finished
timeline by the time it reaches Completed — nothing new to fill in.

`traits` replaced the original single `category` field — a project can carry any number of them (e.g. `["hardware", "digital logic"]`), rather than being sorted into one bucket. The set of known traits isn't a fixed list anywhere; it's derived from whatever traits are actually in use across all projects, so the vocabulary grows organically as new traits are typed in.

### Status-driven field visibility

Which fields are shown is determined by the project's current `status`, and is additive as the project progresses (each stage shows everything the previous stage showed, plus its own extras):

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

The roadmap (with its per-step dates) is already visible from Planned onward and simply
carries forward as the finished timeline at Completed — it isn't a separate row above
because it's not a separate field.

Insights is available from Active onward (not completed-only) so it can be written down
while a project is actually being worked on, rather than reconstructed after the fact. It
carries forward into Archived and Completed automatically, same as every other field
introduced at Active. Next steps stays Completed-only, since "what would I build on this
next" only makes sense once a project is actually finished.

**Implementation note:** keep this mapping in one config file (e.g. `projectFieldConfig.js`) rather than scattering `if (status === ...)` checks across page components. Each page reads from this config to decide what to render. Adjusting what's visible at a given stage later means editing one file, not several components.

### Gating (future enhancement, not v1)

Since the field-visibility config already defines what's expected at each stage, a natural follow-on is a parallel "required to advance" list. The two natural checkpoints are:

- **Idea → Planned:** requires a fleshed-out description + a vision
- **Planned → Active:** requires at least an initial roadmap/approach

This doesn't need to be built now, but the groundwork (the config-driven field model) makes it a small addition later rather than a redesign.

### Locking a completed project

Once a project is marked "completed," every field locks to preserve it as a finished
record — no more edits, reorders, or additions. This applies to plain text fields, traits,
technical specifications, the roadmap (including its nested to-dos), and the components
table alike.

**Two fields stay editable even when locked: Insights and Next steps.** Reflections on a
project tend to keep evolving after it's technically done, so those two are the exception
rather than the rule.

- **Marking a project completed asks for confirmation first** (a simple browser confirm
  dialog), since the action now locks the project rather than just moving a status tag —
  unlike every other status transition, which stays a single click.
- **Locked fields hide their edit affordances entirely** rather than showing them disabled
  — no pencils, no add-rows, no drag handles. A completed project should read as a clean,
  finished document, not a form full of greyed-out controls.
- **Roadmap status dots are the one exception to "hide the control."** They stay visible
  with their current color and checkmark (so the roadmap still reads as a timeline of what
  happened) but stop responding to clicks. Expand/collapse on a step's to-do list also
  stays interactive when locked, since it's a view toggle, not a data change.
- **"Move back to active"** is the escape hatch: a button on a completed project's detail
  page (mirroring "Unarchive") that returns it to "active" and lifts the lock everywhere.
  This is the intended path if something needs correcting after completion — editing a
  "finished" record in place isn't supported by design.
- **Implementation note:** the lock rule lives in exactly one place, `isLocked(status,
  field)` in `projectFieldConfig.js`, the same file that already owns status-driven field
  visibility. Every component that can be locked takes a `locked` prop rather than
  re-deriving the rule itself.

### Assumption

This is a single-user, local-first tool — run on one's own machine, no login system, no multi-user concerns. No auth layer or permissions needed as a result.

### Trait picker (UI pattern)

Traits are entered through a search-and-select picker, not a free-text list:

- Selected traits show as removable chips above the input
- Typing filters the existing trait list (e.g. "Soft" narrows to "Software")
- If nothing matches, an "add new" option appears to create a brand-new trait on the spot
- The dashboard's trait filter is the same picker collapsed behind a "Traits ▾" toggle, with new-trait creation turned off (filtering only makes sense against traits that already exist)
- Once 2+ traits are selected, an any/all toggle appears — "any" (OR, matches projects with at least one selected trait) is the default, "all" (AND, matches projects with every selected trait) narrows further

No grouping/categorization of traits beyond a flat list for now — worth revisiting if the trait list grows large enough to need it, but not before.

### Per-field editing (UI pattern)

Every field on the project detail page — including the title — displays as plain read-only text by default, with a small pencil icon beside it. Clicking the pencil swaps just that field into an editable box; a confirm button saves it (and snaps back to read-only display), a cancel button discards the draft. There's no page-wide "Save changes" button — each field saves itself independently the moment it's confirmed.

Traits and the roadmap (below) don't follow this exact pattern — they're rich widgets (a picker, a timeline) rather than plain text, so their own interactions apply immediately without a separate confirm step.

### Components + costs table (UI pattern)

Unlike every other list-style field (research, blockers, and the like), components
aren't a plain text box — they're a real table, since a component naturally has several
distinct attributes rather than being one line of prose:

- Columns: component name, price, notes, plus an edit/remove action column
- A component's name is itself the clickable link when one's set (opens in a new tab) —
  there's no separate raw-URL column, which would just clutter the table with long strings
- Price is strictly numeric (or left blank/`null`), the one field on this table — and on
  the project as a whole outside of dates — that isn't free text. That's specifically what
  lets the table sum a running **total** row at the bottom whenever at least one component
  has a price set
- Editing works on the whole row at once, not per-cell: clicking the row's pencil turns
  name/link/price/notes all into inputs together, and confirm/cancel saves or discards all
  four as one unit. Four separate pencils per row would be noisy for what's usually a quick
  edit
- New components are added through a persistent 4-input row pinned below the table (name,
  link, price, notes, then an "add" button) — the same "always-visible input, press Enter or
  click add" shape as adding a roadmap step, just with more fields

### Export to Markdown (UI pattern)
 
Projects can be exported one at a time as a `.md` file, from a button on the detail page —
the intent being to hand a project's contents to a portfolio site or an LLM without manually
retyping it.
 
- **Single-project only.** No bulk/dashboard-level export yet — deferred, not ruled out (see
  Status below).
- **Hidden at "idea."** Nothing's really been committed to paper yet at that stage, so the
  button only appears from "planned" onward.
- **A modal, opened by the "Export" button**, lists every field currently visible on the
  detail page as a checkbox, all checked by default. Selection isn't remembered between
  opens — it always resets to all-checked.
- **The checkbox list is the same `fields` array the detail page already computes** from
  `fieldsFor(status)` (plus `traits` when shown), not a second, separately-maintained
  visibility list. This means the export options can never silently drift out of sync with
  what the page actually displays for that status.
- **Whole fields only, not sub-fields.** A field is either fully included or excluded — e.g.
  the roadmap comes in with every step's status, completed date, and nested to-dos, or it
  doesn't come in at all. Partial inclusion (e.g. step text without to-dos) was considered
  and rejected as unnecessary complexity for a first version.
- **Entirely client-side.** The page already holds the full project object, so generation
  and download happen in the browser via a Blob + object URL — no new API route.
- **Generation logic lives in `lib/exportProject.js`, separate from the modal component**
  (`components/ExportModal.js`), specifically so the Markdown-building logic can be reused
  by a future export entry point (e.g. a dashboard bulk-export) without duplicating it.

### Roadmap

The roadmap is a vertical timeline, not the original plain "one step per line" text field:

- Each step has a 3-state status (not started / in progress / done) — click its dot to cycle through them
- Steps are drag-to-reorder; a progress bar at the top reflects steps completed, not to-do counts
- Each step has its own nested to-do list (see below), collapsed by default
- Editing a step's or to-do's text uses the same pencil/confirm/cancel pattern as everywhere else

**Nested to-dos:** each step can carry its own mini to-do list — same 3-state status, edit pattern, and drag-to-reorder as steps, kept independent per step (dragging one step's to-dos can't affect another's). Reordering exists so the most urgent to-dos can be pulled to the top. A collapse/expand chevron sits next to each step's pencil/× to show or hide its to-dos.

**Two automatic behaviors:**
- Setting a step to "in progress" auto-expands its to-do list
- Completing the last to-do under a step auto-completes the step

Both are one-directional — completing to-dos can push a step *toward* done, but nothing ever auto-reverts a step away from done. This matters because manually marking a step done early (before its to-dos are finished) is explicitly allowed; if reopening a to-do afterward auto-reverted the step, that manual override would silently get undone.

Expand/collapse state isn't persisted — it's recomputed on page load from whether a step is in progress, so it doesn't need its own saved field.

**Per-step completed date, and why there's no separate `timeline` field:** each step carries
an optional `completedDate`. It auto-stamps with today's date the instant a step becomes
"done" — by manual cycling or by the all-todos-done auto-complete — but only if the step
doesn't already have a date, so it never clobbers one that's been set or hand-edited
afterward. It's always editable and can be cleared, through the same pencil/confirm/cancel
flow as the step's text (both save together in one edit). Because the roadmap is already
visible from Planned onward and now carries real dates, it *is* the finished timeline by
the time a project reaches Completed — there's no separate text field to duplicate that
information into a second time.

**CSS gotcha worth remembering:** step dots (`.rm-vnode`) and to-do dots (`.rm-todo-node`) share status coloring via generic `.status-in_progress` / `.status-done` modifier classes rather than duplicating colors per node type. Since a shared modifier and a node's own base class have equal CSS specificity, whichever is defined *later* in the stylesheet wins — so these shared modifiers have to stay below both `.rm-vnode` and `.rm-todo-node` in `globals.css`, not above them. (This broke once already: the to-do dots rendered with the right symbol but no color, because the shared modifiers were declared before `.rm-todo-node`'s own neutral styles.) The same risk applies to any future node type that reuses these modifiers.

### Technical diagram (UI pattern)

Originally a flexible freeform label -> multiple-values table (languages, MCU, voltage,
etc.) — chosen because a software project's spec vocabulary shares almost nothing with a
hardware project's, so no fixed field set could cover both without being sparse or
cluttered. That flexibility need is still exactly right, but the table format didn't
actually deliver on it — it's still just rows of text. **Redesigned to a single uploaded,
self-contained interactive HTML diagram instead** — draw whatever you need (a system
architecture, a wiring diagram, a software module map, anything) in whatever tool you
like, export it as one interactive file, and drop it in. This trades a rigid, if flexible,
data structure for genuine creative freedom, at the cost of the content becoming opaque to
the app (it's a file, not queryable data).

- **Tool-agnostic by design.** The app accepts any self-contained interactive HTML
  export — it doesn't require or specially detect any particular tool. **draw.io
  (diagrams.net)** is the recommended path: free, open-source, and its File → Export as →
  HTML produces a genuinely interactive file (pan/zoom, layers/tags toggling, clickable
  links and tooltips on shapes), with built-in multi-page support if one diagram needs
  several "pages" (e.g. one per subsystem). **Caveat worth knowing:** by default that HTML
  export loads its rendering engine from draw.io's own servers, which needs an internet
  connection to display — draw.io also ships a self-hostable `viewer-static.min.js` for
  fully offline use, which is the more fitting choice for a local-first tool. This isn't
  enforced by the app itself; it's a note for however the diagram actually gets made.
- **One diagram per project**, stored as `data/diagrams/{id}.html` — a sibling to the
  `data/projects/{id}.json` files, not inlined into the project's own JSON (an interactive
  HTML export can run from tens of KB to several MB with embedded fonts/scripts, which
  doesn't belong stuffed next to a project's title and notes). The project JSON only holds
  a lightweight reference: `diagram: {originalFilename, uploadedAt} | null`.
- **Rendered in an isolated `<iframe>`**, sourced from a dedicated API route
  (`/api/projects/{id}/diagram`) rather than injected into the page directly — this keeps
  the uploaded file's own scripts and styles fully separate from the rest of the app,
  rather than dealing with re-running scripts by hand via `dangerouslySetInnerHTML`.
- **Upload, replace, remove** — same locked-on-completed convention as every other widget
  (see "Locking a completed project"): controls disappear entirely once a project is
  completed, but the diagram itself keeps rendering and stays interactive to *view*.
- **15MB upload cap**, and the app only checks the file extension (`.html`/`.htm`) — no
  deeper validation of what's inside, consistent with this being a single-user local tool
  with no one else's content to guard against.
- **Two export formats, two different strategies for this section.** Markdown is built;
  PDF export is planned but deliberately not built yet (no PDF-generation code exists in
  the app). The split:
  - **Markdown gets `diagramDescription`** — a short hand-written explanation of the
    technical specifications, since an interactive HTML file can't be embedded in a `.md`
    file at all. It's edited through a collapsed **"+ add an export description"** toggle
    inside the Technical specifications card, deliberately hidden from the normal page
    view — the live page's version of this section *is* the interactive diagram; this text
    exists solely to give the Markdown export real content instead of a placeholder note.
    It's independent of the diagram file itself (see `normalizeDiagram()` in
    `projectRepository.js`): uploading, replacing, or removing the diagram doesn't touch
    it. If left blank, the export falls back to a short note that a diagram is attached and
    points back to the live page, rather than omitting the section.
  - **PDF export (future) is planned to embed a static image** of the diagram instead —
    a PDF page can't be interactive anyway, so a rendered snapshot is the right fit there
    in a way it isn't for Markdown. This resolves what used to be an open question about
    adding a static-image fallback to the *Markdown* export (base64 vs. a `.zip` bundle) —
    that question doesn't apply to Markdown anymore, and moves to PDF export once that's
    actually built (where it'll need its own answer: uploaded alongside the interactive
    HTML? generated server-side from it? — not designed yet).
- **Position unchanged**: still visible from "planned" onward, still positioned before the
  roadmap (`description → vision → technical specs → roadmap`) — same reasoning as before,
  picking your stack/approach typically precedes planning build steps. The display label
  stays "Technical specifications," since it's the same conceptual slot in the project
  flow; only the field key (`diagram`) and the content shape changed.
- **No migration from the old table.** The old `technicalSpecs` field is dropped on next
  read of any project that still has it (see `normalizeDiagram()` in
  `projectRepository.js`) — there was no real project data in it yet, so this was treated
  as a clean removal rather than something needing a data migration.

## Visual style

**Direction:** a light drafting/blueprint aesthetic — grid paper, hairline strokes, and small corner registration marks (echoing PCB fiducials and technical drawing conventions), on a pale cool-white background. Technical because it borrows the vernacular of the tools actually used (KiCad, GitHub), not because it's dark.

**Palette:**

| Name | Hex | Use |
|---|---|---|
| Paper | `#F7F8FA` | Page background |
| Ink | `#1E2733` | Primary text |
| Line | `#DCE1E8` | Grid lines, hairline borders |
| Circuit blue | `#2955C5` | Primary accent, "active" status |
| Slate | `#6B7684` | Secondary text, "idea" status |
| Signal amber | `#B96E1E` | "planned" status |
| Moss | `#2F7D58` | "completed" status |
| Clay | `#8B6F4E` | "archived" status |

Three structural neutrals (Paper, Ink, Line) plus one color per project status, in lifecycle order: **idea (Slate) → planned (Amber) → active (Circuit blue) → completed (Moss) → archived (Clay)**. Status tags and any status-ordered UI (filter tabs, legends) should always list stages in this order, not alphabetically or by color.

**Type:**
- Headings — Space Grotesk (weight 500), used sparingly
- Body text — IBM Plex Sans
- Metadata (status tags, dates, categories) — IBM Plex Mono

**Layout:**
- Faint grid-paper background (24px grid, very low-opacity lines) behind page content
- Cards with 0.5px hairline borders in Line, 8px corner radius — no shadows
- Small `+` registration marks at card corners as the one signature/decorative touch

**Note for implementation:** keep the grid opacity low — it should read as texture, not pattern. If it ever feels busy, dial that down before touching the palette or corner marks.

## Status

**Built:**
- Dashboard with status tabs (idea, planned, active, completed, archived), a collapsed trait filter with any/all matching, and card grid
- New-idea capture page (title + one-line note only)
- Project detail page — every field, including title, is plain text with a pencil to edit and confirm/cancel to save; no page-wide save button. Buttons to advance status, mark active projects completed/archived, or unarchive
- Traits: search-and-select picker, multi-value, freeform vocabulary
- Components + costs: structured table (name/link as one clickable field, numeric price,
  notes, running total), whole-row editing, replacing the old plain-text list
- Roadmap: vertical timeline, drag-to-reorder steps, 3-state status, nested per-step to-do lists with their own 3-state status, their own independent drag-to-reorder, collapse/expand, and the two auto-behaviors (auto-expand on in-progress, auto-complete on all-todos-done). Each step also has an editable, auto-stamped `completedDate` — the roadmap now doubles as the finished timeline once a project is completed, so the separate `timeline` field has been removed
- Export to Markdown: single-project export from the detail page, field checklist driven
  by the same status-based visibility as the page itself
- Technical specifications: single uploaded, self-contained interactive HTML diagram
  (tool-agnostic, draw.io recommended) rendered in an isolated iframe, visible from
  "planned" onward (same visibility tier as the roadmap) — replaced the earlier freeform
  label -> multiple-values table. Also carries an independent, hidden-by-default
  `diagramDescription` used by the Markdown export (see "Technical diagram" above)
- Features: bulleted list widget (`FeaturesList.js`) supporting Feature Name and Description inline (`Name - Description`), collapsible sub-feature lists (covering sub-features and add inputs when collapsed), drag-to-reorder, inline editing, and deletion; visible from "planned" onward
- Research: structured entry widget (`ResearchList.js`) sitting unboxed directly on the page layout, supporting Article Name, Article Link (hidden within name as a link when not editing), and an indented Description below; moved from active-only to visible from "planned" onward so research material can be collected during initial project planning
- Completed projects lock every field except Insights and Next steps; "Mark completed"
  now confirms first, and a "Move back to active" button on completed projects lifts the
  lock again

**Deferred on purpose:**
- **PDF export** — a second export format alongside Markdown, planned to embed a static
  image of the technical diagram (Markdown uses a hand-written description instead — see
  "Technical diagram" above). No PDF-generation code exists yet.
- Gating (requirement data exists in `ADVANCE_REQUIREMENTS`, not enforced yet)
- Linking related projects together in the UI (`links` field exists on the data model, no UI yet)
- Grouping/categorizing traits, if the list gets large
- Swapping JSON files for a database, if the project graph ever outgrows them (`lib/projectRepository.js` is the only file that should need to change)
- Bulk/dashboard-level export (multiple projects at once) — single-project export was
  built first since it's the more immediate need

## Important notes

- This is a fluid project — keep it as modularized as possible so it's easy to change things later. The layered architecture and repository pattern above are specifically meant to support that.