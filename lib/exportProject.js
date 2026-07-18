// Turns a project object into a Markdown document, including only the fields the caller
// selects. Kept separate from ExportModal so the generation logic can be reused by any
// future export entry point (e.g. a dashboard-level bulk export) without duplicating it.

function slugify(title) {
  const slug = (title || 'project')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return slug || 'project';
}

function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatPrice(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '';
  return `$${n.toFixed(2)}`;
}

// Roadmap/to-do status rendered as a Markdown task-list checkbox. "~" for in-progress
// isn't standard Markdown but is a widely-understood convention and reads fine as plain text.
const STATUS_MARK = { not_started: ' ', in_progress: '~', done: 'x' };

function renderRoadmap(steps) {
  if (!steps || steps.length === 0) return '_No roadmap steps yet._';
  return steps
    .map((step) => {
      const mark = STATUS_MARK[step.status] ?? ' ';
      const date = step.completedDate ? ` (completed ${formatDate(step.completedDate)})` : '';
      const lines = [`- [${mark}] ${step.text}${date}`];
      (step.todos || []).forEach((todo) => {
        const tmark = STATUS_MARK[todo.status] ?? ' ';
        lines.push(`  - [${tmark}] ${todo.text}`);
      });
      return lines.join('\n');
    })
    .join('\n');
}

function renderComponents(items) {
  if (!items || items.length === 0) return '_No components yet._';
  const priced = items.filter((c) => typeof c.price === 'number' && !Number.isNaN(c.price));
  const rows = items.map((c) => {
    const name = c.link ? `[${c.name || '—'}](${c.link})` : c.name || '—';
    return `| ${name} | ${formatPrice(c.price)} | ${c.notes || ''} |`;
  });
  const table = ['| Component | Price | Notes |', '| --- | --- | --- |', ...rows].join('\n');
  if (priced.length === 0) return table;
  const total = priced.reduce((sum, c) => sum + c.price, 0);
  return `${table}\n\n**Total:** ${formatPrice(total)}`;
}

function renderTechnicalSpecs(specs) {
  if (!specs || specs.length === 0) return '_No technical specifications yet._';
  return specs.map((s) => `- **${s.label || '—'}:** ${(s.values || []).join(', ')}`).join('\n');
}

function renderList(items) {
  if (!items || items.length === 0) return '_None yet._';
  return items.map((i) => `- ${i}`).join('\n');
}

function renderText(value) {
  const text = (value || '').trim();
  return text ? text : '_None yet._';
}

// One renderer per exportable field. Each returns a heading + body, or '' to skip the
// section entirely (used when a list-ish field, like traits, has nothing in it).
const SECTION_RENDERERS = {
  note: (p) => `## One-line note\n\n${renderText(p.note)}`,
  traits: (p) => (p.traits && p.traits.length ? `## Traits\n\n${p.traits.join(', ')}` : ''),
  description: (p) => `## Description\n\n${renderText(p.description)}`,
  vision: (p) => `## Vision\n\n${renderText(p.vision)}`,
  technicalSpecs: (p) => `## Technical specifications\n\n${renderTechnicalSpecs(p.technicalSpecs)}`,
  roadmap: (p) => `## Roadmap\n\n${renderRoadmap(p.roadmap)}`,
  components: (p) => `## Components + costs\n\n${renderComponents(p.components)}`,
  location: (p) => `## Location\n\n${renderText(p.location)}`,
  research: (p) => `## Research\n\n${renderList(p.research)}`,
  archivedReason: (p) => `## Why archived\n\n${renderText(p.archivedReason)}`,
  blockers: (p) => `## Blockers\n\n${renderText(p.blockers)}`,
  insights: (p) => `## Insights\n\n${renderText(p.insights)}`,
  nextSteps: (p) => `## Next steps\n\n${renderText(p.nextSteps)}`,
};

// selectedFields should be passed in the same order the detail page renders them in, so
// the exported doc reads in the same order as the page it came from.
export function buildProjectMarkdown(project, selectedFields) {
  const parts = [`# ${project.title}`, `_Status: ${project.status}_`];
  selectedFields.forEach((key) => {
    const render = SECTION_RENDERERS[key];
    if (!render) return;
    const section = render(project);
    if (section) parts.push(section);
  });
  return parts.join('\n\n') + '\n';
}

export function downloadProjectMarkdown(project, selectedFields) {
  const content = buildProjectMarkdown(project, selectedFields);
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slugify(project.title)}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}