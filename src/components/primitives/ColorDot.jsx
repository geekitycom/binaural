import { forwardRef } from 'react';
import { cx } from '../../lib/cx.js';

/**
 * ColorDot — a small colored swatch. `color` is a CSS color *token reference*
 * (e.g. 'var(--band-alpha)'), never a hex, so it follows the theme. Used for
 * the band-pill dot, timeline preset dots and legend swatches.
 *
 * Forwards a ref to the underlying span so callers (e.g. the live BandPill) can
 * recolor it imperatively off the React reconciler.
 */
const ColorDot = forwardRef(function ColorDot({ color, className, style }, ref) {
  return (
    <span
      ref={ref}
      className={cx(className)}
      style={{ background: color, ...style }}
    />
  );
});

export default ColorDot;
