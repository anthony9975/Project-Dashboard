// Single source of truth for status order and which fields are visible at each stage.
// Pages and API routes read from here rather than checking `status` inline, so changing
// what's visible at a stage later means editing this file, not hunting through components.

export const STATUS_ORDER = ['idea', 'planned', 'active', 'completed', 'archived'];

export const STATUS_LABELS = {
  idea: 'Idea',
  planned: 'Planned',
  active: 'Active',
  completed: 'Completed',
  archived: 'Archived',
};

// Archived and completed both extend "active" independently — neither extends the other.
// "traits" (e.g. software, hardware, digital logic) is available starting at Idea — optional
// there, since Idea is meant to stay near-frictionless, but there if you want to tag while browsing.
//
// "technicalSpecs" sits before "roadmap" deliberately — picking your stack/specs is
// typically a decision made before planning out build steps, so the field order here
// mirrors the order you'd actually think through a project. It's now a single uploaded
// interactive diagram rather than a label -> values table (see "Technical diagram" in
// Project_Dashboard_Design.md) — the field key is `diagram`, but it keeps the same
// "Technical specifications" position and display label since it's the same conceptual
// slot in the project flow, just a different content shape.
//
// "insights" lives in ACTIVE_FIELDS (not a completed-only field) so it's available to jot
// down while a project is actually being worked on, not just written up after the fact.
// It therefore carries forward into both "archived" and "completed" automatically, same as
// every other ACTIVE_FIELDS entry. "nextSteps" stays completed-only — it's inherently a
// look-forward field ("what would I build on this") that only makes sense once a project
// is actually finished.
// "research" is brought into PLANNED_FIELDS alongside "features", so research material
// and feature planning can happen during the planned phase before moving to active.
const IDEA_FIELDS = ['title', 'note', 'traits'];
const PLANNED_FIELDS = [...IDEA_FIELDS, 'description', 'vision', 'diagram', 'features', 'roadmap', 'research'];
const ACTIVE_FIELDS = [...PLANNED_FIELDS, 'components', 'location', 'insights'];

export const FIELD_GROUPS = {
  idea: IDEA_FIELDS,
  planned: PLANNED_FIELDS,
  active: ACTIVE_FIELDS,
  archived: [...ACTIVE_FIELDS, 'archivedReason', 'blockers'],
  completed: [...ACTIVE_FIELDS, 'nextSteps'],
};

export function fieldsFor(status) {
  return FIELD_GROUPS[status] || FIELD_GROUPS.idea;
}

// Not enforced yet (see "Gating" in the design doc) — kept here so the requirement data
// already exists when that feature gets built, instead of needing a redesign later.
export const ADVANCE_REQUIREMENTS = {
  idea: ['description', 'vision'],
  planned: ['roadmap'],
};

// idea -> planned -> active is linear. From "active" the move is manual (completed or
// archived); "archived" can move back to "active" (unarchive), and "completed" can too
// (see isLocked below) — so there's no single "next" past active.
export function nextStatus(status) {
  if (status === 'idea') return 'planned';
  if (status === 'planned') return 'active';
  return null;
}

// A completed project locks every field to preserve it as a finished record, EXCEPT
// "insights" and "nextSteps" — reflections tend to keep evolving after a project wraps up,
// so those two stay editable even once locked. Moving a completed project back to "active"
// (the "Move back to active" button on the detail page) lifts the lock everywhere again.
//
// This is the one place that rule lives — components call isLocked(status) for
// all-or-nothing widgets (traits, diagram, roadmap, components) and
// isLocked(status, field) for individual EditableField instances, rather than each
// component re-deriving "is this completed and not one of the exceptions" itself.
const UNLOCKED_WHEN_COMPLETED = new Set(['insights', 'nextSteps']);

export function isLocked(status, field) {
  if (status !== 'completed') return false;
  if (field && UNLOCKED_WHEN_COMPLETED.has(field)) return false;
  return true;
}