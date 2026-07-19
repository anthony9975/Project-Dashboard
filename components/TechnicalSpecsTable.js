import { useEffect, useRef, useState } from 'react';
import DragHandle from './DragHandle';
import Fiducials from './Fiducials';

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
// project's specs share almost no vocabulary with a software project's), so there's no
// autocomplete/dropdown here — just type a value, Enter or comma commits it as a chip.
//
// Visual treatment follows Technical-Specs-Table-Design.md (the "Circuit Blueprint" doc):
// a header row, a card with hairline border + shadow + corner fiducials, a subtly dotted
// background behind the spec rows only (not the header, not the add-row footer), and
// "editable state" chips that split into value + divider + close per that doc. This is
// currently the only component styled this way — the rest of the app hasn't had this pass
// applied yet, by design (see context.md).
//
// Whole rows edit at once (pencil -> label input + chip editor -> confirm/cancel), same
// pattern as ComponentsTable. Rows are drag-to-reorder, same pattern as RoadmapTimeline's
// steps — dragging is disabled while a row is mid-edit. The persistent add-row starts
// collapsed as a single clickable "+ add a technical spec" row and expands into the actual
// inputs on click, rather than always showing the inputs like Components/Roadmap do.
//
// `locked`: hides row edit/remove actions and the add-row, and disables dragging, leaving
// the labels/values/fiducial card intact as a read-only record. See isLocked() in
// projectFieldConfig.js.
export default function TechnicalSpecsTable({ value, onChange, locked = false }) {
  const [items, setItems] = useState(value || []);
  const draggedIndex = useRef(null);
  const [dragging, setDragging] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(blankDraft());
  const [draftValueText, setDraftValueText] = useState('');

  const [addExpanded, setAddExpanded] = useState(false);
  const [newDraft, setNewDraft] = useState(blankDraft());
  const [newValueText, setNewValueText] = useState('');
  const newLabelInputRef = useRef(null);

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

  function expandAddRow() {
    setAddExpanded(true);
    setTimeout(() => newLabelInputRef.current?.focus(), 0);
  }

  function collapseAddRow() {
    setAddExpanded(false);
    setNewDraft(blankDraft());
    setNewValueText('');
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
    // Left expanded on purpose — adding several specs back-to-back is common, and the
    // collapse (×) button lets you close it explicitly when you're done.
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
    <div className="ts-card">
      <Fiducials />

      <div className="ts-header-row">
        <div className="ts-spacer" />
        <div className="ts-hcell ts-hcell-label">Spec</div>
        <div className="ts-divider" />
        <div className="ts-hcell ts-hcell-values">Values</div>
        <div className="ts-header-actions-spacer" />
      </div>

      {items.length > 0 && (
        <div className="ts-rows">
          {items.map((spec, i) =>
            !locked && editingId === spec.id ? (
              <div key={spec.id} className="ts-row ts-row-editing">
                <div className="ts-edit-block">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="ts-spacer" />
                    <input
                      className="ts-input-dashed ts-label-input"
                      value={draft.label}
                      onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                      placeholder="Label (e.g. Languages)"
                      autoFocus
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginLeft: 22 }}>
                    {draft.values.map((v, vi) => (
                      <span key={vi} className="ts-chip-editable">
                        <span className="ts-chip-editable-value">{v}</span>
                        <span className="ts-chip-editable-divider" />
                        <span
                          className="ts-chip-editable-close"
                          onClick={() => setDraft({ ...draft, values: draft.values.filter((_, j) => j !== vi) })}
                          title="Remove"
                        >
                          ×
                        </span>
                      </span>
                    ))}
                    <input
                      className="ts-input-dashed"
                      value={draftValueText}
                      onChange={(e) => setDraftValueText(e.target.value)}
                      placeholder="Add a value, Enter to add"
                      style={{ minWidth: 160 }}
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
                  <div className="field-edit-actions" style={{ marginLeft: 22 }}>
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
                draggable={!locked}
                onDragStart={() => !locked && handleDragStart(i)}
                onDragOver={(e) => !locked && handleDragOver(e, i)}
                onDrop={() => !locked && handleDrop()}
                onDragEnd={() => !locked && handleDragEnd()}
              >
                {!locked && <DragHandle />}
                <div className="ts-label">{spec.label || '—'}</div>
                <div className="ts-divider" />
                <div className="ts-values">
                  {(spec.values || []).map((v, vi) => (
                    <span key={vi} className="ts-chip">
                      {v}
                    </span>
                  ))}
                </div>
                {!locked && (
                  <div className="ts-actions">
                    <button type="button" className="edit-btn" onClick={() => startEdit(spec)} title="Edit">
                      ✎
                    </button>
                    <button type="button" className="edit-btn" onClick={() => removeItem(spec.id)} title="Remove">
                      ×
                    </button>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}

      {!locked && (
        <div className="ts-addrow-section">
          {addExpanded ? (
            <div className="ts-addrow-expanded">
              <span className="ts-spacer" />
              <input
                ref={newLabelInputRef}
                className="ts-input-dashed ts-label-input"
                value={newDraft.label}
                onChange={(e) => setNewDraft({ ...newDraft, label: e.target.value })}
                placeholder="Label (e.g. Languages)"
              />
              <div className="ts-divider" />
              <div className="ts-addrow-values">
                {newDraft.values.map((v, vi) => (
                  <span key={vi} className="ts-chip-editable">
                    <span className="ts-chip-editable-value">{v}</span>
                    <span className="ts-chip-editable-divider" />
                    <span
                      className="ts-chip-editable-close"
                      onClick={() => setNewDraft({ ...newDraft, values: newDraft.values.filter((_, j) => j !== vi) })}
                      title="Remove"
                    >
                      ×
                    </span>
                  </span>
                ))}
                <input
                  className="ts-input-dashed"
                  value={newValueText}
                  onChange={(e) => setNewValueText(e.target.value)}
                  placeholder="Add a value, Enter to add"
                  style={{ minWidth: 160, flex: 1 }}
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
              <button type="button" className="ts-collapse-btn" onClick={collapseAddRow} title="Close">
                ×
              </button>
            </div>
          ) : (
            <button type="button" className="ts-addrow-collapsed" onClick={expandAddRow}>
              <span aria-hidden="true">+</span> add a technical spec
            </button>
          )}
        </div>
      )}
    </div>
  );
}