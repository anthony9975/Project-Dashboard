import { useRef, useState } from 'react';

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// A small, collapsed-by-default editor for `diagramDescription` — a hand-written
// explanation of the technical specifications used only by the Markdown export (see
// renderDiagram() in lib/exportProject.js). Deliberately hidden from the normal page view:
// it starts collapsed behind a "+ add an export description" toggle rather than rendering
// inline like every other field, and stays collapsed after saving too (showing only that
// one exists, not its content) — the live page's "Technical specifications" is the
// interactive diagram; this is export-only supporting text, not something to read here.
//
// Independent of `diagram` itself (see normalizeDiagram() in projectRepository.js) — it
// persists across uploading, replacing, or removing the diagram file, since it's an
// explanation of the technical specifications generally, not metadata about one file.
//
// `locked` follows the same convention as everywhere else: hides edit/clear controls but
// still allows reading an existing description (expand to view, just can't change it).
function ExportDescriptionSection({ description, onSave, locked }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(description || '');
  const [saving, setSaving] = useState(false);

  const hasDescription = !!(description && description.trim());

  // Nothing to show and no way to add one — render nothing rather than a dead-end toggle.
  if (!hasDescription && locked) return null;

  function startEdit() {
    setDraft(description || '');
    setEditing(true);
    setExpanded(true);
  }

  function cancelEdit() {
    setEditing(false);
    if (!hasDescription) setExpanded(false);
  }

  async function confirmEdit() {
    setSaving(true);
    await onSave(draft);
    setSaving(false);
    setEditing(false);
  }

  async function handleClear() {
    setSaving(true);
    await onSave('');
    setSaving(false);
    setEditing(false);
    setExpanded(false);
  }

  if (!expanded) {
    return (
      <div className="diagram-description-toggle">
        {hasDescription ? (
          <button type="button" className="edit-btn" onClick={() => setExpanded(true)}>
            {locked ? 'view export description' : '✎ export description set'}
          </button>
        ) : (
          <button type="button" className="edit-btn" onClick={startEdit}>
            + add an export description
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="diagram-description-panel">
      <div className="field-label">
        Export description
        <span className="diagram-description-hint"> — used in the .md export, not shown on this page</span>
      </div>
      {editing ? (
        <div>
          <textarea rows={4} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
          <div className="field-edit-actions">
            <button type="button" className="field-confirm-btn" onClick={confirmEdit} disabled={saving}>
              {saving ? 'saving…' : '✓ save'}
            </button>
            <button type="button" className="field-cancel-btn" onClick={cancelEdit} disabled={saving}>
              cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="field-value">{description}</p>
          <div className="field-edit-actions">
            {!locked && (
              <>
                <button type="button" className="field-cancel-btn" onClick={startEdit}>
                  ✎ edit
                </button>
                <button type="button" className="field-cancel-btn" onClick={handleClear} disabled={saving}>
                  {saving ? '…' : '× clear'}
                </button>
              </>
            )}
            <button type="button" className="field-cancel-btn" onClick={() => setExpanded(false)}>
              collapse
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Replaces the old freeform label -> values TechnicalSpecsTable. A project's "Technical
// specifications" section is now a single uploaded, self-contained interactive HTML
// diagram — e.g. exported from draw.io — rather than a structured table. See "Technical
// diagram" in Project_Dashboard_Design.md for the full reasoning.
//
// Deliberately tool-agnostic: any self-contained interactive HTML export is accepted, not
// specifically draw.io's. The file itself is never parsed or touched by React — it's
// rendered via <iframe src="/api/projects/{id}/diagram">, so its own scripts and styles
// stay fully isolated from the rest of the app rather than being injected inline.
//
// `locked`: hides upload/replace/remove (and the description's edit/clear) entirely, same
// convention as every other locked widget on a completed project. The diagram itself keeps
// rendering and stays interactive to *view* (panning, zooming, clicking links inside it),
// and an existing export description stays viewable too — locking only prevents changes.
export default function DiagramSlot({ projectId, diagram, diagramDescription, onUpdate, onSaveDescription, locked = false }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // so re-selecting the same filename later still fires onChange
    if (!file) return;

    setError('');
    setUploading(true);
    const formData = new FormData();
    formData.append('diagram', file);
    const res = await fetch(`/api/projects/${projectId}/diagram`, { method: 'POST', body: formData });
    setUploading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Couldn't upload that file. Try again.");
      return;
    }
    onUpdate(await res.json());
  }

  async function handleRemove() {
    setError('');
    const res = await fetch(`/api/projects/${projectId}/diagram`, { method: 'DELETE' });
    if (!res.ok) {
      setError("Couldn't remove the diagram. Try again.");
      return;
    }
    onUpdate(await res.json());
  }

  const filePicker = (
    <input
      ref={fileInputRef}
      type="file"
      accept=".html,.htm,text/html"
      style={{ display: 'none' }}
      onChange={handleFileSelected}
    />
  );

  const descriptionSection = (
    <ExportDescriptionSection description={diagramDescription} onSave={onSaveDescription} locked={locked} />
  );

  if (!diagram) {
    return (
      <div className="diagram-card">
        <div className="diagram-empty">
          {locked ? (
            <p className="diagram-empty-text">No diagram was attached to this project.</p>
          ) : (
            <>
              <p className="diagram-empty-text">
                No diagram yet. Export a self-contained interactive HTML diagram from
                whatever tool you designed it in (e.g. draw.io) and upload it here.
              </p>
              <button
                type="button"
                className="btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Uploading…' : '+ upload a diagram (.html)'}
              </button>
              {filePicker}
            </>
          )}
          {error && (
            <p style={{ color: 'var(--clay)', fontSize: 13, marginTop: 8 }}>{error}</p>
          )}
        </div>
        {descriptionSection}
      </div>
    );
  }

  return (
    <div className="diagram-card">
      <div className="diagram-header">
        <div>
          <div className="diagram-filename">{diagram.originalFilename}</div>
          <div className="diagram-meta">uploaded {formatDate(diagram.uploadedAt)}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <a
            href={`/api/projects/${projectId}/diagram`}
            target="_blank"
            rel="noopener noreferrer"
            className="edit-btn"
            title="Open in a new tab"
          >
            ⤢ open
          </a>
          {!locked && (
            <>
              <button
                type="button"
                className="edit-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title="Replace"
              >
                {uploading ? '…' : '↻ replace'}
              </button>
              <button type="button" className="edit-btn" onClick={handleRemove} title="Remove">
                × remove
              </button>
              {filePicker}
            </>
          )}
        </div>
      </div>
      <iframe
        src={`/api/projects/${projectId}/diagram`}
        className="diagram-frame"
        title={diagram.originalFilename}
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
      {error && <p style={{ color: 'var(--clay)', fontSize: 13, padding: '0 14px 10px' }}>{error}</p>}
      {descriptionSection}
    </div>
  );
}