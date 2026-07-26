import { useConfig, useConfigDispatch } from '../state/ConfigContext.jsx';
import { setField } from '../state/configReducer.js';
import { RANGES } from '../lib/config.js';
import MixSlider from './MixSlider.jsx';

const pct = (v) => `${Math.round(v * 100)}%`;
const offset = (v) => `${v > 0 ? '+' : ''}${Math.round(v)}Hz`;

// Edit formatters/parsers (number-only; unit is a separate muted span).
const pctEdit = (v) => String(Math.round(v * 100));
const parsePct = (s) => parseFloat(s) / 100; // edit in 0..100, store 0..1
const offsetEdit = (v) => `${v > 0 ? '+' : ''}${Math.round(v)}`; // signed, e.g. "+18" / "-12" / "0"
const parseIntBase10 = (s) => parseInt(s, 10);

/**
 * IsoLayerBody — isochronic pulse controls: Vol + Offset (real −100..100 Hz
 * relative to the carrier). Both rows are MixSlider; edits dispatch to config.
 */
export default function IsoLayerBody() {
  const { iso } = useConfig();
  const dispatch = useConfigDispatch();

  return (
    <>
      <div className="meta"><span>gated @ beat rate</span></div>
      <MixSlider
        label="Vol"
        value={iso.vol}
        min={RANGES.vol[0]}
        max={RANGES.vol[1]}
        step={0.01}
        format={pct}
        unit="%"
        editFormat={pctEdit}
        editParse={parsePct}
        inputMode="numeric"
        style={{ marginBottom: 8 }}
        onChange={(v) => dispatch(setField('iso.vol', v))}
      />
      <MixSlider
        label="Offs"
        value={iso.offset}
        min={RANGES.offset[0]}
        max={RANGES.offset[1]}
        step={1}
        format={offset}
        unit="Hz"
        editFormat={offsetEdit}
        editParse={parseIntBase10}
        inputMode="numeric"
        onChange={(v) => dispatch(setField('iso.offset', v))}
      />
      <div className="off-hint">Audible on speakers · no headphones needed</div>
    </>
  );
}
