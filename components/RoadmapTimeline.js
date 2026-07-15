import { useEffect, useRef, useState } from 'react';

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

// Vertical roadmap timeline with a nested to-do list per step.
//
// - Click a step's or to-do's dot to cycle status (not started -> in progress -> done).
// - Steps are draggable to reorder; to-dos are not (order doesn't matter for them).
// - A step's to-do list auto-expands the moment the step is set to "in progress".
// - A step auto-completes once every to-do under it is done. This only ever pushes a step
//   toward done, never away from it — reopening a to-do afterward won't un-complete a step,
//   so a manual "done" override always sticks even with to-dos left unfinished.
// - Expand/collapse state is page-local, not saved — it's recomputed on load from whether
//   the step is in progress, so it doesn't need its own persisted field.
export default function RoadmapTimeline({ value, onChange }) {
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
    const updated = items.map((s) => (s.id === id ? { ...s, status: nextStatus(s.status) } : s));
    commit(updated);
    const changed = updated.find((s) => s.id === id);
    if (changed.status === 'in_progress') {
      setExpanded((e) => ({ ...e, [id]: true }));
    }
  }

  function editStepText(id, text) {
    commit(items.map((s) => (s.id === id ? { ...s, text } : s)));
  }

  function removeStep(id) {
    commit(items.filter((s) => s.id !== id));
  }

  function addStep() {
    if (!newStepText.trim()) return;
    commit([...items, { id: makeId(), text: newStepText.trim(), status: 'not_started', todos: [] }]);
    setNewStepText('');
  }

  function toggleExpanded(id) {
    setExpanded((e) => ({ ...e, [id]: !e[id] }));
  }

  function cycleTodoStatus(stepId, todoId) {
    const updated = items.map((s) => {
      if (s.id !== stepId) return s;
      const todos = s.todos.map((t) => (t.id === todoId ? { ...t, status: nextStatus(t.status) } : t));
      return { ...s, todos, status: allTodosDone(todos) ? 'done' : s.status };
    });
    commit(updated);
  }

  function addTodo(stepId, text) {
    if (!text.trim()) return;
    const updated = items.map((s) => {
      if (s.id !== stepId) return s;
      const todos = [...s.todos, { id: makeId(), text: text.trim(), status: 'not_started' }];
      return { ...s, todos, status: allTodosDone(todos) ? 'done' : s.status };
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
      return { ...s, todos, status: allTodosDone(todos) ? 'done' : s.status };
    });
    commit(updated);
  }

  function reorderTodos(stepId, newTodos) {
    commit(items.map((s) => (s.id === stepId ? { ...s, todos: newTodos } : s)));
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
        <StepRow
          key={step.id}
          step={step}
          isLast={i === items.length - 1}
          expanded={!!expanded[step.id]}
          onToggleExpanded={() => toggleExpanded(step.id)}
          onDragStart={() => handleDragStart(i)}
          onDragOver={(e) => handleDragOver(e, i)}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          onCycleStatus={() => cycleStepStatus(step.id)}
          onEditText={(text) => editStepText(step.id, text)}
          onRemove={() => removeStep(step.id)}
          onCycleTodoStatus={(todoId) => cycleTodoStatus(step.id, todoId)}
          onAddTodo={(text) => addTodo(step.id, text)}
          onEditTodoText={(todoId, text) => editTodoText(step.id, todoId, text)}
          onRemoveTodo={(todoId) => removeTodo(step.id, todoId)}
          onReorderTodos={(newTodos) => reorderTodos(step.id, newTodos)}
        />
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

function StepRow({
  step,
  isLast,
  expanded,
  onToggleExpanded,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onCycleStatus,
  onEditText,
  onRemove,
  onCycleTodoStatus,
  onAddTodo,
  onEditTodoText,
  onRemoveTodo,
  onReorderTodos,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(step.text);
  const [newTodoText, setNewTodoText] = useState('');

  function startEdit() {
    setDraft(step.text);
    setEditing(true);
  }
  function confirmEdit() {
    onEditText(draft);
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

  function handleTodoDragStart(index) {
    todoDraggedIndex.current = index;
    setTodoDragging(true);
  }
  function handleTodoDragOver(e, index) {
    e.preventDefault();
    const from = todoDraggedIndex.current;
    if (from === null || from === index) return;
    const updated = [...localTodos];
    const [moved] = updated.splice(from, 1);
    updated.splice(index, 0, moved);
    todoDraggedIndex.current = index;
    setLocalTodos(updated);
  }
  function handleTodoDrop() {
    setTodoDragging(false);
    todoDraggedIndex.current = null;
    onReorderTodos(localTodos);
  }
  function handleTodoDragEnd() {
    setTodoDragging(false);
    todoDraggedIndex.current = null;
  }

  return (
    <div
      className="rm-vstep"
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div className="rm-gutter">
        {!isLast && <div className="rm-vline" />}
        <span className="rm-drag-handle" title="Drag to reorder">
          ⠿
        </span>
        <button
          type="button"
          className={`rm-vnode status-${step.status}`}
          onClick={onCycleStatus}
          title="Click to change status"
        >
          {step.status === 'done' ? '✓' : ''}
        </button>
      </div>

      <div className="rm-content">
        {editing ? (
          <div>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <span className={`rm-vlabel${step.status === 'done' ? ' rm-done-text' : ''}`}>{step.text}</span>
            <span style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button
                type="button"
                className="edit-btn"
                onClick={onToggleExpanded}
                title={expanded ? 'Collapse to-dos' : 'Expand to-dos'}
              >
                {expanded ? '▾' : '▸'}
              </button>
              <button type="button" className="edit-btn" onClick={startEdit} title="Edit step">
                ✎
              </button>
              <button type="button" className="edit-btn" onClick={onRemove} title="Remove step">
                ×
              </button>
            </span>
          </div>
        )}

        {expanded && (
          <div className="rm-todos">
            {localTodos.map((todo, i) => (
              <TodoRow
                key={todo.id}
                todo={todo}
                onDragStart={() => handleTodoDragStart(i)}
                onDragOver={(e) => handleTodoDragOver(e, i)}
                onDrop={handleTodoDrop}
                onDragEnd={handleTodoDragEnd}
                onCycleStatus={() => onCycleTodoStatus(todo.id)}
                onEditText={(text) => onEditTodoText(todo.id, text)}
                onRemove={() => onRemoveTodo(todo.id)}
              />
            ))}
            <div style={{ display: 'flex', gap: 6, marginTop: localTodos.length > 0 ? 8 : 0 }}>
              <input
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                placeholder="Add a to-do…"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onAddTodo(newTodoText);
                    setNewTodoText('');
                  }
                }}
              />
              <button
                type="button"
                className="btn"
                onClick={() => {
                  onAddTodo(newTodoText);
                  setNewTodoText('');
                }}
              >
                add
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TodoRow({ todo, onDragStart, onDragOver, onDrop, onDragEnd, onCycleStatus, onEditText, onRemove }) {
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
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <span className="rm-drag-handle rm-todo-drag-handle" title="Drag to reorder">
        ⠿
      </span>
      <button
        type="button"
        className={`rm-todo-node status-${todo.status}`}
        onClick={onCycleStatus}
        title="Click to change status"
      >
        {todo.status === 'done' ? '✓' : ''}
      </button>
      {editing ? (
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
          <span className={`rm-todo-label${todo.status === 'done' ? ' rm-done-text' : ''}`}>{todo.text}</span>
          <span style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button type="button" className="edit-btn" onClick={startEdit} title="Edit to-do">
              ✎
            </button>
            <button type="button" className="edit-btn" onClick={onRemove} title="Remove to-do">
              ×
            </button>
          </span>
        </div>
      )}
    </div>
  );
}