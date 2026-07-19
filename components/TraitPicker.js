import { useEffect, useRef, useState } from 'react';

// Search-and-select trait picker.
//
// variant="inline" (default): used on the project detail page. Input is always visible,
// selected traits show as chips above it, and typing can add a brand-new trait.
//
// variant="compact": used for the dashboard's trait filter. Collapsed behind a "Traits ▾"
// toggle button so a long trait list doesn't crowd the page — opens into the same
// search/select list on click. No "add new" here; filtering only makes sense against
// traits that already exist, so `allowAdd` should be left false for this variant.
// Pass `matchMode` ("any" | "all") + `onMatchModeChange` to show an any/all toggle —
// it only renders once 2+ traits are selected, since the choice is meaningless before that.
//
// `locked` (inline variant only — the dashboard filter is never locked): renders chips as
// plain, non-removable, and hides the search input/dropdown entirely, so traits are visible
// but untouchable on a completed project. See isLocked() in projectFieldConfig.js.
export default function TraitPicker({
  value,
  onChange,
  options,
  allowAdd = true,
  variant = 'inline',
  matchMode,
  onMatchModeChange,
  locked = false,
}) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const query = text.trim().toLowerCase();
  const suggestions = options.filter(
    (t) => !value.includes(t) && t.toLowerCase().includes(query)
  );
  const alreadyExists =
    options.some((t) => t.toLowerCase() === query) ||
    value.some((t) => t.toLowerCase() === query);
  const canAddNew = allowAdd && query.length > 0 && !alreadyExists;

  function selectTrait(trait) {
    onChange([...value, trait]);
    setText('');
  }

  function removeTrait(trait) {
    onChange(value.filter((t) => t !== trait));
  }

  const chips = value.map((trait) =>
    locked ? (
      <span key={trait} className="trait-chip">
        {trait}
      </span>
    ) : (
      <span
        key={trait}
        className="trait-chip trait-chip-removable"
        onClick={() => removeTrait(trait)}
        title="Remove"
      >
        {trait} <span aria-hidden="true">×</span>
      </span>
    )
  );

  if (variant === 'compact') {
    return (
      <div
        ref={wrapRef}
        style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
          <button
            type="button"
            className={`tab${open ? ' active-tab' : ''}`}
            onClick={() => {
              setOpen((o) => !o);
              setText('');
            }}
          >
            Traits ▾
          </button>
          {chips}
        </div>
        {value.length > 1 && onMatchModeChange && (
          <div className="match-toggle" style={{ flexShrink: 0 }}>
            <button
              type="button"
              className={matchMode !== 'all' ? 'active' : ''}
              onClick={() => onMatchModeChange('any')}
              title="Show projects matching any selected trait"
            >
              any
            </button>
            <button
              type="button"
              className={matchMode === 'all' ? 'active' : ''}
              onClick={() => onMatchModeChange('all')}
              title="Show projects matching all selected traits"
            >
              all
            </button>
          </div>
        )}
        {open && (
          <div className="trait-dropdown" style={{ top: 'calc(100% + 4px)', left: 0, minWidth: 200 }}>
            <input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Search traits…"
              style={{ margin: 6, width: 'calc(100% - 12px)' }}
            />
            {suggestions.length === 0 && (
              <div className="trait-option" style={{ color: 'var(--slate)', cursor: 'default' }}>
                No matches
              </div>
            )}
            {suggestions.map((trait) => (
              <div key={trait} className="trait-option" onMouseDown={() => selectTrait(trait)}>
                {trait}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {value.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: locked ? 0 : 8 }}>{chips}</div>
      )}
      {!locked && (
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search or add a trait…"
        />
      )}
      {!locked && open && (suggestions.length > 0 || canAddNew) && (
        <div className="trait-dropdown">
          {suggestions.map((trait) => (
            <div key={trait} className="trait-option" onMouseDown={() => selectTrait(trait)}>
              {trait}
            </div>
          ))}
          {canAddNew && (
            <div
              className="trait-option trait-option-new"
              onMouseDown={() => selectTrait(text.trim())}
            >
              + add "{text.trim()}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}