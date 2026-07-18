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
const IDEA_FIELDS = ['title', 'note', 'traits'];
const PLANNED_FIELDS = [...IDEA_FIELDS, 'description', 'vision', 'roadmap'];
const ACTIVE_FIELDS = [...PLANNED_FIELDS, 'components', 'location', 'research'];

export const FIELD_GROUPS = {
  idea: IDEA_FIELDS,
  planned: PLANNED_FIELDS,
  active: ACTIVE_FIELDS,
  archived: [...ACTIVE_FIELDS, 'archivedReason', 'blockers'],
  completed: [...ACTIVE_FIELDS, 'insights', 'nextSteps'],
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
// archived), and archived can move back to active (unarchive), so there's no single "next".
export function nextStatus(status) {
  if (status === 'idea') return 'planned';
  if (status === 'planned') return 'active';
  return null;
}