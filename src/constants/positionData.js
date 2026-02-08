// Musical constants for Scale Positions module

// The chromatic scale - 12 notes
export const CHROMATIC_SCALE = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];

// Standard tuning: string 1 (high E) to string 6 (low E)
export const STRING_TUNING = ['E', 'B', 'G', 'D', 'A', 'E'];

// Scale intervals (in semitones from root)
export const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
export const MINOR_SCALE_INTERVALS = [0, 2, 3, 5, 7, 8, 10];

// Distance between relative major and minor (3 semitones)
export const RELATIVE_MINOR_OFFSET = 3;

export const FRETBOARD_CONFIG = {
  strings: 6,
  frets: 24,
  positionMarkers: [3, 5, 7, 9, 12, 15, 17, 19, 21, 24],
  doubleMarkers: [12, 24],
};

// CAGED Position definitions
export const POSITION_NAMES = ['C', 'A', 'G', 'E', 'D'];

// Each CAGED shape is anchored by the MAJOR root of the key.
// rootString: which string the major root sits on in this shape
// rootOffsetFromStart: how many frets from the shape's START to the root
//   C shape: root is at the high end of the shape (+3 from start)
//   A shape: root is at the low end of the shape (0 from start)
//   G shape: root is at the high end of the shape (+3 from start)
//   E shape: root is at the low end of the shape (0 from start)
//   D shape: root is at the low end of the shape (0 from start)
// span: total fret span of the shape
export const POSITION_CONFIG = {
  'C': { rootString: 5, rootOffsetFromStart: 3, span: 4 },
  'A': { rootString: 5, rootOffsetFromStart: 0, span: 4 },
  'G': { rootString: 6, rootOffsetFromStart: 3, span: 4 },
  'E': { rootString: 6, rootOffsetFromStart: 0, span: 4 },
  'D': { rootString: 4, rootOffsetFromStart: 0, span: 4 },
};

// Hardcoded position ranges for C major / A minor (same positions for both,
// since A minor is the relative minor of C major).
// These override the dynamic CAGED calculation for accuracy.
export const C_AM_POSITION_RANGES = {
  'C': { fretStart: 0, fretEnd: 3 },
  'A': { fretStart: 2, fretEnd: 6 },
  'G': { fretStart: 4, fretEnd: 8 },
  'E': { fretStart: 7, fretEnd: 10 },
  'D': { fretStart: 9, fretEnd: 13 },
};
