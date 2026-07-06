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

### One unified `Project` entity, not four separate schemas

Rather than each page (Idea / Tracker / Archive / Completed) having its own data shape, every project is a single object that moves through a `status` field: `idea → active → archived / completed`, with `archived → active` (unarchive) as a valid transition too. Moving a project between stages becomes a one-field update, not a data migration.

Rough shape:

```
{
  id, title, status: "idea" | "active" | "archived" | "completed",
  category, description, vision,
  links: [{ toId, relationship }],
  components: [...], roadmap: [...],
  location: { type: "github" | "kicad" | ..., url },
  todos: [...], research: [...],
  archivedReason, blockers,
  timeline: [{ date, event }],
  insights, nextSteps
}
```

All fields past `status` are optional — visibility is handled separately (see below), not by having separate schemas.

### Status-driven field visibility

Which fields are shown is determined by the project's current `status`, and is additive as the project progresses (each stage shows everything the previous stage showed, plus its own extras):

| Field | Idea | Active | Archived | Completed |
|---|---|---|---|---|
| Description, vision | ✓ | ✓ | ✓ | ✓ |
| Category, links to other projects | ✓ | ✓ | ✓ | ✓ |
| Components + costs, rough roadmap | optional | ✓ | ✓ | ✓ |
| Location, to-dos, research | | ✓ | ✓ | ✓ |
| Reason archived, blockers | | | ✓ | |
| Finalized timeline, insights, next steps | | | | ✓ |

**Implementation note:** keep this mapping in one config file (e.g. `projectFieldConfig.js`) rather than scattering `if (status === ...)` checks across page components. Each page reads from this config to decide what to render. Adjusting what's visible at a given stage later means editing one file, not several components.

### Gating (future enhancement, not v1)

Since the field-visibility config already defines what's expected at each stage, a natural follow-on is a parallel "required to advance" list — e.g. a project can't move from Idea to Active until description and vision are filled in. This doesn't need to be built now, but the groundwork (the config-driven field model) makes it a small addition later rather than a redesign.

### Assumption

This is a single-user, local-first tool — run on one's own machine, no login system, no multi-user concerns. No auth layer or permissions needed as a result.

## Tentative timeline

1. Determine the overall architecture of the project *(done — this document)*
2. Simple version of the Idea, Tracker, and Completed pages
   - Idea page: must-haves only
   - Tracker page: shows in-progress projects and current focus
   - Completed page: shows completed projects with description + vision
3. Repeatedly improve the pages by adding/polishing features

## Important notes

- This is a fluid project — keep it as modularized as possible so it's easy to change things later. The layered architecture and repository pattern above are specifically meant to support that.
