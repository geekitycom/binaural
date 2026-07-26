import { useConfig, useConfigDispatch } from '../state/ConfigContext.jsx';
import { setField } from '../state/configReducer.js';
import Toggle from './primitives/Toggle.jsx';
import ColorDot from './primitives/ColorDot.jsx';
import { cx } from '../lib/cx.js';

// Quick base-beat presets (one representative frequency per band).
const PRESETS = [
  { key: 'delta', label: 'Delta', hz: 2 },
  { key: 'theta', label: 'Theta', hz: 6 },
  { key: 'alpha', label: 'Alpha', hz: 10 },
  { key: 'beta', label: 'Beta', hz: 20 },
];

/**
 * TimelineToolbar — band presets + Beat/Carrier drift toggles.
 * Presets set the base beat (`tone.beat`) and are disabled while beat drift is
 * on (the drift owns the beat then). Drift toggles flip config `*.on` (which
 * show/hide the drift cards and drive the tone sliders).
 */
export default function TimelineToolbar() {
  const { drift, carrierDrift } = useConfig();
  const dispatch = useConfigDispatch();

  return (
    <div className="tl-toolbar">
      <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginRight: 2 }}>
        Presets
      </span>
      <div className="presets">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            className={cx('preset', `p-${p.key}`)}
            disabled={drift.on}
            onClick={() => dispatch(setField('tone.beat', p.hz))}
          >
            <ColorDot className="pd" color={`var(--band-${p.key})`} />
            <span className="pt">{p.label}</span>
          </button>
        ))}
      </div>
      <div className="tb-spacer" />
      <Toggle pressed={drift.on} onChange={(v) => dispatch(setField('drift.on', v))}>Beat drift</Toggle>
      <Toggle pressed={carrierDrift.on} onChange={(v) => dispatch(setField('carrierDrift.on', v))}>Carrier drift</Toggle>
    </div>
  );
}
