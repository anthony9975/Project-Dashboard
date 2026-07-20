import { useState } from 'react';
import Link from 'next/link';
import { getProject, getAllTraits } from '../../lib/projectRepository';
import { STATUS_LABELS, fieldsFor, nextStatus, isLocked } from '../../lib/projectFieldConfig';
import TraitPicker from '../../components/TraitPicker';
import EditableField from '../../components/EditableField';
import RoadmapTimeline from '../../components/RoadmapTimeline';
import ComponentsTable from '../../components/ComponentsTable';
import DiagramSlot from '../../components/DiagramSlot';
import ExportModal from '../../components/ExportModal';

export async function getServerSideProps({ params }) {
  const project = getProject(params.id);
  if (!project) return { notFound: true };
  return { props: { project, allTraits: getAllTraits() } };
}

const LABELS = {
  note: 'One-line note',
  description: 'Description',
  vision: 'Vision',
  diagram: 'Technical specifications',
  roadmap: 'Roadmap',
  components: 'Components + costs',
  location: 'Location (repo, KiCad project, etc.)',
  research: 'Research (one link/note per line)',
  archivedReason: 'Why archived',
  blockers: 'Blockers',
  insights: 'Insights',
  nextSteps: 'Next steps',
  traits: 'Traits',
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
//
// Locking: a "completed" project locks every field to preserve it as a finished record,
// except "insights" and "nextSteps" (reflections keep evolving after the fact — see
// isLocked() in projectFieldConfig.js, the single source of truth for this rule). `locked`
// below covers the whole-widget fields (traits, diagram, roadmap, components); each
// plain EditableField gets its own per-field lock check so the two exceptions stay editable.
// "Move back to active" lifts the lock everywhere again, same as unarchiving.
//
// Export: the modal reuses `fields` (below) as its checkbox list, so what you can export
// always matches what's actually visible on the page for this project's status — there's
// no separate visibility list to keep in sync. Hidden entirely at "idea" (see
// Project_Dashboard_Design.md — nothing's really been said yet at that stage). Export
// remains available on a locked/completed project — locking only affects editing, not
// reading/exporting.
export default function ProjectDetail({ project: initialProject, allTraits }) {
  const [project, setProject] = useState(initialProject);
  const [statusSaving, setStatusSaving] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const fields = fieldsFor(project.status).filter((f) => f !== 'title' && f !== 'traits');
  const showTraits = fieldsFor(project.status).includes('traits');
  const canExport = project.status !== 'idea';
  const locked = isLocked(project.status);

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

  function handleMarkCompleted() {
    const confirmed = window.confirm(
      'Mark this project as completed? Every field except Insights and Next steps will be locked from editing. You can move it back to active later if you need to make changes.'
    );
    if (!confirmed) return;
    changeStatus('completed');
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
          locked={locked}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
          {canExport && (
            <button type="button" className="btn" onClick={() => setShowExport(true)}>
              Export
            </button>
          )}
          <span className={`tag tag-${project.status}`}>{project.status}</span>
        </div>
      </div>

      {showTraits && (
        <div className="field-block">
          <div className="field-label">Traits</div>
          <TraitPicker
            value={project.traits || []}
            options={allTraits}
            onChange={(traits) => saveField('traits', traits)}
            locked={locked}
          />
        </div>
      )}

      {fields.map((f) =>
        f === 'diagram' ? (
          <div className="field-block" key="diagram">
            <div className="field-label">Technical specifications</div>
            <DiagramSlot
              projectId={project.id}
              diagram={project.diagram}
              onUpdate={(updated) => setProject(updated)}
              locked={locked}
            />
          </div>
        ) : f === 'roadmap' ? (
          <div className="field-block" key="roadmap">
            <div className="field-label">Roadmap</div>
            <RoadmapTimeline
              value={project.roadmap || []}
              onChange={(roadmap) => saveField('roadmap', roadmap)}
              locked={locked}
            />
          </div>
        ) : f === 'components' ? (
          <div className="field-block" key="components">
            <div className="field-label">Components + costs</div>
            <ComponentsTable
              value={project.components || []}
              onChange={(components) => saveField('components', components)}
              locked={locked}
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
            locked={isLocked(project.status, f)}
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
            <button className="btn" onClick={handleMarkCompleted} disabled={statusSaving}>
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

        {project.status === 'completed' && (
          <button className="btn" onClick={() => changeStatus('active')} disabled={statusSaving}>
            ↺ Move back to active
          </button>
        )}
      </div>

      {showExport && (
        <ExportModal
          project={project}
          fields={fields}
          showTraits={showTraits}
          labels={LABELS}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}