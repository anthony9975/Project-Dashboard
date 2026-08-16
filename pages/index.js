// UI Layer — Main Dashboard Page
// Displays all projects in a card grid filtered by status stage tabs and dynamic traits.
// Uses getServerSideProps to load initial data directly from lib/projectRepository.js on the server.

import { useState } from 'react';
import Link from 'next/link';
import { getAllProjects } from '../lib/projectRepository';
import { STATUS_ORDER, STATUS_LABELS } from '../lib/projectFieldConfig';
import Fiducials from '../components/Fiducials';
import TraitPicker from '../components/TraitPicker';

export async function getServerSideProps() {
  const projects = getAllProjects();
  return { props: { projects } };
}

export default function Dashboard({ projects }) {
  const [filter, setFilter] = useState('all');
  const [selectedTraits, setSelectedTraits] = useState([]);
  const [matchMode, setMatchMode] = useState('any');

  const allTraits = Array.from(
    new Set(projects.flatMap((p) => p.traits || []))
  ).sort();

  const visible = projects
    .filter((p) => filter === 'all' || p.status === filter)
    .filter((p) => {
      if (selectedTraits.length === 0) return true;
      const projectTraits = p.traits || [];
      return matchMode === 'all'
        ? selectedTraits.every((t) => projectTraits.includes(t))
        : selectedTraits.some((t) => projectTraits.includes(t));
    });

  return (
    <div className="container">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 20,
        }}
      >
        <h1>Project dashboard</h1>
        <Link href="/new" className="btn">
          + new idea
        </Link>
      </div>

      <div className="tabs">
        <button
          className={`tab${filter === 'all' ? ' active-tab' : ''}`}
          onClick={() => setFilter('all')}
        >
          all
        </button>
        {STATUS_ORDER.map((status) => (
          <button
            key={status}
            className={`tab${filter === status ? ' active-tab' : ''}`}
            onClick={() => setFilter(status)}
          >
            {STATUS_LABELS[status].toLowerCase()}
          </button>
        ))}
      </div>

      {allTraits.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <TraitPicker
            value={selectedTraits}
            onChange={setSelectedTraits}
            options={allTraits}
            allowAdd={false}
            variant="compact"
            matchMode={matchMode}
            onMatchModeChange={setMatchMode}
          />
        </div>
      )}

      {visible.length === 0 && <p style={{ color: 'var(--slate)' }}>Nothing here yet.</p>}

      <div className="grid">
        {visible.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="card"
            style={{ display: 'block' }}
          >
            <Fiducials />
            <div className="heading" style={{ fontSize: 14, marginBottom: 6 }}>
              {project.title}
            </div>
            <div style={{ fontSize: 12, color: 'var(--slate)', marginBottom: 10, minHeight: 32 }}>
              {project.note || project.description || ''}
            </div>
            {project.traits && project.traits.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {project.traits.map((trait) => (
                  <span key={trait} className="trait-chip">
                    {trait}
                  </span>
                ))}
              </div>
            )}
            <span className={`tag tag-${project.status}`}>{project.status}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}