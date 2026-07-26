import { useState, useRef } from 'react';
import { useConfig, useConfigDispatch } from '../state/ConfigContext.jsx';
import { replaceConfig } from '../state/configReducer.js';
import {
  listSessions, saveSession, loadSession, deleteSession, exportConfig, importConfig,
} from '../lib/storage.js';
import Panel from './primitives/Panel.jsx';
import IconButton from './primitives/IconButton.jsx';

// Compact "20m · 10→5Hz · ease" descriptor from a config (else "20m · 10Hz · steady").
function summarize(cfg) {
  const dur = `${cfg.duration}m`;
  const freq = cfg.drift.on
    ? `${cfg.drift.start}→${cfg.drift.end}Hz · ${cfg.drift.shape}`
    : `${cfg.tone.beat}Hz · steady`;
  return `${dur} · ${freq}`;
}

/**
 * SavedSessions — full sessions persistence + JSON import/export.
 *
 * SAVE   name input + Save → saveSession(name, currentConfig); empty name falls
 *        back to "Session N" (legacy behavior). The new row becomes active.
 * LIST   listSessions() rendered in the mock-2 `.sess` rows (name + `.sm` meta).
 * LOAD   loadSession(id) → dispatch(replaceConfig(cfg)). Loading only UPDATES the
 *        config; it does NOT restart audio. While PLAYING, the Phase-5 forwarding
 *        effects live-retune the running session to the loaded values — a smooth
 *        in-place change, never a hard restart. New config fully owns the next Play.
 * DELETE deleteSession(id) → refresh list.
 * EXPORT exportConfig(currentConfig) → download `<name>.binaural.json` (Blob URL,
 *        like legacy). No textarea exists in the mock-2 style, so it's download-only.
 * IMPORT hidden file <input> → importConfig() (clamp, throws friendly
 *        Error) → dispatch(replaceConfig(cfg)). File-picker only (no paste box).
 *
 * State stays fresh via a local `sessions` list re-read after every mutation.
 */
export default function SavedSessions({ onToast }) {
  const config = useConfig();
  const dispatch = useConfigDispatch();
  const [sessions, setSessions] = useState(() => listSessions());
  const [name, setName] = useState('');
  const [activeId, setActiveId] = useState(null);
  const fileRef = useRef(null);

  const refresh = () => setSessions(listSessions());

  function save() {
    const finalName = name.trim() || `Session ${sessions.length + 1}`;
    const record = saveSession(finalName, config);
    if (record) {
      setName('');
      refresh();
      setActiveId(record.id);
      onToast?.(`Saved "${record.name}"`);
    } else {
      onToast?.('Could not save session');
    }
  }

  function load(id) {
    const cfg = loadSession(id);
    if (cfg) {
      dispatch(replaceConfig(cfg));
      setActiveId(id);
      const rec = sessions.find((s) => s.id === id);
      onToast?.(`Loaded "${rec?.name ?? cfg.name}"`);
    }
  }

  function remove(id) {
    if (deleteSession(id)) {
      if (id === activeId) setActiveId(null);
      refresh();
      onToast?.('Session deleted');
    }
  }

  function doExport() {
    const json = exportConfig(config);
    const base = (name.trim() || config.name || 'Untitled session').replace(/\s+/g, '_');
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${base}.binaural.json`;
    a.click();
    URL.revokeObjectURL(url);
    onToast?.('Exported JSON');
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const cfg = importConfig(await file.text());
      dispatch(replaceConfig(cfg));
      setActiveId(null);
      onToast?.('Imported JSON');
    } catch (err) {
      onToast?.(err.message || 'Import failed');
    }
  }

  return (
    <Panel title="Saved sessions">
      <div className="bd">
        <div className="sess-save">
          <input
            type="text"
            value={name}
            placeholder="Name this session…"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } }}
            aria-label="Session name"
          />
          <button type="button" className="ghost" onClick={save}>Save</button>
        </div>

        <div className="sess-list">
          {sessions.length === 0 && (
            <div className="saved-empty">No saved sessions yet.</div>
          )}
          {sessions.map((s) => (
            <div className={`sess${s.id === activeId ? ' active' : ''}`} key={s.id}>
              <div className="sinfo">
                <div className="sn">{s.name}</div>
                <div className="sm">{summarize(s.config)}</div>
              </div>
              <div className="sact">
                <IconButton className="iconbtn" title="Load" onClick={() => load(s.id)}>
                  <svg viewBox="0 0 24 24"><path d="M5 20h14v-2H5v2zM12 3L6 11h4v6h4v-6h4l-6-8z" /></svg>
                </IconButton>
                <IconButton className="iconbtn" title="Delete" onClick={() => remove(s.id)}>
                  <svg viewBox="0 0 24 24"><path d="M6 7h12l-1 13H7L6 7zm3-3h6l1 2H8l1-2z" /></svg>
                </IconButton>
              </div>
            </div>
          ))}
        </div>

        <div className="impexp">
          <button type="button" className="ghost" onClick={() => fileRef.current?.click()}>↧ Import JSON</button>
          <button type="button" className="ghost" onClick={doExport}>↥ Export JSON</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={onFile}
          />
        </div>
      </div>
    </Panel>
  );
}
