import { useEffect, useRef, useState } from 'react';

const STATUS_ORDER = ['not_started', 'in_progress', 'done'];

function nextStatus(status) {
  const i = STATUS_ORDER.indexOf(status);
  return STATUS_ORDER[(i + 1) % STATUS_ORDER.length];
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// Vertical roadmap timeline. Click a step's dot to cycle its status (not started -> in
// progress -> done -> not started). Drag a row to reorder it. Text edits use their own
// inline pencil/confirm, matching EditableField elsewhere in the app — status changes and
// reordering save immediately since they're discrete actions, not typing.
export default function RoadmapTimeline({ value, onChange }) {
  const [items, setItems] = useState(value || []);
  const draggedIndex = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState('');
  const [newStepText, setNewStepText] = useState('');

  useEffect(() => {
    if (!dragging) setItems(value || []);
  }, [value, dragging]);

  const doneCount = items.filter((s) => s.status === 'done').length;
  const progress = items.length ? Math.round((doneCount / items.length) * 100) : 0;

  function cycleStatus(id) {
    const updated = items.map((s) => (s.id === id ? { ...s, status: nextStatus(s.status) } : s));
    setItems(updated);
    onChange(updated);
  }

  function removeStep(id) {
    const updated = items.filter((s) => s.id !== id);
    setItems(updated);
    onChange(updated);
  }

  function startEdit(step) {
    setEditingId(step.id);
    setDraft(step.text);
  }

  function confirmEdit(id) {
    const updated = items.map((s) => (s.id === id ? { ...s, text: draft } : s));
    setItems(updated);
    onChange(updated);
    setEditingId(null);
  }

  function addStep() {
    if (!newStepText.trim()) return;
    const updated = [...items, { id: makeId(), text: newStepText.trim(), status: 'not_started' }];
    setItems(updated);
    onChange(updated);
    setNewStepText('');
  }

  function handleDragStart(index) {
    draggedIndex.current = index;
    setDragging(true);
  }

  function handleDragOver(e, index) {
    e.preventDefault();
    const from = draggedIndex.current;
    if (from === null || from === index) return;
    const updated = [...items];
    const [moved] = updated.splice(from, 1);
    updated.splice(index, 0, moved);
    draggedIndex.current = index;
    setItems(updated);
  }

  function handleDrop() {
    setDragging(false);
    draggedIndex.current = null;
    onChange(items);
  }

  function handleDragEnd() {
    setDragging(false);
    draggedIndex.current = null;
  }

  return (
    <div>
      {items.length > 0 && (
        <div className="rm-progress-track">
          <div className="rm-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      )}

      {items.map((step, i) => (
        <div
          key={step.id}
          className="rm-vstep"
          draggable
          onDragStart={() => handleDragStart(i)}
          onDragOver={(e) => handleDragOver(e, i)}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
        >
          <div className="rm-gutter">
            {i < items.length - 1 && <div className="rm-vline" />}
            <span className="rm-drag-handle" title="Drag to reorder">
              ⠿
            </span>
            <button
              type="button"
              className={`rm-vnode ${step.status}`}
              onClick={() => cycleStatus(step.id)}
              title="Click to change status"
            >
              {step.status === 'done' ? '✓' : ''}
            </button>
          </div>

          <div className="rm-content">
            {editingId === step.id ? (
              <div>
                <input value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
                <div className="field-edit-actions">
                  <button type="button" className="field-confirm-btn" onClick={() => confirmEdit(step.id)}>
                    ✓ save
                  </button>
                  <button type="button" className="field-cancel-btn" onClick={() => setEditingId(null)}>
                    cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <span className={`rm-vlabel${step.status === 'done' ? ' rm-done-text' : ''}`}>{step.text}</span>
                <span style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button type="button" className="edit-btn" onClick={() => startEdit(step)} title="Edit step">
                    ✎
                  </button>
                  <button type="button" className="edit-btn" onClick={() => removeStep(step.id)} title="Remove step">
                    ×
                  </button>
                </span>
              </div>
            )}
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 6, marginTop: items.length > 0 ? 12 : 0 }}>
        <input
          value={newStepText}
          onChange={(e) => setNewStepText(e.target.value)}
          placeholder="Add a step…"
          onKeyDown={(e) => e.key === 'Enter' && addStep()}
        />
        <button type="button" className="btn" onClick={addStep}>
          add
        </button>
      </div>
    </div>
  );
}
