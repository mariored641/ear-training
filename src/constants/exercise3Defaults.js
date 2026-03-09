// ─── Chromatic note names ─────────────────────────────────────────────────────
export const CHROMATIC_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const NOTE_MIDI_BASE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

// ─── MIDI helpers ─────────────────────────────────────────────────────────────
export function noteToMidi(noteName, octave) {
  return (octave + 1) * 12 + (NOTE_MIDI_BASE[noteName] ?? 0);
}

export function midiToNoteObj(midi) {
  const octave = Math.floor(midi / 12) - 1;
  const noteName = CHROMATIC_NOTES[((midi % 12) + 12) % 12];
  return { noteName, octave, fullNote: `${noteName}${octave}`, midiNote: midi };
}

// ─── Scales ───────────────────────────────────────────────────────────────────
export const SCALES = {
  major:            { name: "מז'ור (Major / Ionian)",       intervals: [0, 2, 4, 5, 7, 9, 11] },
  natural_minor:    { name: 'מינור טבעי (Natural Minor)',    intervals: [0, 2, 3, 5, 7, 8, 10] },
  dorian:           { name: 'דורי (Dorian)',                  intervals: [0, 2, 3, 5, 7, 9, 10] },
  phrygian:         { name: 'פריגי (Phrygian)',               intervals: [0, 1, 3, 5, 7, 8, 10] },
  lydian:           { name: 'לידי (Lydian)',                  intervals: [0, 2, 4, 6, 7, 9, 11] },
  mixolydian:       { name: 'מיקסולידי (Mixolydian)',         intervals: [0, 2, 4, 5, 7, 9, 10] },
  harmonic_minor:   { name: 'מינור הרמוני (Harmonic Minor)',  intervals: [0, 2, 3, 5, 7, 8, 11] },
  pentatonic_major: { name: "פנטטוני מז'ור (Pentatonic Maj)", intervals: [0, 2, 4, 7, 9] },
  pentatonic_minor: { name: 'פנטטוני מינור (Pentatonic Min)', intervals: [0, 3, 5, 7, 10] },
};

// ─── Difficulty levels ────────────────────────────────────────────────────────
export const DIFFICULTY_LEVELS = [
  { value: 1, label: 'שלב 1: תנועה צעדית בלבד (סקונדות)',       maxInterval: 2,  chromatic: false },
  { value: 2, label: 'שלב 2: + טרצות',                           maxInterval: 4,  chromatic: false },
  { value: 3, label: 'שלב 3: + קווינטות וקווארטות',              maxInterval: 7,  chromatic: false },
  { value: 4, label: 'שלב 4: מרווחים גדולים + כרומטיקה',        maxInterval: 12, chromatic: true  },
];

// ─── Interval names (for analytics report) ────────────────────────────────────
export const INTERVAL_NAMES = {
  0:  'Unison (אוניסון)',
  1:  'm2 — Minor 2nd (סמיטון)',
  2:  'M2 — Major 2nd (טון)',
  3:  'm3 — Minor 3rd (טרצה קטנה)',
  4:  'M3 — Major 3rd (טרצה גדולה)',
  5:  'P4 — Perfect 4th (קווארטה)',
  6:  'TT — Tritone (טריטון)',
  7:  'P5 — Perfect 5th (קווינטה)',
  8:  'm6 — Minor 6th (סקסטה קטנה)',
  9:  'M6 — Major 6th (סקסטה גדולה)',
  10: 'm7 — Minor 7th (ספטימה קטנה)',
  11: 'M7 — Major 7th (ספטימה גדולה)',
  12: 'Oct — Octave (אוקטבה)',
};

// ─── Default settings ─────────────────────────────────────────────────────────
export const DEFAULT_EXERCISE3_SETTINGS = {
  root: 'C',
  scale: 'major',
  difficulty: 1,
  sequenceLength: 3,
  instrument: 'piano',
  tempo: 80,
};

// ─── Melody generator ─────────────────────────────────────────────────────────
/**
 * Generate a random N-note melodic sequence respecting scale & difficulty.
 * @param {string}      root       - Root note name (e.g. 'C')
 * @param {string}      scaleName  - Key in SCALES
 * @param {number}      difficulty - 1–4
 * @param {number}      length     - Number of notes
 * @param {number|null} startMidi  - If provided, first note IS this MIDI value
 *                                   (used to continue from previous sequence's last note)
 * Returns array of { noteName, octave, fullNote, midiNote }
 */
export function generateMelodySequence(root, scaleName, difficulty, length, startMidi = null) {
  const scaleConfig = SCALES[scaleName] || SCALES.major;
  const diffConfig   = DIFFICULTY_LEVELS[difficulty - 1] || DIFFICULTY_LEVELS[0];

  // Build pool of MIDI notes in a comfortable guitar range (E2=40 … B4=71)
  let pool = [];

  if (diffConfig.chromatic) {
    for (let m = 40; m <= 71; m++) pool.push(m);
  } else {
    for (let oct = 3; oct <= 5; oct++) {
      scaleConfig.intervals.forEach(interval => {
        const m = noteToMidi(root, oct) + interval;
        if (m >= 40 && m <= 71) pool.push(m);
      });
    }
    pool = [...new Set(pool)].sort((a, b) => a - b);
  }

  if (pool.length < 2) {
    const rootMidi = noteToMidi(root, 4);
    return Array.from({ length }, () => midiToNoteObj(rootMidi));
  }

  const melody = [];

  // Determine starting MIDI: use provided startMidi (snapped to pool) or middle of range
  let prevMidi;
  if (startMidi !== null) {
    // Snap to nearest pool note
    const nearest = pool.reduce((best, m) =>
      Math.abs(m - startMidi) < Math.abs(best - startMidi) ? m : best, pool[0]);
    prevMidi = nearest;
  } else {
    const midIdx = Math.floor(pool.length / 2);
    const offset  = Math.floor(Math.random() * 5) - 2;
    prevMidi = pool[Math.max(0, Math.min(pool.length - 1, midIdx + offset))];
  }
  melody.push(midiToNoteObj(prevMidi));

  for (let i = 1; i < length; i++) {
    const candidates = pool.filter(m =>
      m !== prevMidi &&
      Math.abs(m - prevMidi) >= 1 &&
      Math.abs(m - prevMidi) <= diffConfig.maxInterval
    );

    let nextMidi;
    if (candidates.length === 0) {
      const sorted = [...pool].sort((a, b) => Math.abs(a - prevMidi) - Math.abs(b - prevMidi));
      nextMidi = sorted.find(m => m !== prevMidi) ?? pool[0];
    } else {
      nextMidi = candidates[Math.floor(Math.random() * candidates.length)];
    }

    melody.push(midiToNoteObj(nextMidi));
    prevMidi = nextMidi;
  }

  return melody;
}
