import { useRef, useState } from 'react';

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
// `locked`: hides upload/replace/remove entirely, same convention as every other locked
// widget on a completed project. The diagram itself keeps rendering and stays interactive
// to *view* (panning, zooming, clicking links inside it) — locking only prevents changing
// which file is attached.
export default function DiagramSlot({ projectId, diagram, onUpdate, locked = false }) {
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

  if (!diagram) {
    return (
      <div className="diagram-card diagram-empty">
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
    </div>
  );
}
