import { cx } from '../../lib/cx.js';

/**
 * IconButton — a button whose content is an icon (SVG passed as children).
 * Used for transport controls (`tbtn`) and saved-session row actions
 * (`iconbtn`). The visual variant is entirely driven by `className`, so this
 * one component backs every icon-only button in the app.
 */
export default function IconButton({
  className,
  title,
  ariaLabel,
  onClick,
  disabled = false,
  children,
  ...rest
}) {
  return (
    <button
      type="button"
      className={cx(className)}
      title={title}
      aria-label={ariaLabel ?? title}
      onClick={onClick}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
