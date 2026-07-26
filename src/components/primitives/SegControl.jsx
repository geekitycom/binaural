import { cx } from '../../lib/cx.js';

/**
 * SegControl — a segmented button group (single active option). Backs both the
 * noise-type picker and the drift `shape` picker. Controlled: `value` selects
 * the active option, `onChange(value)` fires on click.
 *
 * options: [{ value, label }]
 */
export default function SegControl({ options, value, onChange, className, style }) {
  return (
    <div className={cx('seg', className)} style={style}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={cx(opt.value === value && 'on')}
          aria-pressed={opt.value === value}
          onClick={() => onChange?.(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
