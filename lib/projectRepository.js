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
    timeline: [],
    insights: '',
    nextSteps: '',
    createdAt: now,
    updatedAt: now,
  };
}

export function getAllProjects() {
  ensureDataDir();
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'));
  return files
    .map((file) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8')))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export function getProject(id) {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
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
