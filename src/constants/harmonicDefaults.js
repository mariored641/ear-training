/**
 * Constants and defaults for harmonic exercises (4A, 4B, 4C)
 */

// Chord definitions - root position voicings
export const CHORD_DEFINITIONS = {
  // Major chords
  'C': ['C4', 'E4', 'G4'],
  'C#': ['C#4', 'F4', 'G#4'],
  'D': ['D4', 'F#4', 'A4'],
  'D#': ['D#4', 'G4', 'A#4'],
  'E': ['E4', 'G#4', 'B4'],
  'F': ['F4', 'A4', 'C5'],
  'F#': ['F#4', 'A#4', 'C#5'],
  'G': ['G4', 'B4', 'D5'],
  'G#': ['G#4', 'C5', 'D#5'],
  'A': ['A4', 'C#5', 'E5'],
  'A#': ['A#4', 'D5', 'F5'],
  'B': ['B4', 'D#5', 'F#5'],

  // Minor chords
  'Cm': ['C4', 'Eb4', 'G4'],
  'C#m': ['C#4', 'E4', 'G#4'],
  'Dm': ['D4', 'F4', 'A4'],
  'D#m': ['D#4', 'F#4', 'A#4'],
  'Em': ['E4', 'G4', 'B4'],
  'Fm': ['F4', 'Ab4', 'C5'],
  'F#m': ['F#4', 'A4', 'C#5'],
  'Gm': ['G4', 'Bb4', 'D5'],
  'G#m': ['G#4', 'B4', 'D#5'],
  'Am': ['A4', 'C5', 'E5'],
  'A#m': ['A#4', 'C#5', 'F5'],
  'Bm': ['B4', 'D5', 'F#5']
};

// Get chord tones (note names without octave) for a chord
export const getChordTones = (chord) => {
  const CHORD_TONES = {
    // Major chords
    'C': ['C', 'E', 'G'],
    'C#': ['C#', 'F', 'G#'],
    'D': ['D', 'F#', 'A'],
    'D#': ['D#', 'G', 'A#'],
    'E': ['E', 'G#', 'B'],
    'F': ['F', 'A', 'C'],
    'F#': ['F#', 'A#', 'C#'],
    'G': ['G', 'B', 'D'],
    'G#': ['G#', 'C', 'D#'],
    'A': ['A', 'C#', 'E'],
    'A#': ['A#', 'D', 'F'],
    'B': ['B', 'D#', 'F#'],

    // Minor chords
    'Cm': ['C', 'Eb', 'G'],
    'C#m': ['C#', 'E', 'G#'],
    'Dm': ['D', 'F', 'A'],
    'D#m': ['D#', 'F#', 'A#'],
    'Em': ['E', 'G', 'B'],
    'Fm': ['F', 'Ab', 'C'],
    'F#m': ['F#', 'A', 'C#'],
    'Gm': ['G', 'Bb', 'D'],
    'G#m': ['G#', 'B', 'D#'],
    'Am': ['A', 'C', 'E'],
    'A#m': ['A#', 'C#', 'F'],
    'Bm': ['B', 'D', 'F#']
  };

  return CHORD_TONES[chord] || [];
};

// Get bass note for a chord
export const getChordRoot = (chord) => {
  // Remove 'm' suffix if minor chord
  const root = chord.replace('m', '');
  return root;
};

// Progression library for exercises 4B and 4C
export const PROGRESSION_LIBRARY = [
  {
    id: 'i-v-vi-iv',
    name: 'I-V-vi-IV (Pop progression)',
    chords: ['C', 'G', 'Am', 'F'],
    length: 4,
    difficulty: 1
  },
  {
    id: 'i-vi-iv-v',
    name: 'I-vi-IV-V (50s progression)',
    chords: ['C', 'Am', 'F', 'G'],
    length: 4,
    difficulty: 1
  },
  {
    id: 'i-iv-v',
    name: 'I-IV-V (Blues)',
    chords: ['C', 'F', 'G'],
    length: 3,
    difficulty: 1
  },
  {
    id: 'i-iv',
    name: 'I-IV (Simple)',
    chords: ['C', 'F'],
    length: 2,
    difficulty: 1
  },
  {
    id: 'i-v',
    name: 'I-V (Simple)',
    chords: ['C', 'G'],
    length: 2,
    difficulty: 1
  },
  {
    id: 'i-v-vi-iii-iv',
    name: 'I-V-vi-iii-IV (Canon)',
    chords: ['C', 'G', 'Am', 'Em', 'F'],
    length: 5,
    difficulty: 2
  },
  {
    id: 'ii-v-i',
    name: 'ii-V-I (Jazz turnaround)',
    chords: ['Dm', 'G', 'C'],
    length: 3,
    difficulty: 2
  },
  {
    id: 'i-vi-ii-v',
    name: 'I-vi-ii-V (Circle of 5ths)',
    chords: ['C', 'Am', 'Dm', 'G'],
    length: 4,
    difficulty: 2
  },
  {
    id: 'vi-iv-i-v',
    name: 'vi-IV-I-V (Sensitive)',
    chords: ['Am', 'F', 'C', 'G'],
    length: 4,
    difficulty: 2
  }
];

// Default settings for Exercise 4A - Single Chord Recognition
export const DEFAULT_SETTINGS_4A = {
  availableChords: {
    // All 24 chords enabled by default
    'C': true, 'C#': true, 'D': true, 'D#': true,
    'E': true, 'F': true, 'F#': true, 'G': true,
    'G#': true, 'A': true, 'A#': true, 'B': true,
    'Cm': true, 'C#m': true, 'Dm': true, 'D#m': true,
    'Em': true, 'Fm': true, 'F#m': true, 'Gm': true,
    'G#m': true, 'Am': true, 'A#m': true, 'Bm': true
  },
  source: 'random', // 'random' | 'library'
  instrument: 'piano', // 'piano' | 'guitar'
  voicing: 'strummed', // 'strummed' | 'arpeggiated' | 'mixed'
  playC: 'everyTime', // 'everyTime' | 'onceAtStart'
  transition: 'auto', // 'auto' | 'manual'
  numQuestions: 10 // 5-50
};

// Default settings for Exercise 4B - Chord Tone Melodies
export const DEFAULT_SETTINGS_4B = {
  source: 'library', // 'library' | 'random'
  progressionId: 'i-v-vi-iv', // selected progression from library
  notesPerChord: 2, // 1, 2, or 3
  octaveRange: 2, // 1-4
  availableChords: {
    // All 24 chords enabled by default
    'C': true, 'C#': true, 'D': true, 'D#': true,
    'E': true, 'F': true, 'F#': true, 'G': true,
    'G#': true, 'A': true, 'A#': true, 'B': true,
    'Cm': true, 'C#m': true, 'Dm': true, 'D#m': true,
    'Em': true, 'Fm': true, 'F#m': true, 'Gm': true,
    'G#m': true, 'Am': true, 'A#m': true, 'Bm': true
  },
  showChordDuringPlay: true,
  instrument: 'piano', // 'piano' | 'guitar'
  transition: 'auto', // 'auto' | 'manual'
  numQuestions: 10
};

// Default settings for Exercise 4C - Random Chord Progressions
export const DEFAULT_SETTINGS_4C = {
  progressionLength: 4, // 2-6 chords in sequence
  startChordMode: 'free', // 'free' | 'fixed'
  startChord: 'C', // which chord to start with (if fixed)
  availableChords: {
    // All 24 chords enabled by default
    'C': true, 'C#': true, 'D': true, 'D#': true,
    'E': true, 'F': true, 'F#': true, 'G': true,
    'G#': true, 'A': true, 'A#': true, 'B': true,
    'Cm': true, 'C#m': true, 'Dm': true, 'D#m': true,
    'Em': true, 'Fm': true, 'F#m': true, 'Gm': true,
    'G#m': true, 'Am': true, 'A#m': true, 'Bm': true
  },
  inversions: 'no', // 'no' | 'with'
  instrument: 'piano', // 'piano' | 'guitar'
  voicing: 'strummed', // 'strummed' | 'arpeggiated' | 'mixed'
  transition: 'manual', // 'auto' | 'manual'
  numQuestions: 10
};

// Chord button layout for UI
export const MAJOR_CHORDS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const MINOR_CHORDS = ['Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm'];

// Note names for bass note selection
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// ============================================================
// EXTENDED CHORD VOCABULARY (Phase 2)
// Programmatically built — covers sus, dim, aug, 7ths, adds, tensions × 12 roots.
// ============================================================

// Note utilities — semitone-based, sharp-spelling default.
const PC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_PC = { 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb' };

const noteToPc = (n) => {
  const m = n.match(/^([A-G])([#b]?)/);
  if (!m) return 0;
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]];
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return (base + acc + 12) % 12;
};
const pcToNote = (pc, preferFlat = false) => {
  const sharp = PC[pc % 12];
  return preferFlat && FLAT_PC[sharp] ? FLAT_PC[sharp] : sharp;
};

// Chord quality definitions — semitone offsets from root.
// Each entry: { suffix, intervals, kind }
const QUALITIES = [
  { suffix: '', intervals: [0, 4, 7], kind: 'major' },
  { suffix: 'm', intervals: [0, 3, 7], kind: 'minor' },
  { suffix: 'dim', intervals: [0, 3, 6], kind: 'diminished' },
  { suffix: 'aug', intervals: [0, 4, 8], kind: 'augmented' },
  { suffix: 'sus2', intervals: [0, 2, 7], kind: 'sus' },
  { suffix: 'sus4', intervals: [0, 5, 7], kind: 'sus' },
  { suffix: 'Maj7', intervals: [0, 4, 7, 11], kind: 'maj7' },
  { suffix: 'm7', intervals: [0, 3, 7, 10], kind: 'min7' },
  { suffix: '7', intervals: [0, 4, 7, 10], kind: 'dom7' },
  { suffix: 'm7b5', intervals: [0, 3, 6, 10], kind: 'half-dim' },
  { suffix: 'dim7', intervals: [0, 3, 6, 9], kind: 'dim7' },
  { suffix: 'add9', intervals: [0, 4, 7, 14], kind: 'add' },
  { suffix: 'Maj9', intervals: [0, 4, 7, 11, 14], kind: 'maj9' },
  { suffix: 'm9', intervals: [0, 3, 7, 10, 14], kind: 'min9' },
  { suffix: '9', intervals: [0, 4, 7, 10, 14], kind: 'dom9' },
  { suffix: '11', intervals: [0, 4, 7, 10, 14, 17], kind: 'dom11' },
  { suffix: '13', intervals: [0, 4, 7, 10, 14, 21], kind: 'dom13' },
  { suffix: '7b9', intervals: [0, 4, 7, 10, 13], kind: 'altered' },
  { suffix: '7#9', intervals: [0, 4, 7, 10, 15], kind: 'altered' },
  { suffix: '7#11', intervals: [0, 4, 7, 10, 18], kind: 'altered' },
  { suffix: '7b13', intervals: [0, 4, 7, 10, 20], kind: 'altered' },
  { suffix: '7alt', intervals: [0, 4, 10, 13, 15, 20], kind: 'altered' }
];

const ROOT_OCT = 4;

// Convert semitone interval from rootPc to a note name with octave.
function noteAt(rootPc, interval, baseOctave = ROOT_OCT) {
  const totalSemis = rootPc + interval;
  const octave = baseOctave + Math.floor(totalSemis / 12);
  const pc = totalSemis % 12;
  return pcToNote(pc) + octave;
}

// Build full extended chord table: chordName -> { notes, tones, kind, rootPc, intervals }
export const EXTENDED_CHORDS = (() => {
  const table = {};
  PC.forEach((root, rootPc) => {
    QUALITIES.forEach(({ suffix, intervals, kind }) => {
      const name = root + suffix;
      const notes = intervals.map(iv => noteAt(rootPc, iv, ROOT_OCT));
      const tones = intervals.map(iv => pcToNote((rootPc + iv) % 12));
      table[name] = {
        notes,
        tones,
        kind,
        rootPc,
        rootName: root,
        intervals,
        suffix
      };
    });
  });
  return table;
})();

// Get notes for any chord name — falls back through legacy CHORD_DEFINITIONS, then EXTENDED_CHORDS.
export function getChordNotes(chordName) {
  if (CHORD_DEFINITIONS[chordName]) return CHORD_DEFINITIONS[chordName];
  if (EXTENDED_CHORDS[chordName]) return EXTENDED_CHORDS[chordName].notes;
  return null;
}

// Inversion metadata helper — returns notes rearranged so `inversion` is in the bass.
// inversion: 0 (root) | 1 (1st) | 2 (2nd) | 3 (3rd, for 7ths)
export function getInversion(chordName, inversion = 0) {
  const def = EXTENDED_CHORDS[chordName] || (CHORD_DEFINITIONS[chordName] ? { notes: CHORD_DEFINITIONS[chordName] } : null);
  if (!def) return null;
  const notes = def.notes;
  if (inversion <= 0 || inversion >= notes.length) return notes.slice();
  // Move first `inversion` notes up an octave.
  const lifted = notes.slice(0, inversion).map(n => bumpOctave(n, 1));
  return [...notes.slice(inversion), ...lifted];
}

function bumpOctave(noteWithOct, delta) {
  const m = noteWithOct.match(/^([A-G][#b]?)(\d+)$/);
  if (!m) return noteWithOct;
  return m[1] + (parseInt(m[2], 10) + delta);
}

// Chord groups — useful for H1/H3 level configuration.
export const CHORD_GROUPS = {
  triadsMajMin: PC.flatMap(r => [r, r + 'm']),
  triadsAll: PC.flatMap(r => [r, r + 'm', r + 'dim', r + 'aug']),
  sus: PC.flatMap(r => [r + 'sus2', r + 'sus4']),
  sevenths: PC.flatMap(r => [r + 'Maj7', r + 'm7', r + '7', r + 'm7b5', r + 'dim7']),
  extended: PC.flatMap(r => [r + 'add9', r + 'Maj9', r + 'm9', r + '9']),
  altered: PC.flatMap(r => [r + '7b9', r + '7#9', r + '7#11', r + '7b13', r + '7alt'])
};

// Tensions (used in H4) — interval above root that defines each tension.
export const TENSIONS = {
  '9': 14,
  'b9': 13,
  '#9': 15,
  '11': 17,
  '#11': 18,
  'b13': 20,
  '13': 21
};

export function getChordWithTensions(rootChord, tensions = []) {
  const base = EXTENDED_CHORDS[rootChord];
  if (!base) return null;
  const extra = tensions
    .map(t => TENSIONS[t])
    .filter(iv => Number.isFinite(iv))
    .map(iv => noteAt(base.rootPc, iv, ROOT_OCT));
  return [...base.notes, ...extra];
}
