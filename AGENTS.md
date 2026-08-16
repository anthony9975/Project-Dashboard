# AGENTS.md

Instructions for any AI agent working in this 
repository. Read this file first, in full, before touching any code. It is a map and a
rulebook — it tells you *what exists and where*, and *what you may not do without asking* —
not a restatement of the project's reasoning or file contents.

## 1. Read order

Before making any change, read in this order:

1. **This file (`AGENTS.md`)** — orientation, boundaries, workflow.
2. **`docs/context.md`** — condensed decision log. Fast-scan version of every key call made so
   far and *why*. Check here first if you're unsure whether something's already been
   decided.
3. **`docs/Codebase.md`** — map of the actual files: what's where, what talks to what, how one
   action flows end-to-end through the four layers.
4. **`docs/Project_Dashboard_Design.md`** — full design reasoning, data shapes, UI patterns,
   palette/type reference. Go here when `docs/context.md`'s condensed version isn't enough
   detail to act on.

If something you're about to do isn't covered by any of the three, don't assume — ask the
user (see §4).

## 2. What this project is

A personal, local-first tool for tracking project ideas from raw idea through completion.
Strictly single-user, runs on one machine, no authentication. Full product context lives in
`docs/Project_Dashboard_Design.md`; the current feature set and what's deliberately deferred are
in its "Status" section.

## 3. Architecture rules (enforced, not optional)

The full rules and reasoning live in `docs/context.md` → "Architecture" and `docs/Codebase.md` →
"Layer by layer." In brief, so you recognize a violation on sight:

- **Strict 4-layer boundary:** UI (`pages/*.js`, `components/`) → API routes
  (`pages/api/**`) → repository (`lib/projectRepository.js`) → storage (`data/**`). Each
  layer only calls the one directly below it.
- **`lib/projectRepository.js` is the only file allowed to touch the filesystem.** No
  exceptions, no "just this once" reads/writes from a page or API route.
- **One `Project` entity**, status-driven, not per-status schemas. Field visibility per
  status is centralized in `lib/projectFieldConfig.js` — never scatter
  `if (status === ...)` checks elsewhere.
- **Old data formats upgrade transparently on read** via `normalizeProject()` in the
  repository. Any new field or shape change needs an upgrade path there, not a one-time
  manual migration script.
- Full current schema, the field-visibility table, and every UI-pattern rationale (editing
  pattern, roadmap auto-behaviors, locking rules, export logic, etc.) are documented in
  `docs/context.md` and `docs/Project_Dashboard_Design.md` — consult them rather than inferring
  behavior from code alone, since some of it (e.g. locking, auto-stamped dates) is easy to
  half-implement if you don't know the exact rule.

## 4. Boundaries — what requires explicit user approval first

**Do not make any major architectural change without the user's strict, explicit
approval.** This includes, but isn't limited to:

- Adding, removing, or reordering a layer (e.g. a page or component calling the
  repository or filesystem directly, bypassing the API layer)
- Changing what the repository pattern's seam covers, or making a second file touch storage
- Changing the storage format (JSON → anything else) or the one-file-per-project convention
- Removing or restructuring an existing top-level `Project` field, unless it's confirmed
  unused/placeholder data first (the established bar — see the `todos` and `technicalSpecs`
  removals in `docs/context.md`)
- Adding a new runtime dependency
- Changing the status lifecycle (`idea → planned → active → archived/completed`) or any
  locking/gating rule

**Do not change any previously established rule or constraint** (in this file, `docs/context.md`,
`docs/Codebase.md`, or `docs/Project_Dashboard_Design.md`) unless there's a valid reason *and* the
user has explicitly permitted it.

When a task seems to require any of the above, stop and ask — don't implement a workaround
that technically avoids the letter of the rule while breaking its intent.

## 5. Workflow

- **Make zero assumptions.** If a request is ambiguous, or could be implemented more than
  one reasonable way, ask before writing code. This is a low-volume, high-context personal
  project — a wrong guess costs more than a clarifying question.
- **Check `docs/context.md` before assuming something is new.** Several past decisions read like
  they'd need re-deciding (e.g. "should to-dos have their own top-level list?") but are
  already settled — re-read before proposing something that contradicts a logged decision.
- **Return complete changed files**, not diffs/snippets, when modifying code — this is the
  established handoff format for this project.
- **After any decision that changes behavior, data shape, or established rules**, update
  the relevant doc:
  - **`docs/context.md`** — new key decisions and the reasoning behind them, in the same
    condensed, dated-log style as existing entries.
  - **`docs/Codebase.md`** — if a file was added, removed, or its responsibility changed.
  - **`docs/Project_Dashboard_Design.md`** — if a feature's full design/reasoning changed, or
    the "Status" (built / deferred) section needs updating.
  - **This file (`AGENTS.md`)** — only if a *rule or boundary itself* changes (e.g. the
    layer structure, the approval bar, the doc set). Don't duplicate feature-level
    decisions here; they belong in `docs/context.md`.
- Match each doc's existing formatting/tone exactly when editing it — don't introduce a new
  structure or voice partway through a file.

## 6. Acknowledgment

Any agent picking up work in this repo should confirm it has read this file and the three
documents in §1 before proposing or writing any code.
