// useEngineFrame — subscribe to the engine's high-frequency onFrame stream for
// IMPERATIVE visuals (Phase 6). The callback fires on every engine frame
// (rAF, plus a 500ms interval that survives a backgrounded tab) with the frame
// payload: { playing, paused, elapsed, remaining, beat, carrier, band }.
//
// This deliberately does NOT trigger React re-renders. Write straight to refs /
// DOM / SVG inside the callback (scrub fill/knob, readouts, timeline playhead,
// live drift thumbs). For coarse state, read `playing`/`paused`/`clock` from
// useEngine() instead.
//
// The latest callback is held in a ref, so passing a fresh inline function each
// render does not re-subscribe.

import { useEffect, useRef } from 'react';
import { useEngine } from './useAudioEngine.js';

export function useEngineFrame(callback) {
  const { subscribeFrame } = useEngine();
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => subscribeFrame((frame) => cbRef.current?.(frame)), [subscribeFrame]);
}

export default useEngineFrame;
