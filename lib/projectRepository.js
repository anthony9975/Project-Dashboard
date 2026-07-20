// Data access layer. Everything above this (API routes, pages) calls these functions and
// never touches the filesystem directly. If storage ever moves off JSON files (e.g. to
// SQLite), this is the only file that needs to change.
//
// This now also owns a second, sibling storage location: data/diagrams/{id}.html, one
// uploaded interactive diagram file per project (see DiagramSlot.js / the "Technical
// diagram" section in Project_Dashboard_Design.md). It's kept as a plain file on disk
// rather than a string inside the project's JSON — an uploaded HTML export can be a few
// hundred KB to several MB with embedded fonts/scripts, which doesn't belong inlined into
// a small JSON record next to a project's title and notes. The project JSON only stores
// lightweight metadata (`diagram: {originalFilename, uploadedAt} | null`) pointing at it.

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data', 'projects');
const DIAGRAMS_DIR = path.join(process.cwd(), 'data', 'diagrams');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function ensureDiagramsDir() {
  if (!fs.existsSync(DIAGRAMS_DIR)) {
    fs.mkdirSync(DIAGRAMS_DIR, { recursive: true });
  }
}

function diagramPath(id) {
  return path.join(DIAGRAMS_DIR, `${id}.html`);
}

function blankProject({ id, title, note }) {
  const now = new Date().toISOString();
  return {
    id,
    title,
    note,
    status: 'idea',
    traits: [],
    description: '',
    vision: '',
    diagram: null,
    diagramDescription: '',
    roadmap: [],
    components: [],
    location: '',
    research: [],
    archivedReason: '',
    blockers: '',
    insights: '',
    nextSteps: '',
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeProject(project) {
  let result = project;
  result = normalizeRoadmap(result);
  result = normalizeComponents(result);
  result = normalizeDiagram(result);
  return result;
}

function normalizeRoadmap(project) {
  // Roadmap steps used to be plain strings; they're now {id, text, status, todos,
  // completedDate} objects so status can be tracked per step and per sub-task, and
  // completion date per step. Upgrade old data transparently on read rather than
  // requiring a manual migration — it gets re-saved in the new shape the next time
  // anything on the project changes.
  if (!Array.isArray(project.roadmap)) return project;
  let changed = false;
  const roadmap = project.roadmap.map((s, i) => {
    if (typeof s === 'string') {
      changed = true;
      return { id: `legacy-${i}`, text: s, status: 'not_started', todos: [], completedDate: '' };
    }
    let step = s;
    if (!Array.isArray(step.todos)) {
      changed = true;
      step = { ...step, todos: [] };
    }
    if (step.completedDate === undefined) {
      changed = true;
      step = { ...step, completedDate: '' };
    }
    return step;
  });
  return changed ? { ...project, roadmap } : project;
}

function normalizeComponents(project) {
  // Components used to be plain strings (one per line in a text box); they're now
  // {id, name, link, price, notes} objects so cost can be tracked as a real number and
  // summed into a total. Old string entries become just a `name`, everything else blank —
  // same transparent-upgrade-on-read pattern as the roadmap.
  if (!Array.isArray(project.components)) return project;
  let changed = false;
  const components = project.components.map((c, i) => {
    if (typeof c === 'string') {
      changed = true;
      return { id: `legacy-${i}`, name: c, link: '', price: null, notes: '' };
    }
    let component = c;
    if (component.link === undefined) {
      changed = true;
      component = { ...component, link: '' };
    }
    if (component.price === undefined) {
      changed = true;
      component = { ...component, price: null };
    }
    if (component.notes === undefined) {
      changed = true;
      component = { ...component, notes: '' };
    }
    return component;
  });
  return changed ? { ...project, components } : project;
}

function normalizeDiagram(project) {
  // "technicalSpecs" (the old freeform label -> values table) was fully replaced by a
  // single uploaded interactive HTML diagram. Unlike every other schema change in this
  // file, old data in the legacy field isn't upgraded into a new shape — it's dropped.
  // There was no real project data in it yet (confirmed before making this change, same
  // "safe to drop" bar as the earlier `todos` field removal — see context.md), and there's
  // no reasonable automatic mapping from a label/values table to an uploaded diagram file
  // anyway. `diagram` defaults to null for any project that predates this field.
  //
  // `diagramDescription` is deliberately independent of `diagram` — it's a hand-written
  // explanation of the technical specifications used for Markdown export (see
  // exportProject.js), not metadata about the uploaded file. It persists across
  // uploading/replacing/removing the diagram itself, so it defaults to '' here rather than
  // being reset whenever `diagram` changes.
  let changed = false;
  let result = project;
  if ('technicalSpecs' in result) {
    const { technicalSpecs, ...rest } = result;
    result = rest;
    changed = true;
  }
  if (result.diagram === undefined) {
    result = { ...result, diagram: null };
    changed = true;
  }
  if (result.diagramDescription === undefined) {
    result = { ...result, diagramDescription: '' };
    changed = true;
  }
  return changed ? result : project;
}

export function getAllProjects() {
  ensureDataDir();
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'));
  return files
    .map((file) => normalizeProject(JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8'))))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export function getProject(id) {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) return null;
  return normalizeProject(JSON.parse(fs.readFileSync(filePath, 'utf-8')));
}

export function saveProject(project) {
  ensureDataDir();
  const updated = { ...project, updatedAt: new Date().toISOString() };
  fs.writeFileSync(path.join(DATA_DIR, `${updated.id}.json`), JSON.stringify(updated, null, 2));
  return updated;
}

export function createProject({ title, note }) {
  ensureDataDir();
  const id = `${Date.now()}`;
  const project = blankProject({ id, title, note: note || '' });
  fs.writeFileSync(path.join(DATA_DIR, `${id}.json`), JSON.stringify(project, null, 2));
  return project;
}

export function getAllTraits() {
  const projects = getAllProjects();
  return Array.from(new Set(projects.flatMap((p) => p.traits || []))).sort();
}

// --- Diagram file storage -------------------------------------------------------------
// One uploaded file per project, named by project id so there's never more than one on
// disk per project (a new upload / saveDiagramFile call simply overwrites the old file —
// "replace" and "first upload" are the same operation from this layer's point of view).

export function saveDiagramFile(id, buffer) {
  ensureDiagramsDir();
  fs.writeFileSync(diagramPath(id), buffer);
}

export function getDiagramFile(id) {
  const filePath = diagramPath(id);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath);
}

export function deleteDiagramFile(id) {
  const filePath = diagramPath(id);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}