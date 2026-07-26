// Brainwave band classification — ported from legacy.html.
// A band is matched by the first entry whose `max` (exclusive upper bound in Hz)
// the frequency falls under.
//
// NOTE: bands carry no color here on purpose. Every band color the UI paints is
// a theme TOKEN (--band-delta … --band-gamma), mapped from a band's `name` in
// components/primitives/BandPill.jsx, so band hues re-tint with the theme and no
// literal color ever lives outside theme/themes.css.

export const BANDS = [
  { name: 'Sub-δ', max: 0.5 },
  { name: 'Delta', max: 4 },
  { name: 'Theta', max: 8 },
  { name: 'Alpha', max: 14 },
  { name: 'Beta', max: 30 },
  { name: 'Gamma', max: 1e9 },
];

export function band(hz) {
  for (const b of BANDS) {
    if (hz < b.max) return b;
  }
  return BANDS[BANDS.length - 1];
}
