import { cx } from '../../lib/cx.js';

/**
 * Toggle — an aria-pressed pill toggle with a status dot. Backs the timeline
 * toolbar's Beat-drift / Carrier-drift / Snap-grid buttons. Controlled:
 * `pressed` boolean, `onChange(next)` fires the flipped value.
 */
export default function Toggle({ pressed, onChange, children, className, ...rest }) {
  return (
    <button
      type="button"
      className={cx('toggle-btn', className)}
      aria-pressed={pressed ? 'true' : 'false'}
      onClick={() => onChange?.(!pressed)}
      {...rest}
    >
      <span className="tdot" />
      {children}
    </button>
  );
}
