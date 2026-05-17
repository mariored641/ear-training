import { CHROMATIC_SCALE, STRING_TUNING, POSITION_CONFIG } from '../constants/positionData.js';

// ---------------------------------------------------------------------------
// CAGED partial-chord shapes (legacy — kept for backwards-compat with any
// callers that still want a hardcoded triad voicing). Rendering no longer
// reads from this table; the new path scans the shape WINDOW for any chord
// tone of any quality. See getChordTonesInShape() below.
// ---------------------------------------------------------------------------

export const PARTIAL_CHORD_SHAPES = {
  major: {
    C: [
      null,
      { tone: '1',  fretOffset: 3, finger: 3 },
      { tone: '3',  fretOffset: 2, finger: 2 },
      { tone: '5',  fretOffset: 0, finger: 0 },
      { tone: '1',  fretOffset: 1, finger: 1 },
      { tone: '3',  fretOffset: 0, finger: 0 },
    ],
    A: [
      null,
      { tone: '1',  fretOffset: 0, finger: 0 },
      { tone: '5',  fretOffset: 2, finger: 2 },
      { tone: '1',  fretOffset: 2, finger: 3 },
      { tone: '3',  fretOffset: 2, finger: 4 },
      { tone: '5',  fretOffset: 0, finger: 0 },
    ],
    G: [
      { tone: '1',  fretOffset: 3, finger: 3 },
      { tone: '3',  fretOffset: 2, finger: 2 },
      { tone: '5',  fretOffset: 0, finger: 0 },
      { tone: '1',  fretOffset: 0, finger: 0 },
      { tone: '3',  fretOffset: 0, finger: 0 },
      { tone: '1',  fretOffset: 3, finger: 4 },
    ],
    E: [
      { tone: '1',  fretOffset: 0, finger: 0 },
      { tone: '5',  fretOffset: 2, finger: 2 },
      { tone: '1',  fretOffset: 2, finger: 3 },
      { tone: '3',  fretOffset: 1, finger: 1 },
      { tone: '5',  fretOffset: 0, finger: 0 },
      { tone: '1',  fretOffset: 0, finger: 0 },
    ],
    D: [
      null,
      null,
      { tone: '1',  fretOffset: 0, finger: 0 },
      { tone: '5',  fretOffset: 2, finger: 1 },
      { tone: '1',  fretOffset: 3, finger: 3 },
      { tone: '3',  fretOffset: 2, finger: 2 },
    ],
  },
  minor: {
    C: [
      null,
      { tone: '1',  fretOffset: 3, finger: 3 },
      { tone: 'b3', fretOffset: 1, finger: 1 },
      { tone: '5',  fretOffset: 0, finger: 0 },
      { tone: '1',  fretOffset: 1, finger: 1 },
      null,
    ],
    A: [
      null,
      { tone: '1',  fretOffset: 0, finger: 0 },
      { tone: '5',  fretOffset: 2, finger: 2 },
      { tone: '1',  fretOffset: 2, finger: 3 },
      { tone: 'b3', fretOffset: 1, finger: 1 },
      { tone: '5',  fretOffset: 0, finger: 0 },
    ],
    G: [
      { tone: '1',  fretOffset: 3, finger: 3 },
      { tone: 'b3', fretOffset: 1, finger: 1 },
      { tone: '5',  fretOffset: 0, finger: 0 },
      { tone: '1',  fretOffset: 0, finger: 0 },
      null,
      { tone: '1',  fretOffset: 3, finger: 4 },
    ],
    E: [
      { tone: '1',  fretOffset: 0, finger: 0 },
      { tone: '5',  fretOffset: 2, finger: 2 },
      { tone: '1',  fretOffset: 2, finger: 3 },
      { tone: 'b3', fretOffset: 0, finger: 0 },
      { tone: '5',  fretOffset: 0, finger: 0 },
      { tone: '1',  fretOffset: 0, finger: 0 },
    ],
    D: [
      null,
      null,
      { tone: '1',  fretOffset: 0, finger: 0 },
      { tone: '5',  fretOffset: 2, finger: 2 },
      { tone: '1',  fretOffset: 3, finger: 4 },
      { tone: 'b3', fretOffset: 1, finger: 1 },
    ],
  },
};

export const CAGED_ORDER = ['C', 'A', 'G', 'E', 'D'];

// ---------------------------------------------------------------------------
// String sets — which strings (low→high) belong to the active "voicing window"
// the student is focusing on. Width = number of contiguous strings.
// shapeIndices use the 6-entry convention: 0=string 6 (low E) … 5=string 1.
// ---------------------------------------------------------------------------
export const STRING_SETS = [
  // 3 strings
  { label: 'Strings 6-4', shapeIndices: [0, 1, 2], width: 3 },
  { label: 'Strings 5-3', shapeIndices: [1, 2, 3], width: 3 },
  { label: 'Strings 4-2', shapeIndices: [2, 3, 4], width: 3 },
  { label: 'Strings 3-1', shapeIndices: [3, 4, 5], width: 3 },
  // 4 strings
  { label: 'Strings 6-3', shapeIndices: [0, 1, 2, 3], width: 4 },
  { label: 'Strings 5-2', shapeIndices: [1, 2, 3, 4], width: 4 },
  { label: 'Strings 4-1', shapeIndices: [2, 3, 4, 5], width: 4 },
  // 5 strings
  { label: 'Strings 6-2', shapeIndices: [0, 1, 2, 3, 4], width: 5 },
  { label: 'Strings 5-1', shapeIndices: [1, 2, 3, 4, 5], width: 5 },
  // 6 strings
  { label: 'All Strings',  shapeIndices: [0, 1, 2, 3, 4, 5], width: 6 },
];

// Indices into STRING_SETS, grouped by width — handy for navigation.
export const STRING_SETS_BY_WIDTH = STRING_SETS.reduce((acc, set, idx) => {
  (acc[set.width] = acc[set.width] || []).push(idx);
  return acc;
}, {});

export const DEFAULT_SET_IDX_BY_WIDTH = {
  3: 3,  // Strings 3-1
  4: 6,  // Strings 4-1
  5: 8,  // Strings 5-1
  6: 9,  // All Strings
};

// ---------------------------------------------------------------------------
// Interval semitones — extended for all qualities we now support.
// ---------------------------------------------------------------------------
export const INTERVAL_SEMITONES = {
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

// ---------------------------------------------------------------------------
// Chord qualities — each is just an interval list. Rendering computes the
// fret positions on-the-fly inside the CAGED window.
// ---------------------------------------------------------------------------
export const CHORD_QUALITIES = {
  // Triads
  major:  { label: '',         intervals: ['1', '3', '5'],            family: 'triad'    },
  minor:  { label: 'm',        intervals: ['1', 'b3', '5'],           family: 'triad'    },
  dim:    { label: '°',        intervals: ['1', 'b3', 'b5'],          family: 'triad'    },
  aug:    { label: '+',        intervals: ['1', '3', '#5'],           family: 'triad'    },
  // Sus
  sus2:   { label: 'sus2',     intervals: ['1', '2', '5'],            family: 'sus'      },
  sus4:   { label: 'sus4',     intervals: ['1', '4', '5'],            family: 'sus'      },
  // 7ths
  maj7:   { label: 'maj7',     intervals: ['1', '3', '5', '7'],       family: 'seventh'  },
  '7':    { label: '7',        intervals: ['1', '3', '5', 'b7'],      family: 'seventh'  },
  m7:     { label: 'm7',       intervals: ['1', 'b3', '5', 'b7'],     family: 'seventh'  },
  m7b5:   { label: 'm7♭5',     intervals: ['1', 'b3', 'b5', 'b7'],    family: 'seventh'  },
  dim7:   { label: '°7',       intervals: ['1', 'b3', 'b5', '6'],     family: 'seventh'  },
  mMaj7:  { label: 'mMaj7',    intervals: ['1', 'b3', '5', '7'],      family: 'seventh'  },
  // 6ths
  '6':    { label: '6',        intervals: ['1', '3', '5', '6'],       family: 'extended' },
  m6:     { label: 'm6',       intervals: ['1', 'b3', '5', '6'],      family: 'extended' },
  // Add9
  add9:   { label: 'add9',     intervals: ['1', '3', '5', '9'],       family: 'extended' },
  madd9:  { label: 'm(add9)',  intervals: ['1', 'b3', '5', '9'],      family: 'extended' },
  // 9ths
  maj9:   { label: 'maj9',     intervals: ['1', '3', '5', '7', '9'],  family: 'extended' },
  '9':    { label: '9',        intervals: ['1', '3', '5', 'b7', '9'], family: 'extended' },
  m9:     { label: 'm9',       intervals: ['1', 'b3', '5', 'b7', '9'], family: 'extended' },
};

export const QUALITY_FAMILIES = [
  { id: 'triad',    label: 'Triads' },
  { id: 'sus',      label: 'Sus' },
  { id: 'seventh',  label: '7ths' },
  { id: 'extended', label: 'Extended' },
];

export function isBasicTriad(quality) {
  return quality === 'major' || quality === 'minor';
}

export function formatChordName(root, quality) {
  return root + (CHORD_QUALITIES[quality]?.label ?? '');
}

// ---------------------------------------------------------------------------
// Per-interval colors. A single tone is always the same hue so the student
// can recognize "the 9 is yellow" across every chord.
// ---------------------------------------------------------------------------
export const INTERVAL_COLORS = {
  '1':  '#e74c3c',                                  // root — red
  'b2': '#8e44ad',
  '2':  '#f1c40f',                                  // sus2 = same hue as 9
  'b3': '#3498db', '3':  '#3498db',                 // 3rd — blue
  '4':  '#16a085',                                  // sus4
  'b5': '#3498db', '5':  '#3498db', '#5': '#3498db', // 5th — blue (same as 3rd, classic triad palette)
  '6':  '#16a085',                                  // 6th — teal
  'b7': '#e67e22', '7':  '#9b59b6',                 // b7 orange, maj7 purple
  'b9': '#f1c40f', '9':  '#f1c40f', '#9': '#f1c40f', // 9 — yellow
  '11': '#1abc9c', '#11': '#1abc9c',                // 11 — light teal
  'b13': '#c0392b', '13': '#d35400',                // 13 — deep orange
};

export function getColorForTone(tone, isActive) {
  const base = INTERVAL_COLORS[tone] || '#7f8c8d';
  // Active = full color. Inactive = same hue with alpha for context.
  return isActive ? base : base + '55';
}

// ---------------------------------------------------------------------------
// Shape data helpers (legacy table — only used by findBestShapeForFret now)
// ---------------------------------------------------------------------------
export function getPartialChordShape(cagedLetter, quality) {
  return PARTIAL_CHORD_SHAPES[quality]?.[cagedLetter] ?? null;
}

// Actual fret of the barre / first fret of the shape for a given root.
export function getBarreFret(cagedLetter, root) {
  const config = POSITION_CONFIG[cagedLetter];
  if (!config) return 0;

  const rootStringIdx = config.rootString;
  const rootOffsetInShape = config.rootOffsetFromStart;

  const openNote = STRING_TUNING[rootStringIdx - 1];
  const openIdx = CHROMATIC_SCALE.indexOf(openNote);
  const rootIdx = CHROMATIC_SCALE.indexOf(root);
  if (openIdx < 0 || rootIdx < 0) return 0;

  const rootFretOnString = (rootIdx - openIdx + 12) % 12;
  const barreFret = rootFretOnString - rootOffsetInShape;
  return barreFret < 0 ? barreFret + 12 : barreFret;
}

export function getNoteAtFret(stringNum, fret) {
  const openNote = STRING_TUNING[stringNum - 1];
  const openIdx = CHROMATIC_SCALE.indexOf(openNote);
  return CHROMATIC_SCALE[((openIdx + fret) % 12 + 12) % 12];
}

// Pick the CAGED/set whose lowest fret is closest to targetFret. Quality-
// agnostic: uses only barre position + span. Works for every CHORD_QUALITIES.
export function findBestShapeForFret(root, quality, targetFret, width = 3) {
  let bestDist = Infinity;
  let best = {
    cagedIdx: 3,
    setIdx: DEFAULT_SET_IDX_BY_WIDTH[width] ?? 3,
  };

  CAGED_ORDER.forEach((caged, cagedIdx) => {
    const barre = getBarreFret(caged, root);
    const span = POSITION_CONFIG[caged]?.span ?? 4;
    const lowFret = barre === 0 ? 0 : barre;
    const highFret = barre + span;

    (STRING_SETS_BY_WIDTH[width] || []).forEach((setIdx) => {
      const mid = (lowFret + highFret) / 2;
      const dist = Math.abs(mid - targetFret);
      if (dist < bestDist) {
        bestDist = dist;
        best = { cagedIdx, setIdx };
      }
    });
  });

  return best;
}

// ---------------------------------------------------------------------------
// Window + chord-tones scan — the new rendering pipeline.
// ---------------------------------------------------------------------------
export function getShapeWindow(cagedLetter, root) {
  const barre = getBarreFret(cagedLetter, root);
  const span = POSITION_CONFIG[cagedLetter]?.span ?? 4;
  return {
    startFret: barre === 0 ? 0 : barre,
    endFret: barre === 0 ? span : barre + span,
    isOpen: barre === 0,
    barreFret: barre,
  };
}

// Scan every cell of every string inside the CAGED window. Return the
// {string, fret, tone} of every cell that contains a tone of the chord.
export function getChordTonesInShape(cagedLetter, root, quality) {
  const { startFret, endFret, isOpen } = getShapeWindow(cagedLetter, root);
  const qual = CHORD_QUALITIES[quality];
  if (!qual) return [];

  const rootIdx = CHROMATIC_SCALE.indexOf(root);
  if (rootIdx < 0) return [];

  // Map of semitone-class → interval label (lowest-numbered label wins for
  // enharmonic collisions, but our INTERVAL_SEMITONES already avoids those
  // inside any single quality definition).
  const chordSet = new Map();
  qual.intervals.forEach((iv) => {
    const semi = INTERVAL_SEMITONES[iv];
    if (semi === undefined) return;
    chordSet.set((rootIdx + semi) % 12, iv);
  });

  const result = [];
  for (let s = 1; s <= 6; s++) {
    const lo = isOpen ? 0 : startFret;
    const hi = endFret;
    for (let f = lo; f <= hi; f++) {
      const note = getNoteAtFret(s, f);
      const noteIdx = CHROMATIC_SCALE.indexOf(note);
      if (chordSet.has(noteIdx)) {
        result.push({
          stringNum: s,
          fret: f,
          tone: chordSet.get(noteIdx),
          isOpen: f === 0,
        });
      }
    }
  }
  return result;
}

// Concrete note name for a chord tone above a root (e.g. ('D','9') → 'E').
export function getNoteNameForTone(root, tone) {
  const rootIdx = CHROMATIC_SCALE.indexOf(root);
  const semi = INTERVAL_SEMITONES[tone];
  if (rootIdx < 0 || semi === undefined) return '';
  return CHROMATIC_SCALE[(rootIdx + semi) % 12];
}
