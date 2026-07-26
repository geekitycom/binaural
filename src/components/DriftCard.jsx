import { useConfig, useConfigDispatch } from '../state/ConfigContext.jsx';
import { setField } from '../state/configReducer.js';
import { SHAPES } from '../lib/config.js';
import Panel from './primitives/Panel.jsx';
import DualSlider from './DualSlider.jsx';
import SegControl from './primitives/SegControl.jsx';
import EditableNumber from './primitives/EditableNumber.jsx';

// One component, rendered TWICE (beat & carrier) — differences are pure config.
const KINDS = {
  beat: {
    group: 'drift',
    title: 'Beat drift · session progression',
    min: 0.5, max: 40, step: 0.5, unit: 'Hz', decimals: 1,
    hint: (
      <>Drag either handle, or click a number to type a value. Handles may cross — a
        descent (10→5) shows the ↓ cue. The timeline curve and Hz axis update live.</>
    ),
  },
  carrier: {
    group: 'carrierDrift',
    title: 'Carrier drift · independent carrier sweep',
    min: 50, max: 500, step: 1, unit: 'Hz', decimals: 0,
    hint: (
      <>The carrier drifts independently of the beat (dashed line on the timeline).
        Range <b>50–500 Hz</b>. Both ears track the carrier; the beat is the L/R offset.</>
    ),
  },
};

const SHAPE_OPTIONS = SHAPES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }));

/**
 * DriftCard — the GENERIC drift editor used for BOTH beat and carrier drift
 * (chosen by `kind`). Composes DualSlider (start/end) + SegControl (shape) +
 * EditableNumber (plateaus, shown only when shape === 'stepped'). Every edit
 * dispatches to config under the kind's group path.
 */
export default function DriftCard({ kind }) {
  const meta = KINDS[kind];
  const config = useConfig();
  const dispatch = useConfigDispatch();
  const d = config[meta.group];
  const path = (leaf) => `${meta.group}.${leaf}`;

  return (
    <Panel title={meta.title}>
      <div className="bd">
        <DualSlider
          min={meta.min}
          max={meta.max}
          step={meta.step}
          unit={meta.unit}
          decimals={meta.decimals}
          start={d.start}
          end={d.end}
          onChange={(which, v) => dispatch(setField(path(which), v))}
        />
        <div className="driftctl">
          <div className="frow">
            <label>Shape</label>
            <SegControl
              className="shape-seg"
              options={SHAPE_OPTIONS}
              value={d.shape}
              onChange={(v) => dispatch(setField(path('shape'), v))}
            />
          </div>
          {d.shape === 'stepped' && (
            <div className="frow plateaus-row">
              <label>Plateaus</label>
              <EditableNumber
                className="dnum plateaus"
                value={d.plateaus}
                unit="×"
                format={(v) => String(v)}
                parse={(s) => parseInt(s, 10)}
                inputMode="numeric"
                onCommit={(v) => dispatch(setField(path('plateaus'), v))}
                title="Click to edit plateaus"
              />
            </div>
          )}
        </div>
        <div className="hint">{meta.hint}</div>
      </div>
    </Panel>
  );
}
