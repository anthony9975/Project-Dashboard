import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { getProject } from '../../lib/projectRepository';
import { STATUS_LABELS, fieldsFor, nextStatus } from '../../lib/projectFieldConfig';

export async function getServerSideProps({ params }) {
  const project = getProject(params.id);
  if (!project) return { notFound: true };
  return { props: { project } };
}

const LABELS = {
  note: 'One-line note',
  traits: 'Traits (one per line, e.g. software, hardware)',
  description: 'Description',
  vision: 'Vision',
  roadmap: 'Roadmap (one step per line)',
  components: 'Components + costs (one per line)',
  location: 'Location (repo, KiCad project, etc.)',
  todos: 'To-dos (one per line)',
  research: 'Research (one link/note per line)',
  archivedReason: 'Why archived',
  blockers: 'Blockers',
  timeline: 'Timeline (one entry per line)',
  insights: 'Insights',
  nextSteps: 'Next steps',
};

const LIST_FIELDS = new Set(['traits', 'roadmap', 'components', 'todos', 'research', 'timeline']);

function toText(value) {
  if (Array.isArray(value)) return value.join('\n');
  return value || '';
}

export default function ProjectDetail({ project }) {
  const router = useRouter();
  const fields = fieldsFor(project.status).filter((f) => f !== 'title');
  const [values, setValues] = useState(() => {
    const initial = {};
    fields.forEach((f) => {
      initial[f] = toText(project[f]);
    });
    return initial;
  });
  const [saving, setSaving] = useState(false);

  async function save(extra = {}) {
    setSaving(true);
    const payload = { ...extra };
    fields.forEach((f) => {
      payload[f] = LIST_FIELDS.has(f)
        ? values[f]
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean)
        : values[f];
    });
    await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    router.reload();
  }

  const forward = nextStatus(project.status);

  return (
    <div className="container" style={{ maxWidth: 640 }}>
      <Link href="/" style={{ fontSize: 13 }}>
        &larr; all projects
      </Link>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          margin: '16px 0 20px',
        }}
      >
        <h1>{project.title}</h1>
        <span className={`tag tag-${project.status}`}>{project.status}</span>
      </div>

      {fields.map((f) => (
        <div className="field-block" key={f}>
          <div className="field-label">{LABELS[f]}</div>
          <textarea
            rows={LIST_FIELDS.has(f) ? 3 : 2}
            value={values[f]}
            onChange={(e) => setValues({ ...values, [f]: e.target.value })}
          />
        </div>
      ))}

      <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
        <button className="btn" onClick={() => save()} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>

        {forward && (
          <button className="btn" onClick={() => save({ status: forward })} disabled={saving}>
            Move to {STATUS_LABELS[forward].toLowerCase()} &rarr;
          </button>
        )}

        {project.status === 'active' && (
          <>
            <button className="btn" onClick={() => save({ status: 'completed' })} disabled={saving}>
              Mark completed
            </button>
            <button className="btn" onClick={() => save({ status: 'archived' })} disabled={saving}>
              Archive
            </button>
          </>
        )}

        {project.status === 'archived' && (
          <button className="btn" onClick={() => save({ status: 'active' })} disabled={saving}>
            Unarchive
          </button>
        )}
      </div>
    </div>
  );
}
