import { useState } from 'react';
import Link from 'next/link';
import { getAllProjects } from '../lib/projectRepository';
import { STATUS_ORDER, STATUS_LABELS } from '../lib/projectFieldConfig';
import Fiducials from '../components/Fiducials';

export async function getServerSideProps() {
  const projects = getAllProjects();
  return { props: { projects } };
}

export default function Dashboard({ projects }) {
  const [filter, setFilter] = useState('all');
  const visible = filter === 'all' ? projects : projects.filter((p) => p.status === filter);

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
            <span className={`tag tag-${project.status}`}>{project.status}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
