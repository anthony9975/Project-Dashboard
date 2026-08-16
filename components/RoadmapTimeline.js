import { useEffect, useRef, useState } from 'react';
import DragHandle from './DragHandle';

const STATUS_ORDER = ['not_started', 'in_progress', 'done'];

function nextStatus(status) {
  const i = STATUS_ORDER.indexOf(status);
  return STATUS_ORDER[(i + 1) % STATUS_ORDER.length];
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function allTodosDone(todos) {
  return todos.length > 0 && todos.every((t) => t.status === 'done');
}

function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Applies a new status to a step, auto-stamping completedDate with today when the step
// becomes "done" — but only if no date is already set, so this never overwrites a date
// the user typed in themselves or already auto-stamped. Cycling a step off "done" later
// leaves whatever date is there untouched; clearing it is a manual edit, same as any
// other field.
function withStatus(step, newStatus) {
  if (newStatus === 'done' && !step.completedDate) {
    return { ...step, status: newStatus, completedDate: todayISO() };
  }
  return { ...step, status: newStatus };
}

// Vertical roadmap timeline with a nested to-do list per step.
//
// - Click a step's or to-do's dot to cycle status (not started -> in progress -> done).
// - Steps are draggable to reorder; to-dos are not (order doesn't matter for them).
// - A step's to-do list auto-expands the moment the step is set to "in progress".
// - A step auto-completes once every to-do under it is done. This only ever pushes a step
//   toward done, never away from it — reopening a to-do afterward won't un-complete a step,
//   so a manual "done" override always sticks even with to-dos left unfinished.
// - Each step carries one optional completedDate. It's auto-stamped with today's date the
//   moment a step becomes "done" (whether by manual cycling or the all-todos-done
//   auto-complete above), but only if it's currently blank — so it never clobbers a date
//   you've typed in or already changed. It's always editable/clearable via the same
//   pencil/confirm/cancel flow as the step text. This is what turns a completed project's
//   roadmap into its finished timeline — no separate timeline field needed.
// - Expand/collapse state is page-local, not saved — it's recomputed on load from whether
//   the step is in progress, so it doesn't need its own persisted field.
//
// `locked`: disables every mutation (drag reorder, status cycling, editing, add/remove —
// for both steps and their nested to-dos). Status dots stay visible with their current
// color/checkmark so the roadmap still reads as a finished timeline, they just stop
// responding to clicks. Expand/collapse is left interactive even when locked since it's
// purely a view toggle, not a data change. See isLocked() in projectFieldConfig.js.
export default function RoadmapTimeline({ value, onChange, locked = false }) {
  const [items, setItems] = useState(value || []);
  const draggedIndex = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [expanded, setExpanded] = useState(() => {
    const initial = {};
    (value || []).forEach((s) => {
      if (s.status === 'in_progress') initial[s.id] = true;
    });
    return initial;
  });
  const [isAddingStep, setIsAddingStep] = useState(false);
  const [newStepText, setNewStepText] = useState('');

  useEffect(() => {
    if (!dragging) setItems(value || []);
  }, [value, dragging]);

  const doneCount = items.filter((s) => s.status === 'done').length;
  const progress = items.length ? Math.round((doneCount / items.length) * 100) : 0;

  function commit(updated) {
    setItems(updated);
    onChange(updated);
  }

  function cycleStepStatus(id) {
    const updated = items.map((s) => (s.id === id ? withStatus(s, nextStatus(s.status)) : s));
    commit(updated);
    const changed = updated.find((s) => s.id === id);
    if (changed.status === 'in_progress') {
      setExpanded((e) => ({ ...e, [id]: true }));
    }
  }

  // Saves a step's text and completedDate together in one commit (one PATCH round trip)
  // rather than as two separate field updates.
  function editStep(id, updates) {
    commit(items.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  }

  function removeStep(id) {
    commit(items.filter((s) => s.id !== id));
  }

  function addStep() {
    if (!newStepText.trim()) return;
    commit([
      ...items,
      { id: makeId(), text: newStepText.trim(), status: 'not_started', todos: [], completedDate: '' },
    ]);
    setNewStepText('');
    setIsAddingStep(false);
  }

  function toggleExpanded(id) {
    setExpanded((e) => ({ ...e, [id]: !e[id] }));
  }

  function cycleTodoStatus(stepId, todoId) {
    const updated = items.map((s) => {
      if (s.id !== stepId) return s;
      const todos = s.todos.map((t) => (t.id === todoId ? { ...t, status: nextStatus(t.status) } : t));
      return { ...withStatus(s, allTodosDone(todos) ? 'done' : s.status), todos };
    });
    commit(updated);
  }

  function addTodo(stepId, text) {
    if (!text.trim()) return;
    const updated = items.map((s) => {
      if (s.id !== stepId) return s;
      const todos = [...s.todos, { id: makeId(), text: text.trim(), status: 'not_started' }];
      return { ...withStatus(s, allTodosDone(todos) ? 'done' : s.status), todos };
    });
    commit(updated);
  }

  function editTodoText(stepId, todoId, text) {
    const updated = items.map((s) =>
      s.id === stepId ? { ...s, todos: s.todos.map((t) => (t.id === todoId ? { ...t, text } : t)) } : s
    );
    commit(updated);
  }

  function removeTodo(stepId, todoId) {
    const updated = items.map((s) => {
      if (s.id !== stepId) return s;
      const todos = s.todos.filter((t) => t.id !== todoId);
      return { ...withStatus(s, allTodosDone(todos) ? 'done' : s.status), todos };
    });
    commit(updated);
  }

  function reorderTodos(stepId, newTodos) {
    commit(items.map((s) => (s.id === stepId ? { ...s, todos: newTodos } : s)));
  }

  function handleDragStart(e, index) {
    e.stopPropagation();
    draggedIndex.current = index;
    setDragging(true);
  }

  function handleDragOver(e, index) {
    e.preventDefault();
    e.stopPropagation();
    const from = draggedIndex.current;
    if (from === null || from === index) return;
    const updated = [...items];
    const [moved] = updated.splice(from, 1);
    updated.splice(index, 0, moved);
    draggedIndex.current = index;
    setItems(updated);
  }

  function handleDrop(e) {
    e.stopPropagation();
    setDragging(false);
    draggedIndex.current = null;
    onChange(items);
  }

  function handleDragEnd(e) {
    e.stopPropagation();
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
        <StepRow
          key={step.id}
          step={step}
          isLast={i === items.length - 1}
          expanded={!!expanded[step.id]}
          locked={locked}
          onToggleExpanded={() => toggleExpanded(step.id)}
          onDragStart={(e) => handleDragStart(e, i)}
          onDragOver={(e) => handleDragOver(e, i)}
          onDrop={(e) => handleDrop(e)}
          onDragEnd={(e) => handleDragEnd(e)}
          onCycleStatus={() => cycleStepStatus(step.id)}
          onEditStep={(updates) => editStep(step.id, updates)}
          onRemove={() => removeStep(step.id)}
          onCycleTodoStatus={(todoId) => cycleTodoStatus(step.id, todoId)}
          onAddTodo={(text) => addTodo(step.id, text)}
          onEditTodoText={(todoId, text) => editTodoText(step.id, todoId, text)}
          onRemoveTodo={(todoId) => removeTodo(step.id, todoId)}
          onReorderTodos={(newTodos) => reorderTodos(step.id, newTodos)}
        />
      ))}

      {!locked && (
        isAddingStep ? (
          <div style={{ display: 'flex', gap: 6, marginTop: items.length > 0 ? 12 : 0 }}>
            <input
              value={newStepText}
              onChange={(e) => setNewStepText(e.target.value)}
              placeholder="Step text…"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') addStep();
                if (e.key === 'Escape') {
                  setIsAddingStep(false);
                  setNewStepText('');
                }
              }}
            />
            <button type="button" className="field-confirm-btn" onClick={addStep}>
              ✓ add
            </button>
            <button
              type="button"
              className="field-cancel-btn"
              onClick={() => {
                setIsAddingStep(false);
                setNewStepText('');
              }}
            >
              cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="add-item-btn"
            onClick={() => setIsAddingStep(true)}
            style={{ marginTop: items.length > 0 ? 12 : 0 }}
          >
            + Add step
          </button>
        )
      )}
    </div>
  );
}

function StepRow({
  step,
  isLast,
  expanded,
  locked,
  onToggleExpanded,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onCycleStatus,
  onEditStep,
  onRemove,
  onCycleTodoStatus,
  onAddTodo,
  onEditTodoText,
  onRemoveTodo,
  onReorderTodos,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(step.text);
  const [dateDraft, setDateDraft] = useState(step.completedDate || '');
  const [isAddingTodo, setIsAddingTodo] = useState(false);
  const [newTodoText, setNewTodoText] = useState('');

  function startEdit() {
    setDraft(step.text);
    setDateDraft(step.completedDate || '');
    setEditing(true);
  }
  function confirmEdit() {
    onEditStep({ text: draft, completedDate: dateDraft });
    setEditing(false);
  }

  const todos = step.todos || [];

  // Local drag-reorder state for this step's own todos, mirroring the same pattern the
  // top-level steps use — kept separate so dragging a todo in one step can't interfere
  // with another step's list.
  const [localTodos, setLocalTodos] = useState(todos);
  const todoDraggedIndex = useRef(null);
  const [todoDragging, setTodoDragging] = useState(false);

  useEffect(() => {
    if (!todoDragging) setLocalTodos(todos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.todos, todoDragging]);

  // Every handler here calls stopPropagation. The .rm-todo-row elements are nested inside
  // their step's own draggable .rm-vstep, and drag events bubble — without stopping them,
  // dragging a to-do also fires the step's drag handlers on the way up. That was the actual
  // bug behind "reordering sometimes doesn't save": the step's onDrop still fires afterward
  // and calls onChange with its own stale pre-reorder `items` closure, racing a second,
  // wrong PATCH request against the correct one just sent by onReorderTodos below — and
  // whichever response lands second silently wins.
  function handleTodoDragStart(e, index) {
    e.stopPropagation();
    todoDraggedIndex.current = index;
    setTodoDragging(true);
  }
  function handleTodoDragOver(e, index) {
    e.preventDefault();
    e.stopPropagation();
    const from = todoDraggedIndex.current;
    if (from === null || from === index) return;
    const updated = [...localTodos];
    const [moved] = updated.splice(from, 1);
    updated.splice(index, 0, moved);
    todoDraggedIndex.current = index;
    setLocalTodos(updated);
  }
  function handleTodoDrop(e) {
    e.stopPropagation();
    setTodoDragging(false);
    todoDraggedIndex.current = null;
    onReorderTodos(localTodos);
  }
  function handleTodoDragEnd(e) {
    e.stopPropagation();
    setTodoDragging(false);
    todoDraggedIndex.current = null;
  }

  return (
    <div
      className="rm-vstep"
      draggable={!locked}
      onDragStart={locked ? undefined : onDragStart}
      onDragOver={locked ? undefined : onDragOver}
      onDrop={locked ? undefined : onDrop}
      onDragEnd={locked ? undefined : onDragEnd}
    >
      <div className="rm-gutter">
        {!isLast && <div className="rm-vline" />}
        {!locked && <DragHandle />}
        <button
          type="button"
          className={`rm-vnode status-${step.status}`}
          onClick={locked ? undefined : onCycleStatus}
          title={locked ? undefined : 'Click to change status'}
          style={locked ? { cursor: 'default' } : undefined}
        >
          {step.status === 'done' ? '✓' : ''}
        </button>
      </div>

      <div className="rm-content">
        {!locked && editing ? (
          <div>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
            <div className="field-label" style={{ marginTop: 8 }}>
              Completed date (optional)
            </div>
            <input type="date" value={dateDraft} onChange={(e) => setDateDraft(e.target.value)} />
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span className={`rm-vlabel${step.status === 'done' && !locked ? ' rm-done-text' : ''}`}>{step.text}</span>
              {step.completedDate && <span className="rm-step-date">{formatDate(step.completedDate)}</span>}
            </div>
            <span style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button
                type="button"
                className="edit-btn"
                onClick={onToggleExpanded}
                title={expanded ? 'Collapse to-dos' : 'Expand to-dos'}
              >
                {expanded ? '▾' : '▸'}
              </button>
              {!locked && (
                <>
                  <button type="button" className="edit-btn" onClick={startEdit} title="Edit step">
                    ✎
                  </button>
                  <button type="button" className="edit-btn" onClick={onRemove} title="Remove step">
                    ×
                  </button>
                </>
              )}
            </span>
          </div>
        )}

        {expanded && (
          <div className="rm-todos">
            {localTodos.map((todo, i) => (
              <TodoRow
                key={todo.id}
                todo={todo}
                locked={locked}
                onDragStart={(e) => handleTodoDragStart(e, i)}
                onDragOver={(e) => handleTodoDragOver(e, i)}
                onDrop={handleTodoDrop}
                onDragEnd={handleTodoDragEnd}
                onCycleStatus={() => onCycleTodoStatus(todo.id)}
                onEditText={(text) => onEditTodoText(todo.id, text)}
                onRemove={() => onRemoveTodo(todo.id)}
              />
            ))}
            {!locked && (
              isAddingTodo ? (
                <div style={{ display: 'flex', gap: 6, marginTop: localTodos.length > 0 ? 8 : 0 }}>
                  <input
                    value={newTodoText}
                    onChange={(e) => setNewTodoText(e.target.value)}
                    placeholder="To-do text…"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onAddTodo(newTodoText);
                        setNewTodoText('');
                        setIsAddingTodo(false);
                      }
                      if (e.key === 'Escape') {
                        setIsAddingTodo(false);
                        setNewTodoText('');
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="field-confirm-btn"
                    onClick={() => {
                      onAddTodo(newTodoText);
                      setNewTodoText('');
                      setIsAddingTodo(false);
                    }}
                  >
                    ✓ add
                  </button>
                  <button
                    type="button"
                    className="field-cancel-btn"
                    onClick={() => {
                      setIsAddingTodo(false);
                      setNewTodoText('');
                    }}
                  >
                    cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="add-item-btn"
                  onClick={() => setIsAddingTodo(true)}
                  style={{ marginTop: localTodos.length > 0 ? 8 : 0 }}
                >
                  + Add to-do
                </button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TodoRow({ todo, locked, onDragStart, onDragOver, onDrop, onDragEnd, onCycleStatus, onEditText, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.text);

  function startEdit() {
    setDraft(todo.text);
    setEditing(true);
  }
  function confirmEdit() {
    onEditText(draft);
    setEditing(false);
  }

  return (
    <div
      className="rm-todo-row"
      draggable={!locked}
      onDragStart={locked ? undefined : onDragStart}
      onDragOver={locked ? undefined : onDragOver}
      onDrop={locked ? undefined : onDrop}
      onDragEnd={locked ? undefined : onDragEnd}
    >
      {!locked && <DragHandle size={8} className="rm-todo-drag-handle" />}
      <button
        type="button"
        className={`rm-todo-node status-${todo.status}`}
        onClick={locked ? undefined : onCycleStatus}
        title={locked ? undefined : 'Click to change status'}
        style={locked ? { cursor: 'default' } : undefined}
      >
        {todo.status === 'done' ? '✓' : ''}
      </button>
      {!locked && editing ? (
        <div style={{ flex: 1 }}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
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
          <span className={`rm-todo-label${todo.status === 'done' && !locked ? ' rm-done-text' : ''}`}>{todo.text}</span>
          {!locked && (
            <span style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button type="button" className="edit-btn" onClick={startEdit} title="Edit to-do">
                ✎
              </button>
              <button type="button" className="edit-btn" onClick={onRemove} title="Remove to-do">
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}