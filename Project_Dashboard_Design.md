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
  category, links: [{ toId, relationship }],   // optional even at "idea"
  description,   // starts as a one-liner, expanded in place at "planned"
  vision,
  roadmap: [...],       // initial approach at "planned", fleshed out at "active"
  components: [...],    // optional, mainly filled in by "active"
  location: { type: "github" | "kicad" | ..., url },
  todos: [...], research: [...],
  archivedReason, blockers,
  timeline: [{ date, event }],
  insights, nextSteps
}
```

Note that `description` is a single field, not separate brief/detailed versions — it just gets expanded in place once the project moves to Planned. All fields past `status` are optional — visibility is handled separately (see below), not by having separate schemas.

### Status-driven field visibility

Which fields are shown is determined by the project's current `status`, and is additive as the project progresses (each stage shows everything the previous stage showed, plus its own extras):

| Field | Idea | Planned | Active | Archived | Completed |
|---|---|---|---|---|---|
| Name, one-line description | ✓ | ✓ | ✓ | ✓ | ✓ |
| Category, links to other projects | optional | ✓ | ✓ | ✓ | ✓ |
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

## Tentative timeline

1. Determine the overall architecture of the project *(done — this document)*
2. Simple version of the Idea, Planned, Tracker, and Completed pages
   - Idea page: name + one-line note only
   - Planned page: description, vision, and initial approach
   - Tracker page: shows in-progress projects and current focus
   - Completed page: shows completed projects with description + vision
3. Repeatedly improve the pages by adding/polishing features

## Important notes

- This is a fluid project — keep it as modularized as possible so it's easy to change things later. The layered architecture and repository pattern above are specifically meant to support that.
