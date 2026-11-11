import { readLastState, writeLastState } from './stateStore.js';

function legacy(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
const Storage = {
  saveSettings(id, settings) { writeLastState(`legacy-${id}`, 1, settings); },
  loadSettings(id, defaults) {
    return readLastState(`legacy-${id}`, 1, { ...defaults, ...legacy(`exercise${id}Settings`, {}) });
  },
  saveProgress(id, progress) { writeLastState(`progress-${id}`, 1, progress); },
  loadProgress(id) { return readLastState(`progress-${id}`, 1, legacy(`exercise${id}Progress`, null)); },
  // Reset exercise progress only; never erase device state, named presets or recordings.
  clearAll() {
    try {
      for (const key of Object.keys(localStorage)) {
        if (/^exercise\w+Progress$/.test(key) || key.startsWith('et.state.v1.progress-')) localStorage.removeItem(key);
      }
    } catch {}
  },
};
export default Storage;
