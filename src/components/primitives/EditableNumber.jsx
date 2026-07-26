import { useState, useRef, useEffect } from 'react';
import { cx } from '../../lib/cx.js';

/**
 * EditableNumber — the mock's `_editing` click-to-edit numeric span, as one
 * reusable React control. Shows `format(value)` + a muted unit; click (or
 * Enter/Space when focused) swaps in a text input; Enter/blur commits, Escape
 * cancels. Commits the parsed number via `onCommit` — the parent dispatches to
 * config and the reducer clamps, so this control never has to know the range.
 *
 * Used for the DualSlider start/end numbers and the drift `plateaus` value.
 */
export default function EditableNumber({
  value,
  unit = '',
  format = (v) => String(v),
  parse = parseFloat,
  onCommit,
  className,
  title,
  ariaLabel,
  inputMode = 'decimal',
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);
  const committedRef = useRef(false);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function open() {
    if (editing) return;
    committedRef.current = false;
    setDraft(format(value));
    setEditing(true);
  }

  function commit() {
    if (committedRef.current) return;
    committedRef.current = true;
    setEditing(false);
    const n = parse(draft);
    if (!Number.isNaN(n)) onCommit?.(n);
  }

  function cancel() {
    committedRef.current = true;
    setEditing(false);
  }

  if (editing) {
    return (
      <span className={cx(className)}>
        <input
          ref={inputRef}
          type="text"
          inputMode={inputMode}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commit(); }
            else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
            e.stopPropagation();
          }}
        />
      </span>
    );
  }

  return (
    <span
      className={cx(className)}
      tabIndex={0}
      role="button"
      title={title}
      aria-label={ariaLabel ?? title}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      }}
    >
      <span>{format(value)}</span>
      {unit ? <span className="du">{unit}</span> : null}
    </span>
  );
}
