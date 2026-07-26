// Drift interpolation + curve sampling — ported from legacy.html.
// interp() and sampleCurve() are byte-for-byte equivalent to legacy.
// beatAt()/carrierAt() are adapted to read the v2 config shape (cfg.tone.beat /
// cfg.tone.carrier) instead of legacy v1's top-level cfg.beat / cfg.carrier.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- interpolation for drift ----------
export function interp(frac, from, to, shape, plateaus) {
  frac = clamp(frac, 0, 1);
  if (shape === 'linear') return from + (to - from) * frac;
  if (shape === 'ease') {
    const s = frac * frac * (3 - 2 * frac);
    return from + (to - from) * s;
  }
  // stepped plateau
  const n = Math.max(2, plateaus | 0);
  const w = 1 / n;
  const k = Math.min(n - 1, Math.floor(frac / w));
  const local = (frac - k * w) / w; // 0..1 inside this plateau
  const level = from + (to - from) * (k / (n - 1));
  const HOLD = 0.65;
  if (k < n - 1 && local > HOLD) {
    const t = (local - HOLD) / (1 - HOLD);
    const s = t * t * (3 - 2 * t);
    const next = from + (to - from) * ((k + 1) / (n - 1));
    return level + (next - level) * s;
  }
  return level;
}

// sample a frac->value function into a Float32Array for setValueCurveAtTime;
// linear interpolation between points -> no audible stepping / zipper noise.
// Ported verbatim (~2 pts/s, clamped 32..20000).
export function sampleCurve(fn, durationSec) {
  const steps = clamp(Math.round(durationSec * 2), 32, 20000);
  const arr = new Float32Array(steps + 1);
  for (let i = 0; i <= steps; i++) arr[i] = fn(i / steps);
  return arr;
}

// ---------- planned-curve sampling (v2 config) ----------
export function beatAt(cfg, frac) {
  return cfg.drift.on
    ? interp(frac, cfg.drift.start, cfg.drift.end, cfg.drift.shape, cfg.drift.plateaus)
    : cfg.tone.beat;
}

export function carrierAt(cfg, frac) {
  return cfg.carrierDrift.on
    ? interp(frac, cfg.carrierDrift.start, cfg.carrierDrift.end, cfg.carrierDrift.shape, cfg.carrierDrift.plateaus)
    : cfg.tone.carrier;
}
