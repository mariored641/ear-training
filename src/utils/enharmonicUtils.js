// Enharmonic note naming utilities
// Ensures scales use one letter per degree (e.g., Bb not A#, Eb not D#)
// and chords use theoretically correct spellings (Gm = G,Bb,D not G,A#,D)

// Letters in C-based order (C=0 ... B=6)
const LETTER_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

// Natural semitone from C for each letter
const NATURAL_SEMITONE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// Chromatic scales from C (for non-diatonic scale enharmonics)
const CHROMATIC_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const CHROMATIC_FLAT  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// CHROMATIC_FROM_A: matches the app's CHROMATIC_SCALE in positionData.js
const CHROMATIC_FROM_A      = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
const CHROMATIC_FLAT_FROM_A = ['A', 'Bb', 'B', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab'];

// Roots that prefer flat enharmonics (circle of fifths flat side)
const FLAT_ROOTS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb']);

// Normalize accidental roots to their preferred enharmonic spelling.
// A# → Bb, D# → Eb, G# → Ab, C# → Db, F# → Gb.
const ROOT_NORMALIZATION = { 'A#': 'Bb', 'D#': 'Eb', 'G#': 'Ab', 'C#': 'Db', 'F#': 'Gb' };

export function normalizeRoot(root) {
  return ROOT_NORMALIZATION[root] ?? root;
}

// Display labels for the root selector UI
export const ROOT_DISPLAY_NAMES = {
  A: 'A', 'A#': 'Bb', B: 'B', C: 'C', 'C#': 'Db',
  D: 'D', 'D#': 'Eb', E: 'E', F: 'F', 'F#': 'Gb',
  G: 'G', 'G#': 'Ab',
};

// ── Core helpers ──────────────────────────────────────────────────────────────

function noteToSemitoneFromC(noteName) {
  const letter = noteName[0];
  const acc = noteName.slice(1);
  const base = NATURAL_SEMITONE[letter];
  if (acc === '#')  return (base + 1) % 12;
  if (acc === 'b')  return (base - 1 + 12) % 12;
  if (acc === '##') return (base + 2) % 12;
  if (acc === 'bb') return (base - 2 + 12) % 12;
  return base;
}

function letterIndex(noteName) {
  return LETTER_NAMES.indexOf(noteName[0]);
}

// Return note name for a given semitone (from C) constrained to a specific letter.
// e.g. spellingWithLetter(10, 'B') → 'Bb'
function spellingWithLetter(semitoneFromC, letter) {
  const natural = NATURAL_SEMITONE[letter];
  const diff = (semitoneFromC - natural + 12) % 12;
  if (diff === 0)  return letter;
  if (diff === 1)  return letter + '#';
  if (diff === 11) return letter + 'b';
  if (diff === 2)  return letter + '##';
  if (diff === 10) return letter + 'bb';
  return letter; // shouldn't occur for standard scales
}

// Sequential-letter algorithm for 7-note diatonic scales:
// degree i uses the i-th letter above the root, accidental determined by semitone.
function computeDiatonicNoteNames(normalizedRoot, intervals) {
  const rootSemitone  = noteToSemitoneFromC(normalizedRoot);
  const rootLetterIdx = letterIndex(normalizedRoot);
  return intervals.map((interval, degree) => {
    const noteSemitone       = (rootSemitone + interval) % 12;
    const expectedLetterIdx  = (rootLetterIdx + degree) % 7;
    return spellingWithLetter(noteSemitone, LETTER_NAMES[expectedLetterIdx]);
  });
}

// Flat/sharp preference for non-diatonic scales (pentatonic, blues, bebop, etc.)
function computeWithPreference(normalizedRoot, intervals) {
  const chromatic    = FLAT_ROOTS.has(normalizedRoot) ? CHROMATIC_FLAT : CHROMATIC_SHARP;
  const rootSemitone = noteToSemitoneFromC(normalizedRoot);
  return intervals.map(i => chromatic[(rootSemitone + i) % 12]);
}

// ── Public API ────────────────────────────────────────────────────────────────

// Compute enharmonically correct note names for a root + interval array.
// isChord=true: skip root normalization (C# chord stays C#, E, G#; not Db, E, Ab).
// 7-note scales: sequential letter algorithm with safe double-accidental check.
// All other lengths: flat/sharp preference based on key.
export function computeEnharmonicNotes(root, intervals, isChord = false) {
  if (isChord) {
    return computeWithPreference(root, intervals);
  }
  const norm = normalizeRoot(root);
  if (intervals.length === 7) {
    const candidate = computeDiatonicNoteNames(norm, intervals);
    // If normalization produces double accidentals (e.g. F# minor → Gb → Bbb), revert
    if (candidate.some(n => n.includes('bb') || n.includes('##'))) {
      return computeDiatonicNoteNames(root, intervals);
    }
    return candidate;
  }
  return computeWithPreference(norm, intervals);
}

// ── Chord tones ───────────────────────────────────────────────────────────────

// Letter offset for each named interval (matches INTERVAL_SEMITONES in partialChordShapes.js)
const INTERVAL_LETTER_OFFSET = {
  '1': 0,
  'b2': 1, '2':   1,
  'b3': 2, '3':   2,
  '4':  3,
  'b5': 4, '5':   4, '#5': 4,
  'b6': 5, '6':   5,
  'b7': 6, '7':   6,
  'b9': 1, '9':   1, '#9': 1,
  '11': 3, '#11': 3,
  'b13': 5, '13': 5,
};

// Semitone values mirrored from partialChordShapes.js (avoids circular import)
const INTERVAL_SEMITONES = {
  '1':  0,
  'b2': 1,  '2':  2,
  'b3': 3,  '3':  4,
  '4':  5,  'b5': 6,
  '5':  7,  '#5': 8,
  '6':  9,
  'b7': 10, '7':  11,
  'b9': 13, '9':  14, '#9': 15,
  '11': 17, '#11': 18,
  'b13': 20, '13': 21,
};

// Return the correctly spelled note name for a chord tone above a root.
// e.g. getChordToneNoteName('G', 'b3') → 'Bb'  (not 'A#')
//      getChordToneNoteName('C', '#5') → 'G#'   (not 'Ab')
export function getChordToneNoteName(root, tone) {
  const semi      = INTERVAL_SEMITONES[tone];
  if (semi === undefined) return '';
  const rootSemitone   = noteToSemitoneFromC(root);
  const noteSemitone   = (rootSemitone + semi) % 12;
  const rootLetterIdx  = letterIndex(root);
  const offset         = INTERVAL_LETTER_OFFSET[tone] ?? 0;
  const expLetterIdx   = (rootLetterIdx + offset) % 7;
  return spellingWithLetter(noteSemitone, LETTER_NAMES[expLetterIdx]);
}

// ── Display maps ──────────────────────────────────────────────────────────────

// Build a map from CHROMATIC_FROM_A name to enharmonic display name,
// for a specific root + interval array.
// e.g. for F major: { 'A#': 'Bb', 'F':'F', 'G':'G', ... }
export function buildEnharmonicDisplayMap(root, intervals, isChord = false) {
  const rootSemitone = noteToSemitoneFromC(root);
  const enharmonic   = computeEnharmonicNotes(root, intervals, isChord);
  const map = {};
  intervals.forEach((interval, i) => {
    const noteFromC = (rootSemitone + interval) % 12;
    // Convert from-C to from-A index: A is at semitone 9 from C
    const fromA     = (noteFromC - 9 + 12) % 12;
    map[CHROMATIC_FROM_A[fromA]] = enharmonic[i];
  });
  return map;
}

// Build a default 12-note display map for a root with no specific scale selected.
// Uses the key's flat/sharp preference.
export function buildDefaultDisplayMap(root) {
  const norm    = normalizeRoot(root);
  const useFlat = FLAT_ROOTS.has(norm);
  const display = useFlat ? CHROMATIC_FLAT_FROM_A : CHROMATIC_FROM_A;
  const map = {};
  CHROMATIC_FROM_A.forEach((sharp, i) => { map[sharp] = display[i]; });
  return map;
}
