import { useEffect, useRef } from 'react';
import { useConfig } from '../state/ConfigContext.jsx';
import { useEngine } from '../hooks/useAudioEngine.js';
import { useEngineFrame } from '../hooks/useEngineFrame.js';
import { beatAt, carrierAt } from '../audio/curves.js';
import IconButton from './primitives/IconButton.jsx';
import ThemeToggle from './primitives/ThemeToggle.jsx';
import BandPill, { bandMeta } from './primitives/BandPill.jsx';

function mmss(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

const lrText = (carrier, beat) => `${Math.round(carrier)}·${Math.round(carrier + beat)}`;

/**
 * TransportBar — brand, transport buttons, scrub bar and the live readouts +
 * band pill. Idle values render straight from config (carrierAt/beatAt at
 * frac 0). While playing, Phase 6 paints the smooth scrub fill/knob, the
 * elapsed-time label, the three readouts and the band pill IMPERATIVELY from
 * engine onFrame (refs -> DOM), so the React tree never re-renders at 60fps.
 *
 * A reset effect keyed on `playing` restores every driven node to its idle
 * config value when playback stops (React text/style diffing would otherwise
 * skip re-writing a node whose vdom value is unchanged, leaving a stale live
 * value in the DOM).
 */
export default function TransportBar() {
  const config = useConfig();
  const {
    play, pause, stop, playing, paused, clock,
  } = useEngine();

  const carrier = carrierAt(config, 0);
  const beat = beatAt(config, 0);
  const total = mmss(config.duration * 60);
  const durationSec = config.duration * 60;

  // Imperative nodes (driven per-frame while playing).
  const fillRef = useRef(null);
  const knobRef = useRef(null);
  const timeRef = useRef(null);
  const roCarrierRef = useRef(null);
  const roBeatRef = useRef(null);
  const roLrRef = useRef(null);
  const pillRootRef = useRef(null);
  const pillDotRef = useRef(null);
  const pillLabelRef = useRef(null);

  // Per-frame paint (no setState). Latest closure is held in a ref by the hook,
  // so it always sees current config-derived values (durationSec).
  useEngineFrame((f) => {
    if (!f.playing) return;
    const frac = durationSec > 0 ? Math.max(0, Math.min(1, f.elapsed / durationSec)) : 0;
    const pct = `${(frac * 100).toFixed(3)}%`;
    if (fillRef.current) fillRef.current.style.width = pct;
    if (knobRef.current) knobRef.current.style.left = pct;
    if (timeRef.current) timeRef.current.textContent = mmss(f.elapsed);
    if (roCarrierRef.current) roCarrierRef.current.childNodes[0].nodeValue = String(Math.round(f.carrier));
    if (roBeatRef.current) roBeatRef.current.childNodes[0].nodeValue = f.beat.toFixed(1);
    if (roLrRef.current) roLrRef.current.textContent = lrText(f.carrier, f.beat);
    const meta = bandMeta(f.beat);
    if (pillRootRef.current) {
      pillRootRef.current.style.borderColor = meta.color;
      pillRootRef.current.style.color = meta.color;
      pillRootRef.current.style.background = meta.surface;
    }
    if (pillDotRef.current) pillDotRef.current.style.background = meta.color;
    if (pillLabelRef.current) pillLabelRef.current.textContent = meta.label;
  });

  // Return-to-idle: whenever not playing, overwrite the driven nodes with the
  // config values (guarantees no stale live value survives a stop/end).
  useEffect(() => {
    if (playing) return;
    if (fillRef.current) fillRef.current.style.width = '0%';
    if (knobRef.current) knobRef.current.style.left = '0%';
    if (timeRef.current) timeRef.current.textContent = mmss(0);
    if (roCarrierRef.current) roCarrierRef.current.childNodes[0].nodeValue = String(Math.round(carrier));
    if (roBeatRef.current) roBeatRef.current.childNodes[0].nodeValue = beat.toFixed(1);
    if (roLrRef.current) roLrRef.current.textContent = lrText(carrier, beat);
    const meta = bandMeta(beat);
    if (pillRootRef.current) {
      pillRootRef.current.style.borderColor = meta.color;
      pillRootRef.current.style.color = meta.color;
      pillRootRef.current.style.background = meta.surface;
    }
    if (pillDotRef.current) pillDotRef.current.style.background = meta.color;
    if (pillLabelRef.current) pillLabelRef.current.textContent = meta.label;
  }, [playing, carrier, beat]);

  // Coarse (~2/s) elapsed fallback so the label stays correct in a hidden tab
  // where rAF is throttled; idle shows 00:00.
  const coarseElapsed = mmss(playing ? clock.elapsed : 0);

  return (
    <div className="transport">
      <div className="brand">
        <div className="logo" />
        <div>
          <div className="name">Binaural</div>
          <div className="sub">Session Studio</div>
        </div>
      </div>

      <div className="tbtns">
        <IconButton className="tbtn play" title="Play" onClick={play} disabled={playing}>
          <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
        </IconButton>
        <IconButton
          className="tbtn"
          title={paused ? 'Resume' : 'Pause'}
          onClick={pause}
          disabled={!playing}
        >
          {paused
            ? <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            : <svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>}
        </IconButton>
        <IconButton className="tbtn" title="Stop" onClick={stop} disabled={!playing}>
          <svg viewBox="0 0 24 24"><path d="M6 6h12v12H6z" /></svg>
        </IconButton>
        <ThemeToggle />
      </div>

      <div className="scrub">
        <span className="time mono"><b ref={timeRef}>{coarseElapsed}</b></span>
        <div className="track-line">
          <div className="fill" ref={fillRef} style={{ width: '0%' }} />
          <div className="knob" ref={knobRef} style={{ left: '0%' }} />
        </div>
        <span className="time mono">{total}</span>
      </div>

      <div className="readout">
        <div className="ro">
          <div className="k">Carrier</div>
          <div className="v mono" ref={roCarrierRef}>{Math.round(carrier)}<small>Hz</small></div>
        </div>
        <div className="ro">
          <div className="k">Beat</div>
          <div className="v mono" ref={roBeatRef}>{beat.toFixed(1)}<small>Hz</small></div>
        </div>
        <div className="ro">
          <div className="k">L · R</div>
          <div className="v mono" ref={roLrRef}>{lrText(carrier, beat)}</div>
        </div>
        <BandPill
          beat={beat}
          rootRef={pillRootRef}
          dotRef={pillDotRef}
          labelRef={pillLabelRef}
        />
      </div>
    </div>
  );
}
