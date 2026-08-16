import { useEffect, useState } from 'react';

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// Research widget for rendering structured research entries sitting directly on the page layout:
// - Each item carries { id, name, link, description }.
// - Display: Article Name on top (clickable link if `link` is provided, hiding raw URL),
//   with Description placed directly below it and indented to the right.
// - Plain unboxed presentation matching the page's text fields (no background card/border).
// - Supports inline editing, deletion, and persistent add inputs.
// - Respects `locked` prop: hides all mutation controls on completed projects.
export default function ResearchList({ value, onChange, locked = false }) {
  const [items, setItems] = useState(value || []);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLink, setNewLink] = useState('');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    setItems(value || []);
  }, [value]);

  function commit(updated) {
    setItems(updated);
    onChange(updated);
  }

  function addItem() {
    if (!newName.trim() && !newLink.trim()) return;
    commit([
      ...items,
      { id: makeId(), name: newName.trim() || newLink.trim(), link: newLink.trim(), description: newDesc.trim() },
    ]);
    setNewName('');
    setNewLink('');
    setNewDesc('');
    setIsAdding(false);
  }

  function editItem(id, updates) {
    commit(items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  }

  function removeItem(id) {
    commit(items.filter((item) => item.id !== id));
  }

  return (
    <div className="research-list">
      {items.map((item) => (
        <ResearchRow
          key={item.id}
          item={item}
          locked={locked}
          onEdit={(updates) => editItem(item.id, updates)}
          onRemove={() => removeItem(item.id)}
        />
      ))}

      {!locked && (
        isAdding ? (
          <div className="research-add-inputs">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Article name…"
                style={{ flex: 1, minWidth: 140 }}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addItem();
                  if (e.key === 'Escape') {
                    setIsAdding(false);
                    setNewName('');
                    setNewLink('');
                    setNewDesc('');
                  }
                }}
              />
              <input
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                placeholder="Article link (URL)…"
                style={{ flex: 1.2, minWidth: 150 }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addItem();
                  if (e.key === 'Escape') {
                    setIsAdding(false);
                    setNewName('');
                    setNewLink('');
                    setNewDesc('');
                  }
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 6, width: '100%', marginTop: 4 }}>
              <input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Description (optional)…"
                style={{ flex: 1 }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addItem();
                  if (e.key === 'Escape') {
                    setIsAdding(false);
                    setNewName('');
                    setNewLink('');
                    setNewDesc('');
                  }
                }}
              />
              <button type="button" className="field-confirm-btn" onClick={addItem}>
                ✓ add
              </button>
              <button
                type="button"
                className="field-cancel-btn"
                onClick={() => {
                  setIsAdding(false);
                  setNewName('');
                  setNewLink('');
                  setNewDesc('');
                }}
              >
                cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="add-item-btn"
            onClick={() => setIsAdding(true)}
            style={{ marginTop: items.length > 0 ? 4 : 0 }}
          >
            + Add research
          </button>
        )
      )}
    </div>
  );
}

function ResearchRow({ item, locked, onEdit, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(item.name || '');
  const [draftLink, setDraftLink] = useState(item.link || '');
  const [draftDesc, setDraftDesc] = useState(item.description || '');

  function startEdit() {
    setDraftName(item.name || '');
    setDraftLink(item.link || '');
    setDraftDesc(item.description || '');
    setEditing(true);
  }

  function confirmEdit() {
    onEdit({ name: draftName, link: draftLink, description: draftDesc });
    setEditing(false);
  }

  const name = item.name || item.link || 'Untitled Research';
  const hasLink = Boolean(item.link && item.link.trim());

  return (
    <div className="research-item">
      {!locked && editing ? (
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="Article name"
              style={{ flex: 1, minWidth: 140 }}
              autoFocus
            />
            <input
              value={draftLink}
              onChange={(e) => setDraftLink(e.target.value)}
              placeholder="Article link (URL)"
              style={{ flex: 1.2, minWidth: 150 }}
            />
          </div>
          <div style={{ marginTop: 6 }}>
            <textarea
              value={draftDesc}
              onChange={(e) => setDraftDesc(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              style={{ width: '100%', fontSize: '12.5px' }}
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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div className="research-name">
              {hasLink ? (
                <a href={item.link} target="_blank" rel="noopener noreferrer">
                  {name}
                </a>
              ) : (
                <span>{name}</span>
              )}
            </div>
            {!locked && (
              <span style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button type="button" className="edit-btn" onClick={startEdit} title="Edit research">
                  ✎
                </button>
                <button type="button" className="edit-btn" onClick={onRemove} title="Remove research">
                  ×
                </button>
              </span>
            )}
          </div>
          {item.description ? <div className="research-description">{item.description}</div> : null}
        </div>
      )}
    </div>
  );
}
