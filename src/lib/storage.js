// storage.js — saved-sessions CRUD + JSON import/export, backed by localStorage.
//
// Everything routes through clampConfig on the way IN, so hand-edited/imported
// JSON always loads as a clean, in-range config.
//
// A saved session is a record: { id, name, config, savedAt }. The config is a
// full config (its own `name` mirrors the record name). Callers may address a
// session by its string `id` or by numeric list index.
//
// All localStorage access is wrapped in try/catch so the app stays usable in
// private-browsing / storage-disabled contexts (same defensive style as legacy).

import { clampConfig } from './config.js';

export const SESSIONS_KEY = 'binaural.sessions.v2';

// ---------- low-level guarded localStorage ----------
function readRaw(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}
function writeRaw(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    return false;
  }
}
function parseArray(raw) {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : null;
  } catch (e) {
    return null;
  }
}

let idSeq = 0;
function makeId() {
  idSeq += 1;
  return `s_${Date.now().toString(36)}_${idSeq.toString(36)}`;
}

// Build a session record from a name + arbitrary (possibly partial) config.
function makeRecord(name, config) {
  const cfg = clampConfig(config);
  const finalName = (typeof name === 'string' && name.trim())
    || (typeof cfg.name === 'string' && cfg.name.trim())
    || 'Untitled session';
  cfg.name = finalName;
  return { id: makeId(), name: finalName, config: cfg, savedAt: Date.now() };
}

function readStore() {
  const arr = parseArray(readRaw(SESSIONS_KEY));
  if (!arr) return [];
  // Normalize each record; tolerate malformed entries.
  return arr
    .filter((r) => r && typeof r === 'object')
    .map((r) => ({
      id: typeof r.id === 'string' ? r.id : makeId(),
      name: typeof r.name === 'string' ? r.name : 'Untitled session',
      config: clampConfig(r.config),
      savedAt: Number.isFinite(r.savedAt) ? r.savedAt : Date.now(),
    }));
}

function writeStore(records) {
  return writeRaw(SESSIONS_KEY, JSON.stringify(records));
}

// Resolve an id-or-index into a store index; -1 if not found.
function resolveIndex(store, ref) {
  if (typeof ref === 'number') {
    return ref >= 0 && ref < store.length ? ref : -1;
  }
  return store.findIndex((r) => r.id === ref);
}

// ---------- public API ----------

// Returns an array of { id, name, config, savedAt }.
export function listSessions() {
  return readStore();
}

// Save a new session; returns the created record (or null if storage failed).
export function saveSession(name, config) {
  const store = readStore();
  const record = makeRecord(name, config);
  store.push(record);
  return writeStore(store) ? record : null;
}

// Delete by id or index; returns true if something was removed.
export function deleteSession(ref) {
  const store = readStore();
  const idx = resolveIndex(store, ref);
  if (idx < 0) return false;
  store.splice(idx, 1);
  return writeStore(store);
}

// Load by id or index; returns a clamped config, or null.
export function loadSession(ref) {
  const store = readStore();
  const idx = resolveIndex(store, ref);
  if (idx < 0) return null;
  return clampConfig(store[idx].config);
}

// ---------- import / export ----------

// Pretty JSON string of a clamped v2 config.
export function exportConfig(config) {
  return JSON.stringify(clampConfig(config), null, 2);
}

// Parse a JSON string -> clamped config.
// Throws a friendly Error (for the UI to toast) when the JSON is invalid.
export function importConfig(jsonString) {
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    throw new Error('Invalid JSON — could not parse the session data.');
  }
  if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid session — expected a config object.');
  }
  return clampConfig(parsed);
}
