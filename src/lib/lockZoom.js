// lockZoom — keep the app feeling "locked in" like a native screen on iOS.
//
// The viewport meta sets maximum-scale=1/user-scalable=no, but iOS Safari
// deliberately ignores those for accessibility, so pinch-to-zoom still fires.
// The only reliable way to suppress it is to preventDefault the Safari-specific
// `gesture*` events (multi-touch pinch) directly. Listeners are non-passive so
// preventDefault actually takes effect.
//
// Note: this intentionally disables browser pinch-zoom of the page. Text
// legibility is handled by responsive sizing in base.css instead. Call once at
// startup; it's a no-op on browsers that don't emit gesture events.
export function lockZoom() {
  if (typeof document === 'undefined') return;
  const prevent = (e) => e.preventDefault();
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(type, prevent, { passive: false });
  }
}
