import { useEffect, useRef } from 'react';
import { useConfig, useConfigDispatch } from '../state/ConfigContext.jsx';
import { setField } from '../state/configReducer.js';
import { useEngine } from '../hooks/useAudioEngine.js';
import { useEngineFrame } from '../hooks/useEngineFrame.js';
import { beatAt, carrierAt } from '../audio/curves.js';
import ColorDot from './primitives/ColorDot.jsx';

// ---- geometry (matches mock-2's timeline viewBox) ----
const W = 760;
const H = 330;
const padL = 44;
const padR = 14;
const padT = 14;
const padB = 26;
const plotW = W - padL - padR;
const plotH = H - padT - padB;
const SAMPLES = 64; // dense linear sampling of the REAL interp curve
const DIVS = 10; // time gridline divisions

// Band lanes in beat-Hz. Colors are token references -> theme-aware fills.
const BANDS = [
  { name: 'Gamma', lo: 30, hi: 9999, c: 'var(--band-gamma)' },
  { name: 'Beta', lo: 14, hi: 30, c: 'var(--band-beta)' },
  { name: 'Alpha', lo: 8, hi: 14, c: 'var(--band-alpha)' },
  { name: 'Theta', lo: 4, hi: 8, c: 'var(--band-theta)' },
  { name: 'Delta', lo: 0, hi: 4, c: 'var(--band-delta)' },
];

// Framed Hz axis that always contains the beat endpoints (ported from mock).
function computeAxis(s, e) {
  const lo = Math.min(s, e);
  const hi = Math.max(s, e);
  const pad = Math.max((hi - lo) * 0.15, 1);
  let rawMin = lo - pad;
  let rawMax = hi + pad;
  if (rawMin < 0) rawMin = 0;
  const MIN_SPAN = 8;
  if (rawMax - rawMin < MIN_SPAN) {
    const mid = (rawMax + rawMin) / 2;
    rawMin = mid - MIN_SPAN / 2;
    rawMax = mid + MIN_SPAN / 2;
    if (rawMin < 0) { rawMax += -rawMin; rawMin = 0; }
  }
  const span = rawMax - rawMin;
  const step = span <= 12 ? 2 : (span <= 30 ? 5 : 10);
  const aMin = Math.max(0, Math.floor(rawMin / step) * step);
  let aMax = Math.ceil(rawMax / step) * step;
  if (aMax <= aMin) aMax = aMin + step;
  return { min: aMin, max: aMax, step };
}

function mmss(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Timeline — the SVG hero. The beat curve + area fill and the dashed carrier
 * curve are sampled from the REAL model (curves.js beatAt/carrierAt), so the
 * graph equals what the audio will play. Band lanes, an auto-scaled Hz axis
 * (computeAxis), time gridlines and the legend are drawn from config.
 *
 * The two ENDPOINT handles (only when beat drift is on) are draggable and
 * dispatch drift.start / drift.end — two-way bound with the beat DualSlider.
 * The playhead is static at t = 0 this phase (Phase 6 animates it from onFrame).
 *
 * All colors are token references (via inline `style` var()), so the whole
 * drawing re-tints when the theme flips — no hardcoded hex, no manual redraw.
 */
export default function Timeline() {
  const config = useConfig();
  const dispatch = useConfigDispatch();
  const { playing } = useEngine();
  const svgRef = useRef(null);
  const draggingRef = useRef(null);
  // Playhead nodes driven imperatively from onFrame (no React state at 60fps).
  const phRectRef = useRef(null);
  const phLineRef = useRef(null);
  const phArrowRef = useRef(null);
  const phDotRef = useRef(null);

  const { drift, duration } = config;
  const startHz = beatAt(config, 0);
  const endHz = beatAt(config, 1);
  const AX = computeAxis(startHz, endHz);

  const x = (frac) => padL + frac * plotW;
  const y = (hz) => padT + (1 - (hz - AX.min) / (AX.max - AX.min)) * plotH;
  const clampY = (hz) => Math.max(padT, Math.min(padT + plotH, y(hz)));
  const toPath = (pts) => pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`).join(' ');

  // --- beat curve + area (sampled from the real interp) ---
  const beatPts = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const frac = i / SAMPLES;
    beatPts.push([x(frac), clampY(beatAt(config, frac))]);
  }
  const beatPath = toPath(beatPts);
  const areaPath = `${beatPath} L${x(1).toFixed(1)} ${(padT + plotH).toFixed(1)} L${padL.toFixed(1)} ${(padT + plotH).toFixed(1)} Z`;

  // --- carrier dashed reference (own min/max mapped into upper 70–90% band) ---
  const carrierRaw = [];
  for (let i = 0; i <= SAMPLES; i++) carrierRaw.push(carrierAt(config, i / SAMPLES));
  const cMin = Math.min(...carrierRaw);
  const cMax = Math.max(...carrierRaw);
  const carrierY = (hz) => {
    const f = cMax === cMin ? 0.5 : (hz - cMin) / (cMax - cMin);
    return y(AX.min + (0.70 + f * 0.20) * (AX.max - AX.min));
  };
  const carrierPts = carrierRaw.map((hz, i) => [x(i / SAMPLES), carrierY(hz)]);
  const carrierPath = toPath(carrierPts);

  // --- axis-dependent labels ---
  const hzTicks = [];
  for (let hz = AX.min; hz <= AX.max + 1e-6; hz += AX.step) hzTicks.push(hz);

  // --- drag: client Y -> beat Hz (reducer clamps to the beat range) ---
  function hzFromClientY(clientY) {
    const rect = svgRef.current.getBoundingClientRect();
    const svgY = ((clientY - rect.top) / rect.height) * H;
    const hz = AX.min + (1 - (svgY - padT) / plotH) * (AX.max - AX.min);
    return hz;
  }
  function endpointProps(which) {
    return {
      onPointerDown: (e) => {
        e.preventDefault();
        draggingRef.current = which;
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ }
      },
      onPointerMove: (e) => {
        if (draggingRef.current !== which) return;
        dispatch(setField(`drift.${which}`, hzFromClientY(e.clientY)));
      },
      onPointerUp: (e) => {
        draggingRef.current = null;
        try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ }
      },
      onPointerCancel: () => { draggingRef.current = null; },
    };
  }

  // --- imperative playhead (frac 0..1 along time, dot rides the live beat) ---
  const durationSec = duration * 60;
  function movePlayhead(frac, hz) {
    const px = x(frac);
    if (phRectRef.current) phRectRef.current.setAttribute('x', String(px - 4));
    if (phLineRef.current) {
      phLineRef.current.setAttribute('x1', String(px));
      phLineRef.current.setAttribute('x2', String(px));
    }
    if (phArrowRef.current) {
      phArrowRef.current.setAttribute('d', `M${px - 5} ${padT - 2} L${px + 5} ${padT - 2} L${px} ${padT + 6} Z`);
    }
    if (phDotRef.current) {
      phDotRef.current.setAttribute('cx', String(px));
      phDotRef.current.setAttribute('cy', String(clampY(hz)));
    }
  }

  // Per-frame: advance the playhead; the dot rides the LIVE beat curve.
  useEngineFrame((f) => {
    if (!f.playing) return;
    const frac = durationSec > 0 ? Math.max(0, Math.min(1, f.elapsed / durationSec)) : 0;
    movePlayhead(frac, f.beat);
  });

  // Park at t=0 whenever not playing (also re-parks after config/axis edits).
  useEffect(() => {
    if (playing) return;
    movePlayhead(0, startHz);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const stroke = (v) => ({ stroke: v });
  const fill = (v) => ({ fill: v });

  return (
    <>
      <div className="legend">
        <div className="li"><ColorDot className="sw" color="var(--band-delta)" style={{ opacity: 0.35 }} />Delta &lt;4</div>
        <div className="li"><ColorDot className="sw" color="var(--band-theta)" style={{ opacity: 0.35 }} />Theta 4–8</div>
        <div className="li"><ColorDot className="sw" color="var(--band-alpha)" style={{ opacity: 0.35 }} />Alpha 8–14</div>
        <div className="li"><ColorDot className="sw" color="var(--band-beta)" style={{ opacity: 0.35 }} />Beta 14–30</div>
        <div className="li"><span className="ln" />Beat curve</div>
        <div className="li"><span className="ln dash" />Carrier curve</div>
      </div>

      <div className="tl-wrap">
        <div className="tl-inner">
          <svg
            ref={svgRef}
            id="timeline"
            width="100%"
            height="330"
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="beatgrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" style={{ stopColor: 'var(--accent)' }} stopOpacity="0.28" />
                <stop offset="1" style={{ stopColor: 'var(--accent)' }} stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* band lanes clipped to the visible axis range */}
            {BANDS.map((b) => {
              const visLo = Math.max(b.lo, AX.min);
              const visHi = Math.min(b.hi, AX.max);
              if (visHi <= visLo) return null;
              const yt = y(visHi);
              const yb = y(visLo);
              return (
                <g key={b.name}>
                  <rect x={padL} y={yt} width={plotW} height={yb - yt} style={fill(b.c)} fillOpacity="0.10" />
                  <line x1={padL} y1={yt} x2={padL + plotW} y2={yt} style={stroke(b.c)} strokeOpacity="0.22" strokeWidth="1" />
                  {yb - yt > 14 && (
                    <text x={padL + 6} y={(yt + yb) / 2 + 3} style={fill(b.c)} fillOpacity="0.85" fontSize="9" fontFamily="var(--mono)" fontWeight="600">{b.name}</text>
                  )}
                </g>
              );
            })}

            {/* time gridlines + labels */}
            {Array.from({ length: DIVS + 1 }, (_, i) => {
              const frac = i / DIVS;
              return (
                <g key={`t${i}`}>
                  <line x1={x(frac)} y1={padT} x2={x(frac)} y2={padT + plotH} style={stroke('var(--border)')} strokeOpacity={i % 2 === 0 ? '0.55' : '0.28'} strokeWidth="1" />
                  <text x={x(frac)} y={H - 9} style={fill('var(--text-muted)')} fontSize="8.5" fontFamily="var(--mono)" textAnchor="middle">{mmss(frac * duration * 60)}</text>
                </g>
              );
            })}

            {/* left Hz axis labels */}
            {hzTicks.map((hz) => (
              <text key={`hz${hz}`} x={padL - 6} y={y(hz) + 3} style={fill('var(--text-muted)')} fontSize="8.5" fontFamily="var(--mono)" textAnchor="end">{Math.round(hz)}Hz</text>
            ))}

            {/* axis frame */}
            <rect x={padL} y={padT} width={plotW} height={plotH} fill="none" style={stroke('var(--border)')} strokeWidth="1" />

            {/* carrier dashed reference */}
            <path d={carrierPath} fill="none" style={stroke('var(--text-muted)')} strokeWidth="1.6" strokeDasharray="5 4" strokeOpacity="0.7" />
            <text x={x(1) - 4} y={carrierY(carrierRaw[carrierRaw.length - 1]) - 6} style={fill('var(--text-muted)')} fontSize="8.5" fontFamily="var(--mono)" textAnchor="end">carrier</text>

            {/* beat area + curve */}
            <path d={areaPath} fill="url(#beatgrad)" />
            <path d={beatPath} fill="none" style={stroke('var(--accent)')} strokeWidth="2.4" />

            {/* draggable endpoint handles (beat drift only) */}
            {drift.on && [['start', 0, startHz], ['end', 1, endHz]].map(([which, frac, hz]) => (
              <g key={which} style={{ cursor: 'ns-resize' }} {...endpointProps(which)}>
                <circle cx={x(frac)} cy={clampY(hz)} r="11" fill="transparent" />
                <circle cx={x(frac)} cy={clampY(hz)} r="6.5" style={{ fill: 'var(--surface)', stroke: 'var(--accent)' }} strokeWidth="2" />
                <circle cx={x(frac)} cy={clampY(hz)} r="2.5" style={fill('var(--accent)')} />
                <text x={x(frac)} y={clampY(hz) - 11} style={fill('var(--text)')} fontSize="8.5" fontFamily="var(--mono)" textAnchor="middle">{hz.toFixed(1)}</text>
              </g>
            ))}

            {/* playhead — parked at t=0; driven imperatively from onFrame */}
            <rect ref={phRectRef} x={padL - 4} y={padT} width="8" height={plotH} style={fill('var(--accent)')} fillOpacity="0.10" />
            <line ref={phLineRef} x1={padL} y1={padT - 2} x2={padL} y2={padT + plotH + 2} style={stroke('var(--accent)')} strokeWidth="1.6" />
            <path ref={phArrowRef} d={`M${padL - 5} ${padT - 2} L${padL + 5} ${padT - 2} L${padL} ${padT + 6} Z`} style={fill('var(--accent)')} />
            <circle ref={phDotRef} cx={padL} cy={clampY(startHz)} r="4.5" style={{ fill: 'var(--text)', stroke: 'var(--accent)' }} strokeWidth="2" />
          </svg>
        </div>
      </div>
    </>
  );
}
