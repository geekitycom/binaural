import { band } from '../../lib/bands.js';
import ColorDot from './ColorDot.jsx';

// Map the canonical band (from lib/bands.js) to theme TOKENS + a descriptive
// label. Colors are token references only — the pill re-tints on theme switch.
// 'Sub-δ' shares the delta hue.
const BAND_META = {
  'Sub-δ': { color: 'var(--band-delta)', surface: 'var(--band-delta-surface)', label: 'Delta · deep sleep' },
  Delta: { color: 'var(--band-delta)', surface: 'var(--band-delta-surface)', label: 'Delta · deep sleep' },
  Theta: { color: 'var(--band-theta)', surface: 'var(--band-theta-surface)', label: 'Theta · meditation' },
  Alpha: { color: 'var(--band-alpha)', surface: 'var(--band-alpha-surface)', label: 'Alpha · relaxation' },
  Beta: { color: 'var(--band-beta)', surface: 'var(--band-beta-surface)', label: 'Beta · focus' },
  Gamma: { color: 'var(--band-gamma)', surface: 'var(--band-gamma-surface)', label: 'Gamma · peak' },
};

export function bandMeta(hz) {
  return BAND_META[band(hz).name] ?? BAND_META.Alpha;
}

/**
 * BandPill — the transport's brainwave-band label. Derives the band from the
 * (idle) beat frequency and paints itself entirely from band tokens, so it
 * follows the active theme.
 */
export default function BandPill({
  beat, rootRef, dotRef, labelRef,
}) {
  const meta = bandMeta(beat);
  return (
    <div
      ref={rootRef}
      className="bandpill"
      style={{ borderColor: meta.color, color: meta.color, background: meta.surface }}
    >
      <ColorDot ref={dotRef} className="dot" color={meta.color} />
      <span ref={labelRef}>{meta.label}</span>
    </div>
  );
}
