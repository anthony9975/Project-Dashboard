import { useEffect, useRef, useState } from 'react';
import DragHandle from './DragHandle';

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// Features widget for rendering a bullet list of features where each feature carries an inline
// Feature Name and Description, and can also hold its own nested sub-features.
//
// - Items store { id, name, description, subFeatures: [{ id, name, description }] }.
// - Display: Bullet + Feature Name (bold) + inline " - " + Description.
// - Supports drag-to-reorder, inline editing, delete, and add for features and sub-features.
// - Sub-feature drag events call stopPropagation() on all handlers to prevent event bubbling.
// - Respects `locked` prop: when true, hides all edit/add/delete controls and drag handles.
export default function FeaturesList({ value, onChange, locked = false }) {
  const [items, setItems] = useState(value || []);
  const draggedIndex = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    if (!dragging) setItems(value || []);
  }, [value, dragging]);

  function commit(updated) {
    setItems(updated);
    onChange(updated);
  }

  function addFeature() {
    if (!newName.trim()) return;
    commit([
      ...items,
      { id: makeId(), name: newName.trim(), description: newDesc.trim(), subFeatures: [] },
    ]);
    setNewName('');
    setNewDesc('');
  }

  function editFeature(id, name, description) {
    commit(items.map((f) => (f.id === id ? { ...f, name, description } : f)));
  }

  function removeFeature(id) {
    commit(items.filter((f) => f.id !== id));
  }

  function addSubFeature(featureId, name, description) {
    if (!name.trim()) return;
    commit(
      items.map((f) => {
        if (f.id !== featureId) return f;
        const subFeatures = [
          ...(f.subFeatures || []),
          { id: makeId(), name: name.trim(), description: description.trim() },
        ];
        return { ...f, subFeatures };
      })
    );
  }

  function editSubFeature(featureId, subId, name, description) {
    commit(
      items.map((f) =>
        f.id === featureId
          ? {
              ...f,
              subFeatures: (f.subFeatures || []).map((s) => (s.id === subId ? { ...s, name, description } : s)),
            }
          : f
      )
    );
  }

  function removeSubFeature(featureId, subId) {
    commit(
      items.map((f) =>
        f.id === featureId
          ? {
              ...f,
              subFeatures: (f.subFeatures || []).filter((s) => s.id !== subId),
            }
          : f
      )
    );
  }

  function reorderSubFeatures(featureId, newSubFeatures) {
    commit(items.map((f) => (f.id === featureId ? { ...f, subFeatures: newSubFeatures } : f)));
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
    <div className="features-list">
      {items.map((feature, i) => (
        <FeatureRow
          key={feature.id}
          feature={feature}
          locked={locked}
          onDragStart={() => handleDragStart(i)}
          onDragOver={(e) => handleDragOver(e, i)}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          onEdit={(name, desc) => editFeature(feature.id, name, desc)}
          onRemove={() => removeFeature(feature.id)}
          onAddSubFeature={(name, desc) => addSubFeature(feature.id, name, desc)}
          onEditSubFeature={(subId, name, desc) => editSubFeature(feature.id, subId, name, desc)}
          onRemoveSubFeature={(subId) => removeSubFeature(feature.id, subId)}
          onReorderSubFeatures={(newSubs) => reorderSubFeatures(feature.id, newSubs)}
        />
      ))}

      {!locked && (
        <div className="feature-add-inputs">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Feature name…"
            style={{ flex: 1 }}
            onKeyDown={(e) => e.key === 'Enter' && addFeature()}
          />
          <input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)…"
            style={{ flex: 1.5 }}
            onKeyDown={(e) => e.key === 'Enter' && addFeature()}
          />
          <button type="button" className="btn" onClick={addFeature}>
            add
          </button>
        </div>
      )}
    </div>
  );
}

function FeatureRow({
  feature,
  locked,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onEdit,
  onRemove,
  onAddSubFeature,
  onEditSubFeature,
  onRemoveSubFeature,
  onReorderSubFeatures,
}) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [draftName, setDraftName] = useState(feature.name || feature.text || '');
  const [draftDesc, setDraftDesc] = useState(feature.description || '');

  const [newSubName, setNewSubName] = useState('');
  const [newSubDesc, setNewSubDesc] = useState('');

  const subFeatures = feature.subFeatures || [];
  const [localSubs, setLocalSubs] = useState(subFeatures);
  const subDraggedIndex = useRef(null);
  const [subDragging, setSubDragging] = useState(false);

  useEffect(() => {
    if (!subDragging) setLocalSubs(subFeatures);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feature.subFeatures, subDragging]);

  function startEdit() {
    setDraftName(feature.name || feature.text || '');
    setDraftDesc(feature.description || '');
    setEditing(true);
  }

  function confirmEdit() {
    onEdit(draftName, draftDesc);
    setEditing(false);
  }

  function handleSubDragStart(e, index) {
    e.stopPropagation();
    subDraggedIndex.current = index;
    setSubDragging(true);
  }

  function handleSubDragOver(e, index) {
    e.preventDefault();
    e.stopPropagation();
    const from = subDraggedIndex.current;
    if (from === null || from === index) return;
    const updated = [...localSubs];
    const [moved] = updated.splice(from, 1);
    updated.splice(index, 0, moved);
    subDraggedIndex.current = index;
    setLocalSubs(updated);
  }

  function handleSubDrop(e) {
    e.stopPropagation();
    setSubDragging(false);
    subDraggedIndex.current = null;
    onReorderSubFeatures(localSubs);
  }

  function handleSubDragEnd(e) {
    e.stopPropagation();
    setSubDragging(false);
    subDraggedIndex.current = null;
  }

  const name = feature.name || feature.text || '';
  const desc = feature.description || '';

  return (
    <div
      className="feature-item"
      draggable={!locked}
      onDragStart={locked ? undefined : onDragStart}
      onDragOver={locked ? undefined : onDragOver}
      onDrop={locked ? undefined : onDrop}
      onDragEnd={locked ? undefined : onDragEnd}
    >
      <div className="feature-main-row">
        {!locked && <DragHandle size={10} className="feature-drag-handle" />}
        <span className="feature-bullet">•</span>

        {!locked && editing ? (
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Feature name"
                style={{ flex: 1, minWidth: 140 }}
                autoFocus
              />
              <input
                value={draftDesc}
                onChange={(e) => setDraftDesc(e.target.value)}
                placeholder="Description (optional)"
                style={{ flex: 1.5, minWidth: 160 }}
              />
            </div>
            <div className="field-edit-actions">
              <button type="button" className="field-confirm-btn" onClick={confirmEdit}>
                ✓ save
              </button>
              <button type="button" className="field-cancel-btn" onClick={() => setEditing(false)}>
                cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <span className="feature-content">
              <strong className="feature-name">{name}</strong>
              {desc ? <span className="feature-inline-desc"> - {desc}</span> : null}
            </span>
            <span style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button
                type="button"
                className="edit-btn"
                onClick={() => setExpanded((e) => !e)}
                title={expanded ? 'Collapse sub-features' : 'Expand sub-features'}
              >
                {expanded ? '▾' : '▸'}
              </button>
              {!locked && (
                <>
                  <button type="button" className="edit-btn" onClick={startEdit} title="Edit feature">
                    ✎
                  </button>
                  <button type="button" className="edit-btn" onClick={onRemove} title="Remove feature">
                    ×
                  </button>
                </>
              )}
            </span>
          </div>
        )}
      </div>

      {expanded && (
        <div className="subfeatures-list">
          {localSubs.map((sub, i) => (
            <SubFeatureRow
              key={sub.id}
              sub={sub}
              locked={locked}
              onDragStart={(e) => handleSubDragStart(e, i)}
              onDragOver={(e) => handleSubDragOver(e, i)}
              onDrop={handleSubDrop}
              onDragEnd={handleSubDragEnd}
              onEdit={(subName, subDesc) => onEditSubFeature(sub.id, subName, subDesc)}
              onRemove={() => onRemoveSubFeature(sub.id)}
            />
          ))}

          {!locked && (
            <div className="subfeature-add-inputs">
              <input
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
                placeholder="Sub-feature name…"
                style={{ flex: 1 }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onAddSubFeature(newSubName, newSubDesc);
                    setNewSubName('');
                    setNewSubDesc('');
                  }
                }}
              />
              <input
                value={newSubDesc}
                onChange={(e) => setNewSubDesc(e.target.value)}
                placeholder="Description (optional)…"
                style={{ flex: 1.5 }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onAddSubFeature(newSubName, newSubDesc);
                    setNewSubName('');
                    setNewSubDesc('');
                  }
                }}
              />
              <button
                type="button"
                className="btn"
                onClick={() => {
                  onAddSubFeature(newSubName, newSubDesc);
                  setNewSubName('');
                  setNewSubDesc('');
                }}
              >
                add
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SubFeatureRow({ sub, locked, onDragStart, onDragOver, onDrop, onDragEnd, onEdit, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(sub.name || sub.text || '');
  const [draftDesc, setDraftDesc] = useState(sub.description || '');

  function startEdit() {
    setDraftName(sub.name || sub.text || '');
    setDraftDesc(sub.description || '');
    setEditing(true);
  }

  function confirmEdit() {
    onEdit(draftName, draftDesc);
    setEditing(false);
  }

  const name = sub.name || sub.text || '';
  const desc = sub.description || '';

  return (
    <div
      className="subfeature-row"
      draggable={!locked}
      onDragStart={locked ? undefined : onDragStart}
      onDragOver={locked ? undefined : onDragOver}
      onDrop={locked ? undefined : onDrop}
      onDragEnd={locked ? undefined : onDragEnd}
    >
      {!locked && <DragHandle size={8} className="subfeature-drag-handle" />}
      <span className="subfeature-bullet">◦</span>

      {!locked && editing ? (
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="Sub-feature name"
              style={{ flex: 1, minWidth: 120 }}
              autoFocus
            />
            <input
              value={draftDesc}
              onChange={(e) => setDraftDesc(e.target.value)}
              placeholder="Description (optional)"
              style={{ flex: 1.5, minWidth: 140 }}
            />
          </div>
          <div className="field-edit-actions">
            <button type="button" className="field-confirm-btn" onClick={confirmEdit}>
              ✓ save
            </button>
            <button type="button" className="field-cancel-btn" onClick={() => setEditing(false)}>
              cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <span className="subfeature-content">
            <strong className="subfeature-name">{name}</strong>
            {desc ? <span className="subfeature-inline-desc"> - {desc}</span> : null}
          </span>
          {!locked && (
            <span style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button type="button" className="edit-btn" onClick={startEdit} title="Edit sub-feature">
                ✎
              </button>
              <button type="button" className="edit-btn" onClick={onRemove} title="Remove sub-feature">
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
