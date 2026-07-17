import { useState } from 'react';

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function formatPrice(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '';
  return `$${n.toFixed(2)}`;
}

function blankDraft() {
  return { name: '', link: '', price: '', notes: '' };
}

function draftFromItem(item) {
  return {
    name: item.name || '',
    link: item.link || '',
    price: typeof item.price === 'number' ? String(item.price) : '',
    notes: item.notes || '',
  };
}

// Price is strictly numeric (or blank/unknown, stored as null) so it can be summed into a
// running total — unlike every other list-style field in the app, which stays free text.
// Whole rows edit at once (pencil -> one row of 4 inputs -> confirm/cancel), same pattern
// as a roadmap step's text, rather than per-cell editing.
export default function ComponentsTable({ value, onChange }) {
  const items = value || [];
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(blankDraft());
  const [newDraft, setNewDraft] = useState(blankDraft());

  function startEdit(item) {
    setEditingId(item.id);
    setDraft(draftFromItem(item));
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(blankDraft());
  }

  function confirmEdit(id) {
    const price = draft.price.trim() === '' ? null : Number(draft.price);
    onChange(
      items.map((c) =>
        c.id === id
          ? { ...c, name: draft.name.trim(), link: draft.link.trim(), price, notes: draft.notes.trim() }
          : c
      )
    );
    setEditingId(null);
    setDraft(blankDraft());
  }

  function removeItem(id) {
    onChange(items.filter((c) => c.id !== id));
  }

  function addItem() {
    if (!newDraft.name.trim()) return;
    const price = newDraft.price.trim() === '' ? null : Number(newDraft.price);
    onChange([
      ...items,
      {
        id: makeId(),
        name: newDraft.name.trim(),
        link: newDraft.link.trim(),
        price,
        notes: newDraft.notes.trim(),
      },
    ]);
    setNewDraft(blankDraft());
  }

  const pricedItems = items.filter((c) => typeof c.price === 'number' && !Number.isNaN(c.price));
  const total = pricedItems.reduce((sum, c) => sum + c.price, 0);

  return (
    <div>
      {items.length > 0 && (
        <table className="ct-table">
          <thead>
            <tr>
              <th style={{ width: '32%' }}>Component</th>
              <th style={{ width: '16%' }}>Price</th>
              <th>Notes</th>
              <th style={{ width: 64 }} />
            </tr>
          </thead>
          <tbody>
            {items.map((item) =>
              editingId === item.id ? (
                <tr key={item.id}>
                  <td colSpan={4}>
                    <div className="ct-edit-row">
                      <input
                        className="ct-edit-name"
                        value={draft.name}
                        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                        placeholder="Component name"
                        autoFocus
                      />
                      <input
                        className="ct-edit-link"
                        value={draft.link}
                        onChange={(e) => setDraft({ ...draft, link: e.target.value })}
                        placeholder="Link (optional)"
                      />
                      <input
                        className="ct-edit-price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={draft.price}
                        onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                        placeholder="Price"
                      />
                      <input
                        className="ct-edit-notes"
                        value={draft.notes}
                        onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                        placeholder="Notes (optional)"
                      />
                    </div>
                    <div className="field-edit-actions">
                      <button type="button" className="field-confirm-btn" onClick={() => confirmEdit(item.id)}>
                        ✓ save
                      </button>
                      <button type="button" className="field-cancel-btn" onClick={cancelEdit}>
                        cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={item.id}>
                  <td className="ct-name">
                    {item.link ? (
                      <a href={item.link} target="_blank" rel="noopener noreferrer">
                        {item.name || '—'}
                      </a>
                    ) : (
                      <span>{item.name || '—'}</span>
                    )}
                  </td>
                  <td className="ct-price">{formatPrice(item.price)}</td>
                  <td className="ct-notes">{item.notes}</td>
                  <td className="ct-actions">
                    <button type="button" className="edit-btn" onClick={() => startEdit(item)} title="Edit">
                      ✎
                    </button>
                    <button type="button" className="edit-btn" onClick={() => removeItem(item.id)} title="Remove">
                      ×
                    </button>
                  </td>
                </tr>
              )
            )}
            {pricedItems.length > 0 && (
              <tr className="ct-total-row">
                <td>Total</td>
                <td className="ct-price">{formatPrice(total)}</td>
                <td colSpan={2} />
              </tr>
            )}
          </tbody>
        </table>
      )}

      <div className="ct-add-row">
        <input
          className="ct-add-name"
          value={newDraft.name}
          onChange={(e) => setNewDraft({ ...newDraft, name: e.target.value })}
          placeholder="Component name"
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
        />
        <input
          className="ct-add-link"
          value={newDraft.link}
          onChange={(e) => setNewDraft({ ...newDraft, link: e.target.value })}
          placeholder="Link (optional)"
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
        />
        <input
          className="ct-add-price"
          type="number"
          step="0.01"
          min="0"
          value={newDraft.price}
          onChange={(e) => setNewDraft({ ...newDraft, price: e.target.value })}
          placeholder="Price"
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
        />
        <input
          className="ct-add-notes"
          value={newDraft.notes}
          onChange={(e) => setNewDraft({ ...newDraft, notes: e.target.value })}
          placeholder="Notes (optional)"
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
        />
        <button type="button" className="btn" onClick={addItem}>
          add
        </button>
      </div>
    </div>
  );
}
