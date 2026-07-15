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
  roadmap: [...],       // initial approach at "planned", fleshed out at "active"
                         // each step: {id, text, status, todos: [{id, text, status}]}
  components: [...],    // optional, mainly filled in by "active"
  location: { type: "github" | "kicad" | ..., url },
  todos: [...], research: [...],
  archivedReason, blockers,
  timeline: [{ date, event }],
  insights, nextSteps
}
```

Note that `description` is a single field, not separate brief/detailed versions — it just gets expanded in place once the project moves to Planned. All fields past `status` are optional — visibility is handled separately (see below), not by having separate schemas.

`traits` replaced the original single `category` field — a project can carry any number of them (e.g. `["hardware", "digital logic"]`), rather than being sorted into one bucket. The set of known traits isn't a fixed list anywhere; it's derived from whatever traits are actually in use across all projects, so the vocabulary grows organically as new traits are typed in.

### Status-driven field visibility

Which fields are shown is determined by the project's current `status`, and is additive as the project progresses (each stage shows everything the previous stage showed, plus its own extras):

| Field | Idea | Planned | Active | Archived | Completed |
|---|---|---|---|---|---|
| Name, one-line description | ✓ | ✓ | ✓ | ✓ | ✓ |
| Traits, links to other projects | optional | ✓ | ✓ | ✓ | ✓ |
| Expanded description, vision | | ✓ | ✓ | ✓ | ✓ |
| Initial roadmap / approach | | ✓ | ✓ | ✓ | ✓ |
| Components + costs, detailed roadmap | | optional | ✓ | ✓ | ✓ |
| Location, to-dos, research | | | ✓ | ✓ | ✓ |
| Reason archived, blockers | | | | ✓ | |
| Finalized timeline, insights, next steps | | | | | ✓ |

**Implementation note:** keep this mapping in one config file (e.g. `projectFieldConfig.js`) rather than scattering `if (status === ...)` checks across page components. Each page reads from this config to decide what to render. Adjusting what's visible at a given stage later means editing one file, not several components.

### Gating (future enhancement, not v1)

Since the field-visibility config already defines what's expected at each stage, a natural follow-on is a parallel "required to advance" list. The two natural checkpoints are:

- **Idea → Planned:** requires a fleshed-out description + a vision
- **Planned → Active:** requires at least an initial roadmap/approach

This doesn't need to be built now, but the groundwork (the config-driven field model) makes it a small addition later rather than a redesign.

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

### Roadmap timeline (UI pattern)

The roadmap is a vertical timeline, not the original plain "one step per line" text field:

- Each step has a 3-state status (not started / in progress / done) — click its dot to cycle through them
- Steps are drag-to-reorder; a progress bar at the top reflects steps completed, not to-do counts
- Each step has its own nested to-do list (see below), collapsed by default
- Editing a step's or to-do's text uses the same pencil/confirm/cancel pattern as everywhere else

**Nested to-dos:** each step can carry its own mini to-do list — same 3-state status and edit pattern as steps, but *not* drag-to-reorder (order doesn't matter for them). A collapse/expand chevron sits next to each step's pencil/× to show or hide its to-dos.

**Two automatic behaviors:**
- Setting a step to "in progress" auto-expands its to-do list
- Completing the last to-do under a step auto-completes the step

Both are one-directional — completing to-dos can push a step *toward* done, but nothing ever auto-reverts a step away from done. This matters because manually marking a step done early (before its to-dos are finished) is explicitly allowed; if reopening a to-do afterward auto-reverted the step, that manual override would silently get undone.

Expand/collapse state isn't persisted — it's recomputed on page load from whether a step is in progress, so it doesn't need its own saved field.

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
- Roadmap: vertical timeline, drag-to-reorder steps, 3-state status, nested per-step to-do lists with their own 3-state status, collapse/expand, and the two auto-behaviors (auto-expand on in-progress, auto-complete on all-todos-done)

**Deferred on purpose:**
- Gating (requirement data exists in `ADVANCE_REQUIREMENTS`, not enforced yet)
- Linking related projects together in the UI (`links` field exists on the data model, no UI yet)
- Grouping/categorizing traits, if the list gets large
- Swapping JSON files for a database, if the project graph ever outgrows them (`lib/projectRepository.js` is the only file that should need to change)

## Important notes

- This is a fluid project — keep it as modularized as possible so it's easy to change things later. The layered architecture and repository pattern above are specifically meant to support that.