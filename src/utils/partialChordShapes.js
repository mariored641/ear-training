import { CHROMATIC_SCALE, STRING_TUNING, POSITION_CONFIG } from '../constants/positionData.js';

// ---------------------------------------------------------------------------
// CAGED partial-chord shapes
// ---------------------------------------------------------------------------
//
// Each shape is an array of 6 entries, LOW-TO-HIGH string:
//   index 0 = string 6 (low E) ... index 5 = string 1 (high E).
// Each entry is either:
//   null                              — string muted (draw "x")
//   { tone, fretOffset, finger }
//     tone:       '1' | '3' | 'b3' | '5'
//     fretOffset: frets above the shape's BARRE (for movable form) /
//                 the NUT (for open form). 0 = on the barre / open string.
//     finger:     0 = barre, 1 = index, 2 = middle, 3 = ring, 4 = pinky
//
// The data is derived DIRECTLY from the canonical open voicings:
//   C  = x32010     A  = x02220     G  = 320003
//   E  = 022100     D  = xx0232
//   Cm = (movable, S1 muted)  Am = x02210  (S1 = open E = 5)
//   Gm = (movable, S2 muted)  Em = 022000  Dm = xx0231
// ---------------------------------------------------------------------------

export const PARTIAL_CHORD_SHAPES = {
  major: {
    // Open C major: x32010 → S5=C(f3), S4=E(f2), S3=G(f0), S2=C(f1), S1=E(f0)
    C: [
      null,
      { tone: '1',  fretOffset: 3, finger: 3 },
      { tone: '3',  fretOffset: 2, finger: 2 },
      { tone: '5',  fretOffset: 0, finger: 0 },
      { tone: '1',  fretOffset: 1, finger: 1 },
      { tone: '3',  fretOffset: 0, finger: 0 },
    ],
    // Open A major: x02220 → S5=A(f0), S4=E(f2), S3=A(f2), S2=C#(f2), S1=E(f0)
    A: [
      null,
      { tone: '1',  fretOffset: 0, finger: 0 },
      { tone: '5',  fretOffset: 2, finger: 2 },
      { tone: '1',  fretOffset: 2, finger: 3 },
      { tone: '3',  fretOffset: 2, finger: 4 },
      { tone: '5',  fretOffset: 0, finger: 0 },
    ],
    // Open G major: 320003 → S6=G(f3), S5=B(f2), S4=D(f0), S3=G(f0), S2=B(f0), S1=G(f3)
    G: [
      { tone: '1',  fretOffset: 3, finger: 3 },
      { tone: '3',  fretOffset: 2, finger: 2 },
      { tone: '5',  fretOffset: 0, finger: 0 },
      { tone: '1',  fretOffset: 0, finger: 0 },
      { tone: '3',  fretOffset: 0, finger: 0 },
      { tone: '1',  fretOffset: 3, finger: 4 },
    ],
    // Open E major: 022100 → S6=E(f0), S5=B(f2), S4=E(f2), S3=G#(f1), S2=B(f0), S1=E(f0)
    E: [
      { tone: '1',  fretOffset: 0, finger: 0 },
      { tone: '5',  fretOffset: 2, finger: 2 },
      { tone: '1',  fretOffset: 2, finger: 3 },
      { tone: '3',  fretOffset: 1, finger: 1 },
      { tone: '5',  fretOffset: 0, finger: 0 },
      { tone: '1',  fretOffset: 0, finger: 0 },
    ],
    // Open D major: xx0232 → S4=D(f0), S3=A(f2), S2=D(f3), S1=F#(f2)
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
    // Cm: C-shape with E→Eb. S1 (was E) must be muted.
    // x3(5)54(1)x: S5=C(f3), S4=Eb(f1), S3=G(f0), S2=C(f1), S1 muted.
    C: [
      null,
      { tone: '1',  fretOffset: 3, finger: 3 },
      { tone: 'b3', fretOffset: 1, finger: 1 },
      { tone: '5',  fretOffset: 0, finger: 0 },
      { tone: '1',  fretOffset: 1, finger: 1 },
      null,
    ],
    // Open Am: x02210 → S5=A(f0), S4=E(f2), S3=A(f2), S2=C(f1), S1=E(f0)
    A: [
      null,
      { tone: '1',  fretOffset: 0, finger: 0 },
      { tone: '5',  fretOffset: 2, finger: 2 },
      { tone: '1',  fretOffset: 2, finger: 3 },
      { tone: 'b3', fretOffset: 1, finger: 1 },
      { tone: '5',  fretOffset: 0, finger: 0 },
    ],
    // Gm: G-shape with B→Bb. S2 (was B open) must be muted (can't go lower).
    // S6=G(f3), S5=Bb(f1), S4=D(f0), S3=G(f0), S2 muted, S1=G(f3)
    G: [
      { tone: '1',  fretOffset: 3, finger: 3 },
      { tone: 'b3', fretOffset: 1, finger: 1 },
      { tone: '5',  fretOffset: 0, finger: 0 },
      { tone: '1',  fretOffset: 0, finger: 0 },
      null,
      { tone: '1',  fretOffset: 3, finger: 4 },
    ],
    // Open Em: 022000 → S6=E(f0), S5=B(f2), S4=E(f2), S3=G(f0), S2=B(f0), S1=E(f0)
    E: [
      { tone: '1',  fretOffset: 0, finger: 0 },
      { tone: '5',  fretOffset: 2, finger: 2 },
      { tone: '1',  fretOffset: 2, finger: 3 },
      { tone: 'b3', fretOffset: 0, finger: 0 },
      { tone: '5',  fretOffset: 0, finger: 0 },
      { tone: '1',  fretOffset: 0, finger: 0 },
    ],
    // Open Dm: xx0231 → S4=D(f0), S3=A(f2), S2=D(f3), S1=F(f1)
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

// String-set indices INTO the 6-entry shape array.
// Remember: index 0 = string 6, index 5 = string 1.
export const STRING_SETS = [
  { label: 'Strings 6-4', strings: [6, 5, 4], shapeIndices: [0, 1, 2] },
  { label: 'Strings 5-3', strings: [5, 4, 3], shapeIndices: [1, 2, 3] },
  { label: 'Strings 4-2', strings: [4, 3, 2], shapeIndices: [2, 3, 4] },
  { label: 'Strings 3-1', strings: [3, 2, 1], shapeIndices: [3, 4, 5] },
];

export function getPartialChordShape(cagedLetter, quality) {
  return PARTIAL_CHORD_SHAPES[quality]?.[cagedLetter] ?? null;
}

// Semitones of each interval label above the chord root.
export const INTERVAL_SEMITONES = { '1': 0, 'b3': 3, '3': 4, '5': 7 };

// ---------------------------------------------------------------------------
// Barre-fret computation
// ---------------------------------------------------------------------------
// For a given CAGED shape and chord root, return the actual BARRE fret
// (= the fret represented by fretOffset 0 in the shape).
//
// Uses POSITION_CONFIG (already in the codebase) to know which string the
// root sits on and at what offset within the shape.
// ---------------------------------------------------------------------------
export function getBarreFret(cagedLetter, root) {
  const config = POSITION_CONFIG[cagedLetter];
  if (!config) return 0;

  const rootStringIdx = config.rootString;           // 1..6
  const rootOffsetInShape = config.rootOffsetFromStart;

  const openNote = STRING_TUNING[rootStringIdx - 1]; // STRING_TUNING is 0=S1..5=S6
  const openIdx = CHROMATIC_SCALE.indexOf(openNote);
  const rootIdx = CHROMATIC_SCALE.indexOf(root);
  if (openIdx < 0 || rootIdx < 0) return 0;

  const rootFretOnString = (rootIdx - openIdx + 12) % 12;
  const barreFret = rootFretOnString - rootOffsetInShape;
  return barreFret < 0 ? barreFret + 12 : barreFret;
}

// Note name at (string, fret) using standard tuning.
export function getNoteAtFret(stringNum, fret) {
  const openNote = STRING_TUNING[stringNum - 1];
  const openIdx = CHROMATIC_SCALE.indexOf(openNote);
  return CHROMATIC_SCALE[((openIdx + fret) % 12 + 12) % 12];
}

// For a given root + quality, find the (cagedIdx, setIdx) whose lowest active
// fret is closest to targetFret. Ties broken by lower cagedIdx (arbitrary).
export function findBestShapeForFret(root, quality, targetFret) {
  let bestDist = Infinity;
  let best = { cagedIdx: 3, setIdx: 3 }; // E-shape, strings 3-1 as fallback

  CAGED_ORDER.forEach((caged, cagedIdx) => {
    const barre = getBarreFret(caged, root);
    const shape = PARTIAL_CHORD_SHAPES[quality][caged];

    STRING_SETS.forEach((set, setIdx) => {
      const offsets = set.shapeIndices
        .map(i => shape[i])
        .filter(Boolean)
        .map(e => e.fretOffset);
      if (offsets.length === 0) return;

      const minFret = barre + Math.min(...offsets);
      const dist = Math.abs(minFret - targetFret);
      if (dist < bestDist) {
        bestDist = dist;
        best = { cagedIdx, setIdx };
      }
    });
  });

  return best;
}

// Note name of a specific chord tone for (root, tone).
export function getNoteNameForTone(root, tone) {
  const rootIdx = CHROMATIC_SCALE.indexOf(root);
  const semi = INTERVAL_SEMITONES[tone];
  if (rootIdx < 0 || semi === undefined) return '';
  return CHROMATIC_SCALE[(rootIdx + semi) % 12];
}
