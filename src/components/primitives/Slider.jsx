import { cx } from '../../lib/cx.js';

/**
 * Slider — the app's single <input type="range">. Every layer volume, the
 * carrier/beat/offset controls, etc. compose this exactly once. Presentational:
 * value in, number out via onChange. Styling comes from the `.slider` class in
 * base.css (theme-driven); callers add modifier classes via `className`.
 */
export default function Slider({
  min,
  max,
  step = 1,
  value,
  onChange,
  disabled = false,
  className,
  inputRef,
  ...rest
}) {
  return (
    <input
      ref={inputRef}
      type="range"
      className={cx('slider', className)}
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      tabIndex={disabled ? -1 : undefined}
      onChange={(e) => onChange?.(parseFloat(e.target.value))}
      {...rest}
    />
  );
}
