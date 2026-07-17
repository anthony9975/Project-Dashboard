// Data access layer. Everything above this (API routes, pages) calls these functions and
// never touches the filesystem directly. If storage ever moves off JSON files (e.g. to
// SQLite), this is the only file that needs to change.

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data', 'projects');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
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
    roadmap: [],
    components: [],
    location: '',
    todos: [],
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