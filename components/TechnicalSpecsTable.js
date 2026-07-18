import { useEffect, useRef, useState } from 'react';
import DragHandle from './DragHandle';

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function blankDraft() {
  return { label: '', values: [] };
}

function draftFromSpec(spec) {
  return { label: spec.label || '', values: [...(spec.values || [])] };
}

// Freeform label -> multiple freeform values, e.g. "Languages" -> ["JavaScript", "Python"].
// Unlike TraitPicker's values, these aren't a shared vocabulary across projects (a hardware
// project's specs share almost no labels with a software project's), so there's no
// autocomplete/dropdown here — just type a value, Enter or comma commits it as a chip.
//
// Whole rows edit at once (pencil -> label input + chip editor -> confirm/cancel), same
// pattern as ComponentsTable. Rows are drag-to-reorder, same pattern as RoadmapTimeline's
// steps — dragging is disabled while a row is mid-edit so text selection in the inputs
// doesn't fight the browser's native drag handling.
export default function TechnicalSpecsTable({ value, onChange }) {
  const [items, setItems] = useState(value || []);
  const draggedIndex = useRef(null);
  const [dragging, setDragging] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(blankDraft());
  const [draftValueText, setDraftValueText] = useState('');

  const [newDraft, setNewDraft] = useState(blankDraft());
  const [newValueText, setNewValueText] = useState('');

  useEffect(() => {
    if (!dragging) setItems(value || []);
  }, [value, dragging]);

  function commit(updated) {
    setItems(updated);
    onChange(updated);
  }

  function startEdit(spec) {
    setEditingId(spec.id);
    setDraft(draftFromSpec(spec));
    setDraftValueText('');
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(blankDraft());
    setDraftValueText('');
  }

  function confirmEdit(id) {
    // Commit whatever's still sitting in the value box, same as pressing Enter would —
    // otherwise a typed-but-uncommitted value silently vanishes on save.
    const pending = draftValueText.trim();
    const values = pending ? [...draft.values, pending] : draft.values;
    commit(items.map((s) => (s.id === id ? { ...s, label: draft.label.trim(), values } : s)));
    setEditingId(null);
    setDraft(blankDraft());
    setDraftValueText('');
  }

  function removeItem(id) {
    commit(items.filter((s) => s.id !== id));
  }

  function commitValue(text, values, setValues, setText) {
    const v = text.trim();
    if (!v) return;
    setValues([...values, v]);
    setText('');
  }

  function addItem() {
    // Commit whatever's still sitting in the value box, same as pressing Enter would.
    // Without this, typing a value and clicking "add" without pressing Enter first silently
    // did nothing — the values array stayed empty, the guard below returned early, and
    // commit() (and therefore the save) never ran.
    const label = newDraft.label.trim();
    const pending = newValueText.trim();
    const values = pending ? [...newDraft.values, pending] : newDraft.values;
    if (!label || values.length === 0) return;
    commit([...items, { id: makeId(), label, values }]);
    setNewDraft(blankDraft());
    setNewValueText('');
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
        <div className="ts-table">
          {items.map((spec, i) =>
            editingId === spec.id ? (
              <div key={spec.id} className="ts-row">
                <div className="ts-edit-row">
                  <input
                    className="ts-edit-label"
                    value={draft.label}
                    onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                    placeholder="Label (e.g. Languages)"
                    autoFocus
                  />
                  <div className="ts-value-editor">
                    {draft.values.length > 0 && (
                      <div className="ts-chip-list">
                        {draft.values.map((v, vi) => (
                          <span
                            key={vi}
                            className="trait-chip trait-chip-removable"
                            onClick={() =>
                              setDraft({ ...draft, values: draft.values.filter((_, j) => j !== vi) })
                            }
                            title="Remove"
                          >
                            {v} <span aria-hidden="true">×</span>
                          </span>
                        ))}
                      </div>
                    )}
                    <input
                      value={draftValueText}
                      onChange={(e) => setDraftValueText(e.target.value)}
                      placeholder="Add a value, Enter to add"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          commitValue(
                            draftValueText,
                            draft.values,
                            (vals) => setDraft({ ...draft, values: vals }),
                            setDraftValueText
                          );
                        }
                      }}
                    />
                  </div>
                  <div className="field-edit-actions">
                    <button type="button" className="field-confirm-btn" onClick={() => confirmEdit(spec.id)}>
                      ✓ save
                    </button>
                    <button type="button" className="field-cancel-btn" onClick={cancelEdit}>
                      cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                key={spec.id}
                className="ts-row"
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
              >
                <DragHandle className="ts-drag-handle" />
                <span className="ts-label">{spec.label || '—'}</span>
                <span className="ts-values">
                  {(spec.values || []).map((v, vi) => (
                    <span key={vi} className="trait-chip">
                      {v}
                    </span>
                  ))}
                </span>
                <span className="ts-actions">
                  <button type="button" className="edit-btn" onClick={() => startEdit(spec)} title="Edit">
                    ✎
                  </button>
                  <button type="button" className="edit-btn" onClick={() => removeItem(spec.id)} title="Remove">
                    ×
                  </button>
                </span>
              </div>
            )
          )}
        </div>
      )}

      <div className="ts-add-row">
        <input
          className="ts-edit-label"
          value={newDraft.label}
          onChange={(e) => setNewDraft({ ...newDraft, label: e.target.value })}
          placeholder="Label (e.g. Languages)"
        />
        <div className="ts-value-editor">
          {newDraft.values.length > 0 && (
            <div className="ts-chip-list">
              {newDraft.values.map((v, vi) => (
                <span
                  key={vi}
                  className="trait-chip trait-chip-removable"
                  onClick={() =>
                    setNewDraft({ ...newDraft, values: newDraft.values.filter((_, j) => j !== vi) })
                  }
                  title="Remove"
                >
                  {v} <span aria-hidden="true">×</span>
                </span>
              ))}
            </div>
          )}
          <input
            value={newValueText}
            onChange={(e) => setNewValueText(e.target.value)}
            placeholder="Add a value, Enter to add"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                commitValue(
                  newValueText,
                  newDraft.values,
                  (vals) => setNewDraft({ ...newDraft, values: vals }),
                  setNewValueText
                );
              }
            }}
          />
        </div>
        <button type="button" className="btn" onClick={addItem}>
          add
        </button>
      </div>
    </div>
  );
}