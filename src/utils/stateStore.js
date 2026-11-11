import { validateToolState } from './stateSchemas.js';
// Device state is deliberately independent of service-worker caches and named presets.
export const stateKey = id => `et.state.v1.${id}`;
const legacyKey = id => `ear-training:last-state:${id}`;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const transient = /^(is_?playing|playing|isRecording|recording|playbackPhase)$/i;

export function cleanState(value) {
  if (Array.isArray(value)) return value.map(cleanState);
  if (!object(value)) return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !transient.test(key) && !['__proto__', 'constructor', 'prototype'].includes(key)).map(([key, item]) => [key, cleanState(item)]));
}

// Validate recursively against caller defaults; malformed fields fall back individually.
export function withDefaults(saved, defaults) {
  if (defaults === null) return saved === undefined ? null : saved;
  if (Array.isArray(defaults)) return Array.isArray(saved) ? saved : defaults;
  if (object(defaults)) {
    if (!object(saved)) return defaults;
    const result = { ...saved };
    for (const [key, value] of Object.entries(defaults)) result[key] = withDefaults(saved[key], value);
    return result;
  }
  return typeof saved === typeof defaults && (typeof saved !== 'number' || Number.isFinite(saved)) ? saved : defaults;
}

export function readLastState(id, version, defaults) {
  defaults = validateToolState(id, defaults);
  try {
    const raw = localStorage.getItem(stateKey(id)) ?? localStorage.getItem(legacyKey(id));
    const parsed = JSON.parse(raw);
    if (!object(parsed) || parsed.v !== version || !object(parsed.data)) return defaults;
    return validateToolState(id, withDefaults(cleanState(parsed.data), defaults));
  } catch { return defaults; }
}

export function writeLastState(id, version, data) {
  try { localStorage.setItem(stateKey(id), JSON.stringify({ v: version, data: cleanState(data) })); }
  catch { /* Storage disabled/full: keep the live tool usable. */ }
}

export function hasLastState(id) {
  try { return Boolean(localStorage.getItem(stateKey(id)) ?? localStorage.getItem(legacyKey(id))); }
  catch { return false; }
}
