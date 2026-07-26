// Config — default shape, validation & clamping.
//
// Pure data module: NO DOM, NO React, NO engine imports. Every function is
// side-effect free and returns a fresh object; nothing here ever throws on bad
// input — out-of-range / missing / wrong-typed fields are coerced to safe values.
//
// Shape:
//   { name?, duration,
//     tone:  { on, mode, carrier, beat, vol },
//     drift: { on, start, end, shape, plateaus },
//     carrierDrift: { on, start, end, shape, plateaus },
//     iso:   { on, offset, vol },
//     noise: { on, type, vol } }

export const DEFAULT_CONFIG = {
  name: '',
  duration: 20, // minutes
  tone: {
    on: true,
    mode: 'binaural', // 'binaural' (hard-panned L/R) | 'monaural' (summed, works on speakers)
    carrier: 100,
    beat: 10,
    vol: 0.4,
  },
  drift: {
    on: false,
    start: 10,
    end: 5,
    shape: 'ease',
    plateaus: 4,
  },
  carrierDrift: {
    on: false,
    start: 150,
    end: 90,
    shape: 'stepped',
    plateaus: 5,
  },
  iso: {
    on: false,
    offset: 0, // Hz relative to carrier (-100..100)
    vol: 0.4,
  },
  noise: {
    on: false,
    type: 'pink',
    vol: 0.2,
  },
};

// ---------- documented ranges (single source of truth for clamps) ----------
export const RANGES = {
  carrier: [50, 500], // Hz
  beat: [0.5, 40], // Hz
  duration: [1, 180], // minutes
  vol: [0, 1], // 0..1 gain
  offset: [-100, 100], // Hz relative to carrier
  plateaus: [2, 12], // stepped-drift plateau count (integer)
};
export const SHAPES = ['linear', 'ease', 'stepped'];
export const NOISE_TYPES = ['white', 'pink', 'brown'];
export const TONE_MODES = ['binaural', 'monaural'];

// ---------- primitive coercers (never throw) ----------
const num = (v, fallback) => {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
};
const clampNum = (v, [lo, hi], fallback) => {
  const n = num(v, fallback);
  return Math.max(lo, Math.min(hi, n));
};
const clampInt = (v, [lo, hi], fallback) => Math.round(clampNum(v, [lo, hi], fallback));
const oneOf = (v, allowed, fallback) => (allowed.includes(v) ? v : fallback);
const bool = (v) => !!v;

const isObj = (v) => v != null && typeof v === 'object' && !Array.isArray(v);

// ============================================================================
// clampConfig — fill any missing/partial fields from DEFAULT_CONFIG, then clamp
// every numeric to its documented range and coerce every enum to a valid value.
// Returns a clean, fully-populated config. Never throws — safe to run on
// hand-edited / imported JSON.
// ============================================================================
export function clampConfig(input) {
  const src = isObj(input) ? input : {};
  const D = DEFAULT_CONFIG;
  const t = isObj(src.tone) ? src.tone : {};
  return {
    name: typeof src.name === 'string' ? src.name : '',
    duration: clampInt(src.duration, RANGES.duration, D.duration),
    tone: {
      on: 'on' in t ? bool(t.on) : D.tone.on,
      mode: oneOf(t.mode, TONE_MODES, D.tone.mode),
      carrier: clampNum(t.carrier, RANGES.carrier, D.tone.carrier),
      beat: clampNum(t.beat, RANGES.beat, D.tone.beat),
      vol: clampNum(t.vol, RANGES.vol, D.tone.vol),
    },
    drift: clampDrift(src.drift, D.drift, RANGES.beat),
    carrierDrift: clampDrift(src.carrierDrift, D.carrierDrift, RANGES.carrier),
    iso: clampIso(src.iso, D.iso),
    noise: clampNoise(src.noise, D.noise),
  };
}

// Beat drift start/end use the beat range; carrier drift uses the carrier range.
function clampDrift(g, def, valRange) {
  const s = isObj(g) ? g : {};
  return {
    on: 'on' in s ? bool(s.on) : def.on,
    start: clampNum(s.start, valRange, def.start),
    end: clampNum(s.end, valRange, def.end),
    shape: oneOf(s.shape, SHAPES, def.shape),
    plateaus: clampInt(s.plateaus, RANGES.plateaus, def.plateaus),
  };
}

function clampIso(g, def) {
  const s = isObj(g) ? g : {};
  return {
    on: 'on' in s ? bool(s.on) : def.on,
    offset: clampNum(s.offset, RANGES.offset, def.offset),
    vol: clampNum(s.vol, RANGES.vol, def.vol),
  };
}

function clampNoise(g, def) {
  const s = isObj(g) ? g : {};
  return {
    on: 'on' in s ? bool(s.on) : def.on,
    type: oneOf(s.type, NOISE_TYPES, def.type),
    vol: clampNum(s.vol, RANGES.vol, def.vol),
  };
}

// validate — alias for clampConfig: returns a fully-populated, in-range config.
export function validate(input) {
  return clampConfig(input);
}
