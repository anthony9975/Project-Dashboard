import { useState } from 'react';

// Read-only text by default with a small pencil icon. Clicking it swaps the field into an
// editable box; a confirm button saves just that field (calling onSave), a cancel button
// discards the draft. Saving snaps it back to read-only display.
export default function EditableField({
  label,
  value,
  isList = false,
  rows = 2,
  onSave,
  multiline = true,
  headingDisplay = false,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  function toText(v) {
    return Array.isArray(v) ? v.join('\n') : v || '';
  }

  function startEdit() {
    setDraft(toText(value));
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  async function confirmEdit() {
    setSaving(true);
    const newValue = isList
      ? draft.split('\n').map((s) => s.trim()).filter(Boolean)
      : draft;
    await onSave(newValue);
    setSaving(false);
    setEditing(false);
  }

  const displayText = isList
    ? Array.isArray(value) && value.length > 0
      ? value.join('\n')
      : '—'
    : value && String(value).trim()
    ? value
    : '—';

  const editBtn = (
    <button type="button" className="edit-btn" onClick={startEdit} title={`Edit ${label}`}>
      ✎
    </button>
  );

  if (headingDisplay) {
    return (
      <div className="field-block">
        {editing ? (
          <div>
            <input
              className="title-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
            />
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
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <h1>{value}</h1>
            {editBtn}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="field-block">
      <div className="field-label-row">
        <span className="field-label">{label}</span>
        {!editing && editBtn}
      </div>

      {editing ? (
        <div>
          {multiline ? (
            <textarea rows={rows} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
          ) : (
            <input value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
          )}
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
        <p className="field-value">{displayText}</p>
      )}
    </div>
  );
}
