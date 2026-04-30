/**
 * Classifies each setting in each exercise as one of:
 *   - 'display'  → apply immediately, never interrupt
 *   - 'live'     → if currently playing: interrupt or apply mid-flight; else apply on next question
 *   - 'queued'   → apply on next question only
 *
 * Exercises consult classify() inside handleSettingsChange to decide whether
 * to call player.stop()+replay or just update state.
 */

const CLASSIFICATION = {
  '1': {
    transition: 'display',
    playC: 'display',
    instrument: 'live',
    availableNotes: 'queued',
    numQuestions: 'queued',
    octaveRange: 'queued',
  },
  '2': {
    transition: 'display',
    display: 'display',
    marking: 'display',
    instrument: 'live',
    source: 'queued',
    numQuestions: 'queued',
    availableNotes: 'queued',
    frets: 'queued',
    strings: 'queued',
  },
  '3': {
    bpm: 'live',
    instrument: 'live',
    root: 'queued',
    scale: 'queued',
    difficulty: 'queued',
    sequenceLength: 'queued',
    maxAttempts: 'queued',
  },
  '4a': {
    transition: 'display',
    playC: 'display',
    instrument: 'live',
    voicing: 'live',
    availableChords: 'queued',
    numQuestions: 'queued',
  },
  '4b': {
    transition: 'display',
    instrument: 'live',
    voicing: 'live',
    progressionId: 'queued',
    numQuestions: 'queued',
    octaveRange: 'queued',
    notesPerChord: 'queued',
  },
  '4c': {
    transition: 'display',
    instrument: 'live',
    voicing: 'live',
    inversions: 'live',
    availableChords: 'queued',
    progressionLength: 'queued',
    numQuestions: 'queued',
    startChordMode: 'queued',
  },
  rhythm: {
    bpm: 'live',
    soundChoice: 'live',
    bassNote: 'live',
    level: 'queued',
    numBars: 'queued',
    numQuestions: 'queued',
  },
};

/**
 * Look up a setting's class.
 * Unknown keys default to 'queued' (safe — no surprise interruption).
 */
export function classify(exerciseId, key) {
  const map = CLASSIFICATION[exerciseId];
  if (!map) return 'queued';
  return map[key] || 'queued';
}

/**
 * Diff two settings objects and return the keys whose values changed.
 */
export function changedKeys(oldSettings, newSettings) {
  const keys = new Set([...Object.keys(oldSettings || {}), ...Object.keys(newSettings || {})]);
  const changed = [];
  for (const key of keys) {
    if (!shallowEqual(oldSettings?.[key], newSettings?.[key])) {
      changed.push(key);
    }
  }
  return changed;
}

function shallowEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  return ak.every(k => a[k] === b[k]);
}
