import { cx } from '../lib/cx.js';

/**
 * Layer — the GENERIC mixer track shared by all three layers. Renders the
 * header (name + color dot + Power) and slots the layer-specific body as
 * children. The three layer bodies compose MixSlider/SegControl inside this one
 * shell — no per-layer header duplication.
 *
 * Power (ON/OFF) is config (`*.on`) via `onPower`; the engine hook forwards it
 * to setLayerPower (live add/remove). `layer` is the engine key
 * ('tone' | 'iso' | 'noise'). `hint`, if given, renders a "?" affordance next to
 * the name that reveals a short explanation of the layer's method on hover/focus.
 */
export default function Layer({
  name, variant, on, onPower, hint, children,
}) {
  return (
    <div className={cx('layer', variant, !on && 'off')}>
      <div className="lhd">
        <div className="lname">
          <span className="cdot" />
          {name}
          {hint && (
            <span
              className="lhint"
              tabIndex={0}
              role="note"
              aria-label={hint}
              data-tip={hint}
            >
              ?
            </span>
          )}
        </div>
        <div className="msbtns">
          <button
            type="button"
            className={cx('ms', 'pow', on && 'on')}
            title={on ? 'Enabled' : 'Disabled'}
            aria-pressed={on}
            onClick={() => onPower?.(!on)}
          >
            {on ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}
