import { useCallback, useEffect, useRef } from 'react';
import { useConfig, useConfigDispatch } from '../state/ConfigContext.jsx';
import { setField } from '../state/configReducer.js';
import { RANGES } from '../lib/config.js';
import { useEngine } from '../hooks/useAudioEngine.js';
import { useEngineFrame } from '../hooks/useEngineFrame.js';
import MixSlider from './MixSlider.jsx';

const hz0 = (v) => `${Math.round(v)} Hz`;
const hz1 = (v) => `${v.toFixed(1)} Hz`;
const pct = (v) => `${Math.round(v * 100)}%`;

// Edit formatters/parsers for the click-to-edit readouts. Number-only (the unit
// suffix is a separate muted span). Module-level so the memoized MixSlider rows
// keep stable prop identities and don't clobber the driven live-mirror.
const hz0Edit = (v) => String(Math.round(v));
const hz1Edit = (v) => v.toFixed(1);
const pctEdit = (v) => String(Math.round(v * 100));
const parseIntBase10 = (s) => parseInt(s, 10);
const parsePct = (s) => parseFloat(s) / 100; // edit in 0..100, store 0..1

/**
 * BinauralLayerBody — tone controls: carrier / beat / vol rows (all MixSlider)
 * and the headphones badge. Carrier and Beat become `driven`
 * (inert + drivetag) when their drift is enabled, mirroring the drift start
 * value; editing dispatches to config.
 */
export default function BinauralLayerBody() {
  const config = useConfig();
  const dispatch = useConfigDispatch();
  const { playing } = useEngine();
  const { tone, drift, carrierDrift } = config;

  const carrierDriven = carrierDrift.on;
  const beatDriven = drift.on;
  const carrierValue = carrierDriven ? carrierDrift.start : tone.carrier;
  const beatValue = beatDriven ? drift.start : tone.beat;

  // Refs into the (inert, `driven`) carrier/beat rows so an active drift can
  // mirror the LIVE curve value onto the thumb + value text each frame — purely
  // imperative, never dispatched to the reducer (config never changes here).
  const carrierInputRef = useRef(null);
  const carrierValRef = useRef(null);
  const beatInputRef = useRef(null);
  const beatValRef = useRef(null);

  // Stable onChange identities so the memoized MixSlider rows can bail out of
  // coarse-clock re-renders (see MixSlider) and not clobber the live thumb.
  const onCarrier = useCallback((v) => dispatch(setField('tone.carrier', v)), [dispatch]);
  const onBeat = useCallback((v) => dispatch(setField('tone.beat', v)), [dispatch]);
  const onVol = useCallback((v) => dispatch(setField('tone.vol', v)), [dispatch]);

  useEngineFrame((f) => {
    if (!f.playing) return;
    if (beatDriven) {
      if (beatInputRef.current) beatInputRef.current.value = String(f.beat);
      if (beatValRef.current) beatValRef.current.textContent = hz1(f.beat);
    }
    if (carrierDriven) {
      if (carrierInputRef.current) carrierInputRef.current.value = String(f.carrier);
      if (carrierValRef.current) carrierValRef.current.textContent = hz0(f.carrier);
    }
  });

  // At session end / stop, snap the mirrored controls back to their pre-play
  // base (drift.start). React may skip re-writing a controlled input / text
  // whose vdom value is unchanged, so re-assert imperatively when not playing.
  useEffect(() => {
    if (playing) return;
    if (beatInputRef.current) beatInputRef.current.value = String(beatValue);
    if (beatValRef.current) beatValRef.current.textContent = hz1(beatValue);
    if (carrierInputRef.current) carrierInputRef.current.value = String(carrierValue);
    if (carrierValRef.current) carrierValRef.current.textContent = hz0(carrierValue);
  }, [playing, beatValue, carrierValue]);

  return (
    <>
      <div className="tonectl">
        <MixSlider
          className="basetone"
          label="Carrier"
          value={carrierValue}
          min={RANGES.carrier[0]}
          max={RANGES.carrier[1]}
          step={1}
          format={hz0}
          unit="Hz"
          editFormat={hz0Edit}
          editParse={parseIntBase10}
          inputMode="numeric"
          driven={carrierDriven}
          onChange={onCarrier}
          inputRef={carrierInputRef}
          valueRef={carrierValRef}
        />
        {carrierDriven && <div className="drivetag">↳ set by Carrier drift</div>}

        <MixSlider
          className="basetone"
          label="Beat"
          value={beatValue}
          min={RANGES.beat[0]}
          max={RANGES.beat[1]}
          step={0.1}
          format={hz1}
          unit="Hz"
          editFormat={hz1Edit}
          editParse={parseFloat}
          driven={beatDriven}
          onChange={onBeat}
          inputRef={beatInputRef}
          valueRef={beatValRef}
        />
        {beatDriven && <div className="drivetag">↳ set by Beat drift</div>}

        <MixSlider
          label="Vol"
          value={tone.vol}
          min={RANGES.vol[0]}
          max={RANGES.vol[1]}
          step={0.01}
          format={pct}
          unit="%"
          editFormat={pctEdit}
          editParse={parsePct}
          inputMode="numeric"
          onChange={onVol}
        />
      </div>

      <div className="badge-hp" style={{ marginTop: 8 }}>
        <svg width="11" height="11" viewBox="0 0 24 24">
          <path d="M12 3a9 9 0 00-9 9v5a3 3 0 003 3h1v-7H5v-1a7 7 0 0114 0v1h-2v7h1a3 3 0 003-3v-5a9 9 0 00-9-9z" />
        </svg>
        Headphones required
      </div>
    </>
  );
}
