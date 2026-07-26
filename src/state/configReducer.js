// Config reducer — the single source of truth for the app's editable config.
//
// Pure & immutable: every action returns a NEW config object; nothing is mutated
// in place. After every edit the whole config is re-run through clampConfig() so
// state can never go out of range or lose a required field. Dependency-free
// (only imports the pure config module).
//
// Action set is small & orthogonal (NOT one action per field):
//   SET     { path, value }  -> set a single leaf via dotted path ('tone.carrier')
//   PATCH   { path, value }  -> shallow-merge an object at a path ('drift', {on:true})
//   REPLACE { config }       -> load a whole config (clamped)
//   RESET                    -> back to defaults

import { DEFAULT_CONFIG, clampConfig } from '../lib/config.js';

export const initialConfig = clampConfig(DEFAULT_CONFIG);

// ---------- immutable dotted-path helpers ----------
// setIn({a:{b:1}}, 'a.b', 2) -> {a:{b:2}} with fresh objects along the path.
export function setIn(obj, path, value) {
  const keys = Array.isArray(path) ? path : String(path).split('.');
  if (keys.length === 0) return value;
  const [head, ...rest] = keys;
  const child = obj != null && typeof obj === 'object' ? obj[head] : undefined;
  return {
    ...obj,
    [head]: rest.length === 0 ? value : setIn(child ?? {}, rest, value),
  };
}

// mergeIn({a:{b:1}}, 'a', {c:2}) -> {a:{b:1,c:2}}
export function mergeIn(obj, path, partial) {
  const keys = Array.isArray(path) ? path : String(path).split('.');
  if (keys.length === 0) return { ...obj, ...partial };
  const [head, ...rest] = keys;
  const child = obj != null && typeof obj === 'object' ? obj[head] : undefined;
  return {
    ...obj,
    [head]: rest.length === 0
      ? { ...(child ?? {}), ...partial }
      : mergeIn(child ?? {}, rest, partial),
  };
}

export function configReducer(state, action) {
  switch (action?.type) {
    case 'SET':
      return clampConfig(setIn(state, action.path, action.value));
    case 'PATCH':
      return clampConfig(mergeIn(state, action.path, action.value));
    case 'REPLACE':
      // clampConfig fills missing fields, so partial configs load clean.
      return clampConfig(action.config);
    case 'RESET':
      return clampConfig(DEFAULT_CONFIG);
    default:
      return state;
  }
}

// ---------- action creators ----------
export const setField = (path, value) => ({ type: 'SET', path, value });
export const patch = (path, value) => ({ type: 'PATCH', path, value });
export const replaceConfig = (config) => ({ type: 'REPLACE', config });
export const reset = () => ({ type: 'RESET' });
