/**
 * Rhythm Training Module — Constants, Building Blocks, and Defaults
 *
 * A building block has:
 *   id       : string  — unique key
 *   duration : number  — length in quarter notes (beats)
 *   level    : number  — introduced at this difficulty level
 *   events   : Array<{ time: number, duration: number, isNote: boolean }>
 *              time and duration are in quarter notes (beats)
 *   tieEnd   : boolean — true if this block can tie to the next (ends on "and")
 *   tieStart : boolean — true if this block can receive a tie (starts on beat)
 *
 * Levels 1–11:
 *   1  — Quarter notes
 *   2  — Eighth notes (on-beat)
 *   3  — Eighth syncopations
 *   4  — Sixteenth notes
 *   5  — Quarter triplets (full only, isolated bank)
 *   6  — Half/whole triplets (full only, isolated bank)
 *   7  — Swing (triplet feel — +-+), extends 1-6
 *   8  — Rhythmic displacement (special algorithm, no bank)
 *   9  — Quintuplets (full only), extends 1-5
 *  10  — Polyrhythm, extends 1-5
 *  11  — Septuplets (full only), extends 1-5
 */

// ─── Level 1 — Quarter notes ───────────────────────────────────────────────
const Q_NOTE = {
  id: 'q_note', duration: 1, level: 1, tieEnd: false, tieStart: true,
  name: '♩',
  events: [{ time: 0, duration: 1, isNote: true }],
};

const Q_REST = {
  id: 'q_rest', duration: 1, level: 1, tieEnd: false, tieStart: false,
  name: '𝄽',
  events: [{ time: 0, duration: 1, isNote: false }],
};

// ─── Level 2 — Eighth notes (on-beat) ─────────────────────────────────────
const E_E = {
  id: 'e_e', duration: 1, level: 2, tieEnd: true, tieStart: true,
  name: '♪♪',
  events: [
    { time: 0,   duration: 0.5, isNote: true },
    { time: 0.5, duration: 0.5, isNote: true },
  ],
};

const E_R = {
  id: 'e_r', duration: 1, level: 2, tieEnd: false, tieStart: true,
  name: '♪𝄾',
  events: [
    { time: 0,   duration: 0.5, isNote: true },
    { time: 0.5, duration: 0.5, isNote: false },
  ],
};

const R_R = {
  id: 'r_r', duration: 1, level: 2, tieEnd: false, tieStart: false,
  name: '𝄾𝄾',
  events: [
    { time: 0,   duration: 0.5, isNote: false },
    { time: 0.5, duration: 0.5, isNote: false },
  ],
};

// ─── Level 3 — Eighth syncopations ────────────────────────────────────────
const R_E = {
  id: 'r_e', duration: 1, level: 3, tieEnd: true, tieStart: false,
  name: '𝄾♪',
  events: [
    { time: 0,   duration: 0.5, isNote: false },
    { time: 0.5, duration: 0.5, isNote: true },
  ],
};

// ─── Level 4 — Sixteenth notes ────────────────────────────────────────────
const SSSS = {
  id: 'ssss', duration: 1, level: 4, tieEnd: false, tieStart: true,
  name: '♬♬♬♬',
  events: [
    { time: 0,    duration: 0.25, isNote: true },
    { time: 0.25, duration: 0.25, isNote: true },
    { time: 0.5,  duration: 0.25, isNote: true },
    { time: 0.75, duration: 0.25, isNote: true },
  ],
};

const E_SS = {
  id: 'e_ss', duration: 1, level: 4, tieEnd: false, tieStart: true,
  name: '♪♬♬',
  events: [
    { time: 0,    duration: 0.5,  isNote: true },
    { time: 0.5,  duration: 0.25, isNote: true },
    { time: 0.75, duration: 0.25, isNote: true },
  ],
};

const SS_E = {
  id: 'ss_e', duration: 1, level: 4, tieEnd: true, tieStart: true,
  name: '♬♬♪',
  events: [
    { time: 0,    duration: 0.25, isNote: true },
    { time: 0.25, duration: 0.25, isNote: true },
    { time: 0.5,  duration: 0.5,  isNote: true },
  ],
};

const S_S_E = {
  id: 's_s_e', duration: 1, level: 4, tieEnd: true, tieStart: false,
  name: '𝄿♬♪',
  events: [
    { time: 0,    duration: 0.25, isNote: false },
    { time: 0.25, duration: 0.25, isNote: true },
    { time: 0.5,  duration: 0.5,  isNote: true },
  ],
};

const E_S_R = {
  id: 'e_s_r', duration: 1, level: 4, tieEnd: false, tieStart: true,
  name: '♪♬𝄿',
  events: [
    { time: 0,    duration: 0.5,  isNote: true },
    { time: 0.5,  duration: 0.25, isNote: true },
    { time: 0.75, duration: 0.25, isNote: false },
  ],
};

const SSSR = {
  id: 'sssr', duration: 1, level: 4, tieEnd: false, tieStart: true,
  name: '♬♬♬𝄿',
  events: [
    { time: 0,    duration: 0.25, isNote: true },
    { time: 0.25, duration: 0.25, isNote: true },
    { time: 0.5,  duration: 0.25, isNote: true },
    { time: 0.75, duration: 0.25, isNote: false },
  ],
};

const RSSS = {
  id: 'rsss', duration: 1, level: 4, tieEnd: false, tieStart: false,
  name: '𝄿♬♬♬',
  events: [
    { time: 0,    duration: 0.25, isNote: false },
    { time: 0.25, duration: 0.25, isNote: true },
    { time: 0.5,  duration: 0.25, isNote: true },
    { time: 0.75, duration: 0.25, isNote: true },
  ],
};

const SS_R_S = {
  id: 'ss_r_s', duration: 1, level: 4, tieEnd: false, tieStart: true,
  name: '♬♬𝄿♬',
  events: [
    { time: 0,    duration: 0.25, isNote: true },
    { time: 0.25, duration: 0.25, isNote: true },
    { time: 0.5,  duration: 0.25, isNote: false },
    { time: 0.75, duration: 0.25, isNote: true },
  ],
};

// ─── Level 5 — Quarter triplets (FULL only, isolated bank) ────────────────
// Spec: only +++ — no variants with rests
const T3 = {
  id: 't3', duration: 1, level: 5, tieEnd: false, tieStart: false,
  name: '³♩',
  events: [
    { time: 0,     duration: 1/3, isNote: true },
    { time: 1/3,   duration: 1/3, isNote: true },
    { time: 2/3,   duration: 1/3, isNote: true },
  ],
};

// ─── Level 6 — Half and whole triplets (FULL only, isolated bank) ──────────
// Spec: only +++ — no variants with rests
const HT3 = {
  id: 'ht3', duration: 2, level: 6, tieEnd: false, tieStart: false,
  name: '³𝅗𝅥',
  events: [
    { time: 0,     duration: 2/3, isNote: true },
    { time: 2/3,   duration: 2/3, isNote: true },
    { time: 4/3,   duration: 2/3, isNote: true },
  ],
};

const WT3 = {
  id: 'wt3', duration: 4, level: 6, tieEnd: false, tieStart: false,
  name: '³𝅝',
  events: [
    { time: 0,     duration: 4/3, isNote: true },
    { time: 4/3,   duration: 4/3, isNote: true },
    { time: 8/3,   duration: 4/3, isNote: true },
  ],
};

// ─── Level 7 — Swing (triplet feel: +-+), extends 1-6 ────────────────────
// Pattern: first and third triplet subdivision played, middle silent
const TRT_Q = {
  id: 'trt_q', duration: 1, level: 7, tieEnd: false, tieStart: false,
  name: 'Sw♩',
  events: [
    { time: 0,   duration: 1/3, isNote: true  },
    { time: 1/3, duration: 1/3, isNote: false },
    { time: 2/3, duration: 1/3, isNote: true  },
  ],
};

const TRT_H = {
  id: 'trt_h', duration: 2, level: 7, tieEnd: false, tieStart: false,
  name: 'Sw𝅗𝅥',
  events: [
    { time: 0,   duration: 2/3, isNote: true  },
    { time: 2/3, duration: 2/3, isNote: false },
    { time: 4/3, duration: 2/3, isNote: true  },
  ],
};

const TRT_W = {
  id: 'trt_w', duration: 4, level: 7, tieEnd: false, tieStart: false,
  name: 'Sw𝅝',
  events: [
    { time: 0,   duration: 4/3, isNote: true  },
    { time: 4/3, duration: 4/3, isNote: false },
    { time: 8/3, duration: 4/3, isNote: true  },
  ],
};

// ─── Level 8 — Rhythmic Displacement (special algorithm — no bank blocks) ──
// See rhythmPatternGenerator.js for generateDisplacementBlocks()

// ─── Level 9 — Quintuplets (FULL only), extends 1-5 ──────────────────────
// 5 equal notes in one quarter — no variants with rests
const Q5 = {
  id: 'q5', duration: 1, level: 9, tieEnd: false, tieStart: false,
  name: '⁵♩',
  events: Array.from({ length: 5 }, (_, i) => ({
    time: i / 5, duration: 1 / 5, isNote: true,
  })),
};

// ─── Level 10 — Polyrhythm, extends 1-5 ──────────────────────────────────
// 3:4 — 3 evenly-spaced notes across 4 beats
const POLY_3_4 = {
  id: 'poly_3_4', duration: 4, level: 10, tieEnd: false, tieStart: false,
  name: '3:4',
  events: Array.from({ length: 3 }, (_, i) => ({
    time: i * (4 / 3), duration: 4 / 3, isNote: true,
  })),
};

// 5:4 — 5 evenly-spaced notes across 4 beats
const POLY_5_4 = {
  id: 'poly_5_4', duration: 4, level: 10, tieEnd: false, tieStart: false,
  name: '5:4',
  events: Array.from({ length: 5 }, (_, i) => ({
    time: i * (4 / 5), duration: 4 / 5, isNote: true,
  })),
};

// ─── Level 11 — Septuplets (FULL only), extends 1-5 ──────────────────────
// 7 equal notes in one quarter — no variants with rests
const Q7 = {
  id: 'q7', duration: 1, level: 11, tieEnd: false, tieStart: false,
  name: '⁷♩',
  events: Array.from({ length: 7 }, (_, i) => ({
    time: i / 7, duration: 1 / 7, isNote: true,
  })),
};

// ─── Shared sub-banks ──────────────────────────────────────────────────────
const _l1 = [Q_NOTE, Q_REST];
const _l2 = [..._l1, E_E, E_R, R_R];
const _l3 = [..._l2, R_E];
const _l4 = [..._l3, SSSS, E_SS, SS_E, S_S_E, E_S_R, SSSR, RSSS, SS_R_S];

// ─── Bank exports ──────────────────────────────────────────────────────────
/**
 * Returns the full building-block bank for a given level.
 *
 *  Levels 1-4  : cumulative binary banks
 *  Level 5     : isolated — Q/QR + full quarter triplet only
 *  Level 6     : isolated — adds full half/whole triplets
 *  Level 7     : extends 1-6 + swing (+-+) patterns
 *  Level 8     : [] — displacement is generated by special algorithm
 *  Level 9     : extends 1-5 + full quintuplet
 *  Level 10    : extends 1-5 + polyrhythm (3:4, 5:4)
 *  Level 11    : extends 1-5 + full septuplet
 */
export function getBankForLevel(level) {
  const banks = {
    1:  _l1,
    2:  _l2,
    3:  _l3,
    4:  _l4,
    5:  [..._l1, T3],                             // isolated triplet bank
    6:  [..._l1, T3, HT3, WT3],                   // isolated — adds half/whole
    7:  [..._l4, T3, HT3, WT3, TRT_Q, TRT_H, TRT_W], // full mix + swing
    8:  [],                                         // displacement: no standard blocks
    9:  [..._l4, T3, Q5],                          // extends 1-5 + quintuplet
    10: [..._l4, T3, POLY_3_4, POLY_5_4],          // extends 1-5 + polyrhythm
    11: [..._l4, T3, Q7],                          // extends 1-5 + septuplet
  };
  return banks[level] || _l1;
}

/**
 * Returns only the NEW blocks introduced at the given level (for mandatory slots).
 */
export function getNewBlocksForLevel(level) {
  const all = {
    1:  [Q_NOTE, Q_REST],
    2:  [E_E, E_R, R_R],
    3:  [R_E],
    4:  [SSSS, E_SS, SS_E, S_S_E, E_S_R, SSSR, RSSS, SS_R_S],
    5:  [T3],
    6:  [HT3, WT3],
    7:  [TRT_Q, TRT_H, TRT_W],
    8:  [],                      // displacement — no standard blocks
    9:  [Q5],
    10: [POLY_3_4, POLY_5_4],
    11: [Q7],
  };
  return all[level] || [];
}

// ─── Default settings ──────────────────────────────────────────────────────
export const DEFAULT_RHYTHM_TRAINING_SETTINGS = {
  bpm: 80,
  numBars: 2,
  level: 1,
  soundChoice: 'woodblock',  // 'woodblock' | 'bass' | 'drums'
  bassNote: 'A',             // base note for bass sound
  numQuestions: 0,           // 0 = unlimited (∞)
};

// Calibration thresholds (adjustable after testing)
export const EVALUATION_CONFIG = {
  toleranceMs: 70,    // raised from 50 — measured timing spread ~±60ms, 70 covers most real playing
  minMatchPct: 0.80,  // minimum fraction of matched onsets to pass
  minInterOnsetMs: 80, // minimum gap between two detected onsets
};

export const CHROMATIC_NOTES_SHARP = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
];

export const NUM_BARS_OPTIONS = [1, 2, 4];

export const BPM_MIN = 40;
export const BPM_MAX = 180;

export const MAX_LEVEL = 11;
