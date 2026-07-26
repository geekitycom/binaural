import { useConfig, useConfigDispatch } from '../state/ConfigContext.jsx';
import { setField } from '../state/configReducer.js';
import { RANGES, NOISE_TYPES } from '../lib/config.js';
import MixSlider from './MixSlider.jsx';
import SegControl from './primitives/SegControl.jsx';

const pct = (v) => `${Math.round(v * 100)}%`;
const pctEdit = (v) => String(Math.round(v * 100));
const parsePct = (s) => parseFloat(s) / 100; // edit in 0..100, store 0..1
const NOISE_OPTIONS = NOISE_TYPES.map((t) => ({ value: t, label: t[0].toUpperCase() + t.slice(1) }));

/**
 * NoiseLayerBody — background-noise controls: type SegControl + Vol MixSlider.
 * Edits dispatch to config (`noise.type` / `noise.vol`).
 */
export default function NoiseLayerBody() {
  const { noise } = useConfig();
  const dispatch = useConfigDispatch();

  return (
    <>
      <SegControl
        options={NOISE_OPTIONS}
        value={noise.type}
        onChange={(v) => dispatch(setField('noise.type', v))}
        style={{ marginBottom: 9 }}
      />
      <MixSlider
        label="Vol"
        value={noise.vol}
        min={RANGES.vol[0]}
        max={RANGES.vol[1]}
        step={0.01}
        format={pct}
        unit="%"
        editFormat={pctEdit}
        editParse={parsePct}
        inputMode="numeric"
        onChange={(v) => dispatch(setField('noise.vol', v))}
      />
    </>
  );
}
