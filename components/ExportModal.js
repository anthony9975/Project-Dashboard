// UI Layer — Markdown Export Modal Component (ExportModal.js)
// Renders a checklist overlay allowing users to select which visible project fields to include in export.
// Delegates Markdown document generation and browser download to lib/exportProject.js.

import { useState } from 'react';
import { downloadProjectMarkdown } from '../lib/exportProject';

// Modal overlay for exporting a single project to Markdown. `fields` is the same
// status-driven field list the detail page already renders (from fieldsFor), so the
// checkbox list always matches what's actually visible on the page for this project's
// status rather than keeping a second, separately-maintained visibility list.
export default function ExportModal({ project, fields, showTraits, labels, onClose }) {
  const exportableFields = showTraits ? ['traits', ...fields] : fields;

  const [selected, setSelected] = useState(() => {
    const initial = {};
    exportableFields.forEach((f) => {
      initial[f] = true;
    });
    return initial;
  });

  function toggle(field) {
    setSelected((s) => ({ ...s, [field]: !s[field] }));
  }

  function toggleAll(value) {
    const next = {};
    exportableFields.forEach((f) => {
      next[f] = value;
    });
    setSelected(next);
  }

  function handleExport() {
    const chosen = exportableFields.filter((f) => selected[f]);
    downloadProjectMarkdown(project, chosen);
    onClose();
  }

  const noneSelected = exportableFields.every((f) => !selected[f]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="heading">Export &quot;{project.title}&quot;</span>
          <button type="button" className="edit-btn" onClick={onClose} title="Close">
            ×
          </button>
        </div>

        <p className="field-label" style={{ marginTop: 4 }}>
          Choose what to include
        </p>

        <div className="modal-checklist">
          {exportableFields.map((f) => (
            <label key={f} className="modal-checkbox-row">
              <input type="checkbox" checked={!!selected[f]} onChange={() => toggle(f)} />
              {labels[f] || f}
            </label>
          ))}
        </div>

        <div className="modal-select-actions">
          <button type="button" className="field-cancel-btn" onClick={() => toggleAll(true)}>
            select all
          </button>
          <button type="button" className="field-cancel-btn" onClick={() => toggleAll(false)}>
            select none
          </button>
        </div>

        <div className="field-edit-actions" style={{ marginTop: 16 }}>
          <button type="button" className="field-confirm-btn" onClick={handleExport} disabled={noneSelected}>
            ⬇ download .md
          </button>
          <button type="button" className="field-cancel-btn" onClick={onClose}>
            cancel
          </button>
        </div>
      </div>
    </div>
  );
}
