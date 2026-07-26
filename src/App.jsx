import { useEffect, useRef, useState } from 'react';
import { ConfigProvider, useConfig } from './state/ConfigContext.jsx';
import { EngineProvider, useEngine } from './hooks/useAudioEngine.js';
import TransportBar from './components/TransportBar.jsx';
import LayersPanel from './components/LayersPanel.jsx';
import SavedSessions from './components/SavedSessions.jsx';
import TimelineToolbar from './components/TimelineToolbar.jsx';
import Timeline from './components/Timeline.jsx';
import DriftCard from './components/DriftCard.jsx';
import Toast from './components/Toast.jsx';

/**
 * PHASE 4: the real, config-bound component tree (replaces Phase 1's static
 * mock markup). Everything reads/writes the config reducer via ConfigContext;
 * no audio engine is wired yet (Phase 5) and visuals show idle/config values
 * (Phase 6 adds live onFrame painting). Reuse is enforced through shared
 * primitives + generic Layer / DriftCard components.
 */
function Studio() {
  const { drift, carrierDrift } = useConfig();
  const {
    completed, clearCompleted, play, pause, playing,
  } = useEngine();
  // Transient status text for session load/import/export etc.
  const [toast, setToast] = useState('');

  // Surface a natural session end (not a manual Stop) as a toast.
  useEffect(() => {
    if (!completed) return;
    setToast('Session complete');
    clearCompleted();
  }, [completed, clearCompleted]);

  // Global Space = play/pause (matches the legacy app). Ignored when focus is in
  // a text field or on a button/contenteditable, so Space still activates the
  // focused control instead of hijacking the transport. preventDefault fires
  // ONLY when we actually toggle (never for the ignored cases). `playing` is read
  // through a ref so the listener is registered once, not re-bound each toggle.
  const playingRef = useRef(playing);
  playingRef.current = playing;
  useEffect(() => {
    function onKey(e) {
      if (e.code !== 'Space' && e.key !== ' ') return;
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      const tag = el && el.tagName;
      if (
        el
        && (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA'
          || tag === 'BUTTON' || el.isContentEditable)
      ) {
        return; // let the focused control handle Space itself
      }
      e.preventDefault();
      if (playingRef.current) pause();
      else play();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [play, pause]);

  return (
    <div className="app">
      <TransportBar />

      <div className="grid">
        <div className="leftcol">
          <LayersPanel />
          <SavedSessions onToast={setToast} />
        </div>

        <div className="maincol">
          <div className="panel">
            <TimelineToolbar />
            <Timeline />
          </div>

          {drift.on && <DriftCard kind="beat" />}
          {carrierDrift.on && <DriftCard kind="carrier" />}
        </div>
      </div>

      <Toast message={toast} onDismiss={() => setToast('')} />
    </div>
  );
}

export default function App() {
  // EngineProvider reads config, so it must live inside ConfigProvider.
  return (
    <ConfigProvider>
      <EngineProvider>
        <Studio />
      </EngineProvider>
    </ConfigProvider>
  );
}
