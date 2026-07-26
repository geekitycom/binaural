import { useEffect, useRef } from 'react';
import { useConfig, useConfigDispatch } from '../state/ConfigContext.jsx';
import { setField } from '../state/configReducer.js';
import { useEngine } from '../hooks/useAudioEngine.js';
import { useEngineFrame } from '../hooks/useEngineFrame.js';
import { beatAt, carrierAt } from '../audio/curves.js';
import { bandMeta } from './primitives/BandPill.jsx';

// ---- geometry (matches mock-2's timeline viewBox) ----
const W = 760;
const H = 330;
const padL = 44;
const padR = 14;
const padT = 14;
const padB = 26;
const plotW = W - padL - padR;
const plotH = H - padT - padB;
const SAMPLES = 64; // dense linear sampling of the REAL interp curves
const DIVS = 10; // time gridline divisions
const SEAM = 0.6; // tiny quad overlap to hide anti-alias seams in the ribbon

// Framed ABSOLUTE-Hz axis that always contains (lo,hi) with padding and a
// minimum span, so a small beat gap stays visible when there's no carrier drift.
// nice-step logic (2/5/10) works for both zoomed gaps and 100-Hz carrier ranges.
function computeAxis(a, b) {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
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
 * Timeline — the SVG hero, drawn on an ABSOLUTE-frequency (Hz) Y axis.
 *
 * Two lines are sampled from the REAL model (curves.js): L = carrier (left ear)
 * and R = carrier + beat (right ear). The region BETWEEN them is filled as a
 * per-time-segment ribbon, each slice colored by the brainwave band of the BEAT
 * (gap width) at that moment (bands.js via bandMeta), so the ribbon re-colors
 * along time as the beat crosses band thresholds. The axis auto-frames to the
 * min carrier .. max (carrier+beat) so the graph equals what the audio plays.
 *
 * Both drifts are draggable on the graph:
 *   - beat drift handles ride the R line   -> dispatch drift.start / drift.end
 *     (as Y - carrier, the gap value; reducer clamps to the beat range).
 *   - carrier drift handles ride the L line -> dispatch carrierDrift.start / end
 *     (absolute Hz; reducer clamps to the carrier range).
 * Everything reflows from config each render — R moves when the carrier moves.
 *
 * The playhead (vertical line + arrow + a dot on EACH line) is driven
 * imperatively from onFrame; it parks at t = 0 when not playing. All colors are
 * token references (inline `style` var()), so the whole drawing re-tints on a
 * theme flip — no hardcoded hex, no manual redraw.
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
  const phDotLRef = useRef(null);
  const phDotRRef = useRef(null);

  const { drift, carrierDrift, duration } = config;

  // --- dense sampling of the REAL model: L = carrier, R = carrier + beat ---
  const L = []; // left ear (carrier) Hz per sample
  const R = []; // right ear (carrier + beat) Hz per sample
  const beat = []; // gap (beat) Hz per sample — drives the ribbon band color
  for (let i = 0; i <= SAMPLES; i++) {
    const frac = i / SAMPLES;
    const c = carrierAt(config, frac);
    const b = beatAt(config, frac);
    L.push(c);
    beat.push(b);
    R.push(c + b);
  }
  const AX = computeAxis(Math.min(...L), Math.max(...R));

  const x = (frac) => padL + frac * plotW;
  const y = (hz) => padT + (1 - (hz - AX.min) / (AX.max - AX.min)) * plotH;
  const clampY = (hz) => Math.max(padT, Math.min(padT + plotH, y(hz)));
  const toPath = (pts) => pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`).join(' ');

  const Lpts = L.map((hz, i) => [x(i / SAMPLES), clampY(hz)]);
  const Rpts = R.map((hz, i) => [x(i / SAMPLES), clampY(hz)]);
  const Lpath = toPath(Lpts);
  const Rpath = toPath(Rpts);

  // --- band-colored ribbon: a filled quad per segment between L and R,
  //     colored by the band of the beat at the segment midpoint ---
  const ribbon = [];
  for (let i = 0; i < SAMPLES; i++) {
    const bMid = beatAt(config, (i + 0.5) / SAMPLES);
    const color = bandMeta(bMid).color;
    const x0 = Lpts[i][0];
    const x1 = Rpts[i + 1][0] + SEAM;
    const d = `M${x0.toFixed(1)} ${Lpts[i][1].toFixed(1)} `
      + `L${(x1).toFixed(1)} ${Lpts[i + 1][1].toFixed(1)} `
      + `L${(x1).toFixed(1)} ${Rpts[i + 1][1].toFixed(1)} `
      + `L${x0.toFixed(1)} ${Rpts[i][1].toFixed(1)} Z`;
    ribbon.push({ d, color, key: i });
  }

  // --- axis-dependent labels ---
  const hzTicks = [];
  for (let hz = AX.min; hz <= AX.max + 1e-6; hz += AX.step) hzTicks.push(hz);

  // --- drag: client Y -> absolute Hz (reducers clamp to their own ranges) ---
  function hzFromClientY(clientY) {
    const rect = svgRef.current.getBoundingClientRect();
    const svgY = ((clientY - rect.top) / rect.height) * H;
    const hz = AX.min + (1 - (svgY - padT) / plotH) * (AX.max - AX.min);
    return hz;
  }
  // kind: 'beat' (R line -> drift.*) or 'carrier' (L line -> carrierDrift.*)
  function handleProps(kind, which, frac) {
    const id = `${kind}:${which}`;
    return {
      onPointerDown: (e) => {
        e.preventDefault();
        draggingRef.current = id;
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ }
      },
      onPointerMove: (e) => {
        if (draggingRef.current !== id) return;
        const Y = hzFromClientY(e.clientY);
        if (kind === 'beat') {
          // set the gap: beat = absolute Y minus the carrier at this endpoint.
          dispatch(setField(`drift.${which}`, Y - carrierAt(config, frac)));
        } else {
          dispatch(setField(`carrierDrift.${which}`, Y));
        }
      },
      onPointerUp: (e) => {
        draggingRef.current = null;
        try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ }
      },
      onPointerCancel: () => { draggingRef.current = null; },
    };
  }

  // --- imperative playhead (frac 0..1 along time; two dots ride L and R) ---
  const durationSec = duration * 60;
  function movePlayhead(frac, carrierHz, beatHz) {
    const px = x(frac);
    if (phRectRef.current) phRectRef.current.setAttribute('x', String(px - 4));
    if (phLineRef.current) {
      phLineRef.current.setAttribute('x1', String(px));
      phLineRef.current.setAttribute('x2', String(px));
    }
    if (phArrowRef.current) {
      phArrowRef.current.setAttribute('d', `M${px - 5} ${padT - 2} L${px + 5} ${padT - 2} L${px} ${padT + 6} Z`);
    }
    if (phDotLRef.current) {
      phDotLRef.current.setAttribute('cx', String(px));
      phDotLRef.current.setAttribute('cy', String(clampY(carrierHz)));
    }
    if (phDotRRef.current) {
      phDotRRef.current.setAttribute('cx', String(px));
      phDotRRef.current.setAttribute('cy', String(clampY(carrierHz + beatHz)));
    }
  }

  // Per-frame: advance the playhead; dots ride the LIVE carrier / carrier+beat.
  useEngineFrame((f) => {
    if (!f.playing) return;
    const frac = durationSec > 0 ? Math.max(0, Math.min(1, f.elapsed / durationSec)) : 0;
    movePlayhead(frac, f.carrier, f.beat);
  });

  // Park at t=0 whenever not playing (also re-parks after config/axis edits).
  useEffect(() => {
    if (playing) return;
    movePlayhead(0, carrierAt(config, 0), beatAt(config, 0));
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const stroke = (v) => ({ stroke: v });
  const fill = (v) => ({ fill: v });

  return (
    <>
      <div className="legend">
        <div className="li"><span className="ln" />Right ear (carrier + beat)</div>
        <div className="li"><span className="ln dash" />Left ear (carrier)</div>
        <div className="li"><ColorSwatch color="var(--band-delta)" />Delta &lt;4</div>
        <div className="li"><ColorSwatch color="var(--band-theta)" />Theta 4–8</div>
        <div className="li"><ColorSwatch color="var(--band-alpha)" />Alpha 8–14</div>
        <div className="li"><ColorSwatch color="var(--band-beta)" />Beta 14–30</div>
        <div className="li" style={{ opacity: 0.75 }}>gap = beat (current band)</div>
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

            {/* left Hz axis labels (ABSOLUTE frequency) */}
            {hzTicks.map((hz) => (
              <text key={`hz${hz}`} x={padL - 6} y={y(hz) + 3} style={fill('var(--text-muted)')} fontSize="8.5" fontFamily="var(--mono)" textAnchor="end">{Math.round(hz)}Hz</text>
            ))}

            {/* band-colored gap ribbon: one quad per time segment, colored by
                the band of the beat there. Replaces the old band lanes/area. */}
            {ribbon.map((q) => (
              <path key={q.key} d={q.d} style={fill(q.color)} fillOpacity="0.20" />
            ))}

            {/* axis frame */}
            <rect x={padL} y={padT} width={plotW} height={plotH} fill="none" style={stroke('var(--border)')} strokeWidth="1" />

            {/* L = carrier (left ear), dashed muted */}
            <path d={Lpath} fill="none" style={stroke('var(--text-muted)')} strokeWidth="1.8" strokeDasharray="5 4" strokeOpacity="0.9" />
            {/* R = carrier + beat (right ear), solid accent */}
            <path d={Rpath} fill="none" style={stroke('var(--accent)')} strokeWidth="2.4" />

            {/* carrier-drift handles ride the L line (absolute carrier Hz) */}
            {carrierDrift.on && [['start', 0], ['end', 1]].map(([which, frac]) => {
              const cy = clampY(carrierAt(config, frac));
              return (
                <g key={`c-${which}`} style={{ cursor: 'ns-resize' }} {...handleProps('carrier', which, frac)}>
                  <circle cx={x(frac)} cy={cy} r="11" fill="transparent" />
                  <circle cx={x(frac)} cy={cy} r="6.5" style={{ fill: 'var(--surface)', stroke: 'var(--text-muted)' }} strokeWidth="2" />
                  <circle cx={x(frac)} cy={cy} r="2.5" style={fill('var(--text-muted)')} />
                  <text x={x(frac)} y={cy - 11} style={fill('var(--text)')} fontSize="8.5" fontFamily="var(--mono)" textAnchor="middle">{carrierAt(config, frac).toFixed(0)}Hz</text>
                </g>
              );
            })}

            {/* beat-drift handles ride the R line; label shows the gap (beat) */}
            {drift.on && [['start', 0], ['end', 1]].map(([which, frac]) => {
              const cy = clampY(carrierAt(config, frac) + beatAt(config, frac));
              return (
                <g key={`b-${which}`} style={{ cursor: 'ns-resize' }} {...handleProps('beat', which, frac)}>
                  <circle cx={x(frac)} cy={cy} r="11" fill="transparent" />
                  <circle cx={x(frac)} cy={cy} r="6.5" style={{ fill: 'var(--surface)', stroke: 'var(--accent)' }} strokeWidth="2" />
                  <circle cx={x(frac)} cy={cy} r="2.5" style={fill('var(--accent)')} />
                  <text x={x(frac)} y={cy - 11} style={fill('var(--text)')} fontSize="8.5" fontFamily="var(--mono)" textAnchor="middle">{beatAt(config, frac).toFixed(1)}</text>
                </g>
              );
            })}

            {/* playhead — parked at t=0; driven imperatively from onFrame.
                pointer-events:none so it never blocks the endpoint handles it
                overlaps while parked at t=0 (same x as the start handles). */}
            <g style={{ pointerEvents: 'none' }}>
              <rect ref={phRectRef} x={padL - 4} y={padT} width="8" height={plotH} style={fill('var(--accent)')} fillOpacity="0.10" />
              <line ref={phLineRef} x1={padL} y1={padT - 2} x2={padL} y2={padT + plotH + 2} style={stroke('var(--accent)')} strokeWidth="1.6" />
              <path ref={phArrowRef} d={`M${padL - 5} ${padT - 2} L${padL + 5} ${padT - 2} L${padL} ${padT + 6} Z`} style={fill('var(--accent)')} />
              <circle ref={phDotLRef} cx={padL} cy={clampY(carrierAt(config, 0))} r="4" style={{ fill: 'var(--text)', stroke: 'var(--text-muted)' }} strokeWidth="2" />
              <circle ref={phDotRRef} cx={padL} cy={clampY(carrierAt(config, 0) + beatAt(config, 0))} r="4.5" style={{ fill: 'var(--text)', stroke: 'var(--accent)' }} strokeWidth="2" />
            </g>
          </svg>
        </div>
      </div>
    </>
  );
}

// Small legend swatch (band gap color chip).
function ColorSwatch({ color }) {
  return <span className="sw" style={{ background: color, opacity: 0.5 }} />;
}
