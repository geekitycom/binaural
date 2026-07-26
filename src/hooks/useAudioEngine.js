// useAudioEngine — the single bridge between the config reducer and the
// imperative AudioEngine (PLAN §6). It:
//   - owns ONE AudioEngine instance for the provider's lifetime,
//   - exposes coarse transport state + control methods (play/pause/stop),
//   - FORWARDS live config edits to the engine via slice-scoped useEffects so
//     the form components never have to call the engine themselves,
//   - owns engine.onFrame / engine.onEnded and fans onFrame out to imperative
//     frame-listeners (Phase 6 visuals) WITHOUT triggering React re-renders,
//     while updating only *coarse* React state (~2/s) for the timer + flags.
//
// CRITICAL (PLAN §3/§6): user gestures and these effects are the ONLY places
// config -> engine forwarding happens. No AudioParam is ever written in a render
// body, and only play() calls engine.start().

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AudioEngine } from '../audio/AudioEngine.js';
import { useConfig } from '../state/ConfigContext.jsx';

const EngineContext = createContext(null);

export function useEngine() {
  const ctx = useContext(EngineContext);
  if (!ctx) throw new Error('useEngine must be used within <EngineProvider>');
  return ctx;
}

// Forward a single config slice to the engine on ACTUAL change only. Compares
// against the last-seen value (not just "first run") so it is immune to React
// StrictMode's mount/unmount/mount double-invoke, which would otherwise leak a
// spurious forward. Engine methods self-guard when not playing, so a stray call
// would be harmless anyway — this just keeps things strictly clean.
function useConfigForward(value, apply) {
  const last = useRef(value);
  const applyRef = useRef(apply);
  applyRef.current = apply;
  useEffect(() => {
    if (Object.is(last.current, value)) return;
    last.current = value;
    applyRef.current(value);
  }, [value]);
}

export function EngineProvider({ children }) {
  const config = useConfig();

  // ONE engine for the provider's lifetime (never recreated across renders /
  // StrictMode remounts). The AudioContext itself is created lazily in start().
  const engineRef = useRef(null);
  if (engineRef.current === null) engineRef.current = new AudioEngine();

  // Latest config in a ref so play()/mix-apply read current values without
  // re-subscribing every render.
  const configRef = useRef(config);
  configRef.current = config;

  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  // Coarse clock (~2/s) for the transport timer. Phase 6 paints the smooth
  // scrub/knob imperatively via subscribeFrame; this is only the readable text.
  const [clock, setClock] = useState({ elapsed: 0, remaining: 0 });
  // Completion flag -> surfaced as a toast by the shell.
  const [completed, setCompleted] = useState(false);

  // Frame-listeners for Phase 6 high-frequency visuals. A ref-held Set that
  // onFrame fans out to every frame — NONE of this touches React state, so
  // 60fps painting never hits the reconciler.
  const frameListenersRef = useRef(new Set());
  const subscribeFrame = useCallback((fn) => {
    frameListenersRef.current.add(fn);
    return () => frameListenersRef.current.delete(fn);
  }, []);

  // ---- own engine.onFrame / onEnded once ----
  useEffect(() => {
    const engine = engineRef.current;
    let lastCoarse = 0;
    engine.onFrame = (f) => {
      // 1) fan out to imperative listeners EVERY frame (no React state).
      frameListenersRef.current.forEach((fn) => {
        try { fn(f); } catch (e) { /* a listener error must not kill the loop */ }
      });
      // 2) coarse React state ~2/s: timer text + keep flags honest.
      const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      if (now - lastCoarse >= 450) {
        lastCoarse = now;
        setClock({ elapsed: f.elapsed, remaining: f.remaining });
        setPlaying((p) => (p !== f.playing ? f.playing : p));
        setPaused((p) => (p !== f.paused ? f.paused : p));
      }
    };
    engine.onEnded = ({ completed: ok }) => {
      setPlaying(false);
      setPaused(false);
      setClock({ elapsed: 0, remaining: 0 });
      if (ok) setCompleted(true);
    };
    return () => {
      engine.onFrame = null;
      engine.onEnded = null;
    };
  }, []);

  // ---- transport ----
  const play = useCallback(() => {
    const engine = engineRef.current;
    if (engine.playing) return;
    setCompleted(false);
    engine.start(configRef.current);
    setPlaying(true);
    setPaused(false);
    setClock({ elapsed: 0, remaining: configRef.current.duration * 60 });
  }, []);

  // engine.pause() TOGGLES suspend/resume; mirror the resulting paused flag.
  const pause = useCallback(() => {
    const engine = engineRef.current;
    if (!engine.playing) return;
    engine.pause();
    setPaused(engine.paused);
  }, []);

  const stop = useCallback(() => {
    engineRef.current.stop(); // fades, then teardown -> onEnded resets state
    setPlaying(false);
    setPaused(false);
    setClock({ elapsed: 0, remaining: 0 });
  }, []);

  const clearCompleted = useCallback(() => setCompleted(false), []);

  // ---- config -> engine forwarding (the ONLY forwarding path) ----
  // Each effect is scoped to one slice; the engine method self-guards when not
  // playing / while a param is drifting. None of these call engine.start().
  useConfigForward(config.tone.mode, (v) => engineRef.current.setToneMode(v));
  useConfigForward(config.tone.carrier, (v) => engineRef.current.setCarrier(v));
  useConfigForward(config.tone.beat, (v) => engineRef.current.setBeat(v));
  useConfigForward(config.tone.vol, (v) => engineRef.current.setLayerVol('tone', v));
  useConfigForward(config.iso.vol, (v) => engineRef.current.setLayerVol('iso', v));
  useConfigForward(config.iso.offset, (v) => engineRef.current.setIsoOffset(v));
  useConfigForward(config.noise.vol, (v) => engineRef.current.setLayerVol('noise', v));
  useConfigForward(config.noise.type, (v) => engineRef.current.setNoiseType(v));
  // Layer power = live add/remove of the layer's nodes, click-free.
  useConfigForward(config.tone.on, (v) => engineRef.current.setLayerPower('tone', v));
  useConfigForward(config.iso.on, (v) => engineRef.current.setLayerPower('iso', v));
  useConfigForward(config.noise.on, (v) => engineRef.current.setLayerPower('noise', v));

  const value = {
    play,
    pause,
    stop,
    playing,
    paused,
    clock,
    completed,
    clearCompleted,
    subscribeFrame,
  };

  // createElement (not JSX) so this stays a plain .js module per the file tree.
  return createElement(EngineContext.Provider, { value }, children);
}
