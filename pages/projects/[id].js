import { useState } from 'react';
import Link from 'next/link';
import { getProject, getAllTraits } from '../../lib/projectRepository';
import { STATUS_LABELS, fieldsFor, nextStatus } from '../../lib/projectFieldConfig';
import TraitPicker from '../../components/TraitPicker';
import EditableField from '../../components/EditableField';
import RoadmapTimeline from '../../components/RoadmapTimeline';
import ComponentsTable from '../../components/ComponentsTable';

export async function getServerSideProps({ params }) {
  const project = getProject(params.id);
  if (!project) return { notFound: true };
  return { props: { project, allTraits: getAllTraits() } };
}

const LABELS = {
  note: 'One-line note',
  description: 'Description',
  vision: 'Vision',
  location: 'Location (repo, KiCad project, etc.)',
  research: 'Research (one link/note per line)',
  archivedReason: 'Why archived',
  blockers: 'Blockers',
  insights: 'Insights',
  nextSteps: 'Next steps',
};

const LIST_FIELDS = new Set(['research']);

// Each field saves itself independently now (see EditableField) — there's no page-wide
// "Save changes" button anymore. Status changes are the one thing that still happen via
// dedicated buttons, since they're an action rather than a field edit.
//
// Note: there's no separate "timeline" field or render branch. The roadmap (rendered below,
// via RoadmapTimeline) is already visible from "planned" onward and carries per-step
// completedDate, so it doubles as the finished timeline once a project reaches "completed" —
// fieldsFor('completed') simply doesn't include 'timeline' anymore, so nothing extra is
// needed here to hide it.
export default function ProjectDetail({ project: initialProject, allTraits }) {
  const [project, setProject] = useState(initialProject);
  const [statusSaving, setStatusSaving] = useState(false);

  const fields = fieldsFor(project.status).filter((f) => f !== 'title' && f !== 'traits');
  const showTraits = fieldsFor(project.status).includes('traits');

  async function saveField(key, value) {
    const res = await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    });
    const updated = await res.json();
    setProject(updated);
  }

  async function changeStatus(newStatus) {
    setStatusSaving(true);
    await saveField('status', newStatus);
    setStatusSaving(false);
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
          alignItems: 'flex-start',
          margin: '16px 0 4px',
          gap: 12,
        }}
      >
        <EditableField
          label="Title"
          value={project.title}
          headingDisplay
          onSave={(v) => saveField('title', v)}
        />
        <span className={`tag tag-${project.status}`} style={{ marginTop: 6 }}>
          {project.status}
        </span>
      </div>

      {showTraits && (
        <div className="field-block">
          <div className="field-label">Traits</div>
          <TraitPicker
            value={project.traits || []}
            options={allTraits}
            onChange={(traits) => saveField('traits', traits)}
          />
        </div>
      )}

      {fields.map((f) =>
        f === 'roadmap' ? (
          <div className="field-block" key="roadmap">
            <div className="field-label">Roadmap</div>
            <RoadmapTimeline
              value={project.roadmap || []}
              onChange={(roadmap) => saveField('roadmap', roadmap)}
            />
          </div>
        ) : f === 'components' ? (
          <div className="field-block" key="components">
            <div className="field-label">Components + costs</div>
            <ComponentsTable
              value={project.components || []}
              onChange={(components) => saveField('components', components)}
            />
          </div>
        ) : (
          <EditableField
            key={f}
            label={LABELS[f]}
            value={project[f]}
            isList={LIST_FIELDS.has(f)}
            rows={LIST_FIELDS.has(f) ? 3 : 2}
            onSave={(v) => saveField(f, v)}
          />
        )
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
        {forward && (
          <button className="btn" onClick={() => changeStatus(forward)} disabled={statusSaving}>
            Move to {STATUS_LABELS[forward].toLowerCase()} &rarr;
          </button>
        )}

        {project.status === 'active' && (
          <>
            <button className="btn" onClick={() => changeStatus('completed')} disabled={statusSaving}>
              Mark completed
            </button>
            <button className="btn" onClick={() => changeStatus('archived')} disabled={statusSaving}>
              Archive
            </button>
          </>
        )}

        {project.status === 'archived' && (
          <button className="btn" onClick={() => changeStatus('active')} disabled={statusSaving}>
            Unarchive
          </button>
        )}
      </div>
    </div>
  );
}