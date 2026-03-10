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
  name: '♬𝄿♬♪', // 16th rest + 16th + 8th
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
  name: '𝄿♬♬♬', // 16th rest + 3 × 16th — off-beat accent
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

// ─── Level 5 — Quarter triplets (ISOLATED — no binary) ────────────────────
const T3 = {
  id: 't3', duration: 1, level: 5, tieEnd: false, tieStart: false,
  name: '³♩',
  events: [
    { time: 0,     duration: 1/3, isNote: true },
    { time: 1/3,   duration: 1/3, isNote: true },
    { time: 2/3,   duration: 1/3, isNote: true },
  ],
};

const T3_R = {
  id: 't3_r', duration: 1, level: 5, tieEnd: false, tieStart: false,
  name: '³♩𝄽',  // note-note-rest
  events: [
    { time: 0,     duration: 1/3, isNote: true },
    { time: 1/3,   duration: 1/3, isNote: true },
    { time: 2/3,   duration: 1/3, isNote: false },
  ],
};

const T3_RNR = {
  id: 't3_rnr', duration: 1, level: 5, tieEnd: false, tieStart: false,
  name: '³♩𝄽♩', // note-rest-note
  events: [
    { time: 0,     duration: 1/3, isNote: true },
    { time: 1/3,   duration: 1/3, isNote: false },
    { time: 2/3,   duration: 1/3, isNote: true },
  ],
};

const T3_RN = {
  id: 't3_rn', duration: 1, level: 5, tieEnd: false, tieStart: false,
  name: '³𝄽♩', // rest-note (long)
  events: [
    { time: 0,     duration: 1/3, isNote: false },
    { time: 1/3,   duration: 2/3, isNote: true },
  ],
};

// ─── Level 6 — Half and whole triplets (ISOLATED) ─────────────────────────
const HT3 = {
  id: 'ht3', duration: 2, level: 6, tieEnd: false, tieStart: false,
  name: '³𝅗𝅥', // half-note triplet
  events: [
    { time: 0,     duration: 2/3, isNote: true },
    { time: 2/3,   duration: 2/3, isNote: true },
    { time: 4/3,   duration: 2/3, isNote: true },
  ],
};

const HT3_R = {
  id: 'ht3_r', duration: 2, level: 6, tieEnd: false, tieStart: false,
  name: '³𝅗𝅥𝄼', // half-note triplet with rest
  events: [
    { time: 0,     duration: 2/3, isNote: true },
    { time: 2/3,   duration: 2/3, isNote: true },
    { time: 4/3,   duration: 2/3, isNote: false },
  ],
};

const WT3 = {
  id: 'wt3', duration: 4, level: 6, tieEnd: false, tieStart: false,
  name: '³𝅝', // whole-note triplet
  events: [
    { time: 0,     duration: 4/3, isNote: true },
    { time: 4/3,   duration: 4/3, isNote: true },
    { time: 8/3,   duration: 4/3, isNote: true },
  ],
};

const WT3_R = {
  id: 'wt3_r', duration: 4, level: 6, tieEnd: false, tieStart: false,
  name: '³𝅝𝄻', // whole-note triplet with rest
  events: [
    { time: 0,     duration: 4/3, isNote: true },
    { time: 4/3,   duration: 4/3, isNote: true },
    { time: 8/3,   duration: 4/3, isNote: false },
  ],
};

// ─── Level 7 — Quintuplets and Septuplets (extends 1-4) ───────────────────
const Q5 = {
  id: 'q5', duration: 1, level: 7, tieEnd: false, tieStart: false,
  name: '⁵♩',
  events: Array.from({ length: 5 }, (_, i) => ({
    time: i / 5, duration: 1 / 5, isNote: true,
  })),
};

const Q5_R = {
  id: 'q5_r', duration: 1, level: 7, tieEnd: false, tieStart: false,
  name: '⁵♩𝄽', // quintuplet with inner rest
  events: [
    { time: 0,   duration: 1/5, isNote: true },
    { time: 1/5, duration: 1/5, isNote: true },
    { time: 2/5, duration: 1/5, isNote: false },
    { time: 3/5, duration: 1/5, isNote: true },
    { time: 4/5, duration: 1/5, isNote: true },
  ],
};

const Q7 = {
  id: 'q7', duration: 1, level: 7, tieEnd: false, tieStart: false,
  name: '⁷♩',
  events: Array.from({ length: 7 }, (_, i) => ({
    time: i / 7, duration: 1 / 7, isNote: true,
  })),
};

const Q7_R = {
  id: 'q7_r', duration: 1, level: 7, tieEnd: false, tieStart: false,
  name: '⁷♩𝄽', // septuplet with inner rest
  events: [
    { time: 0,   duration: 1/7, isNote: true },
    { time: 1/7, duration: 1/7, isNote: true },
    { time: 2/7, duration: 1/7, isNote: false },
    { time: 3/7, duration: 1/7, isNote: true },
    { time: 4/7, duration: 1/7, isNote: true },
    { time: 5/7, duration: 1/7, isNote: false },
    { time: 6/7, duration: 1/7, isNote: true },
  ],
};

// Repeat T3 in level 7 (level 5 blocks re-enter level 7 bank)
const T3_L7 = { ...T3, level: 7 };

// ─── Level 8 — Polyrhythm (extends all previous) ──────────────────────────
// 3:4 (quarter triplet across 4 beats)
const POLY_3_4 = {
  id: 'poly_3_4', duration: 4, level: 8, tieEnd: false, tieStart: false,
  name: '3:4',
  events: Array.from({ length: 3 }, (_, i) => ({
    time: i * (4 / 3), duration: 4 / 3, isNote: true,
  })),
};

// 5:4 (quintuplet across 4 beats)
const POLY_5_4 = {
  id: 'poly_5_4', duration: 4, level: 8, tieEnd: false, tieStart: false,
  name: '5:4',
  events: Array.from({ length: 5 }, (_, i) => ({
    time: i * (4 / 5), duration: 4 / 5, isNote: true,
  })),
};

// 7:4 (septuplet across 4 beats)
const POLY_7_4 = {
  id: 'poly_7_4', duration: 4, level: 8, tieEnd: false, tieStart: false,
  name: '7:4',
  events: Array.from({ length: 7 }, (_, i) => ({
    time: i * (4 / 7), duration: 4 / 7, isNote: true,
  })),
};

// 3:2 (triplet over half note — 2 beats)
const POLY_3_2 = {
  id: 'poly_3_2', duration: 2, level: 8, tieEnd: false, tieStart: false,
  name: '3:2',
  events: Array.from({ length: 3 }, (_, i) => ({
    time: i * (2 / 3), duration: 2 / 3, isNote: true,
  })),
};

// ─── Bank exports ──────────────────────────────────────────────────────────
/**
 * Returns the full building-block bank for a given level.
 * For levels 5 and 6, the bank is isolated (no binary division).
 * For level 7+, the bank includes levels 1-4 + current level.
 */
export function getBankForLevel(level) {
  const l1 = [Q_NOTE, Q_REST];
  const l2 = [...l1, E_E, E_R, R_R];
  const l3 = [...l2, R_E];
  const l4 = [...l3, SSSS, E_SS, SS_E, S_S_E, E_S_R, SSSR, RSSS, SS_R_S];
  const l5 = [Q_NOTE, Q_REST, T3, T3_R, T3_RNR, T3_RN]; // isolated triplet bank
  const l6 = [Q_NOTE, Q_REST, T3, T3_R, T3_RNR, HT3, HT3_R, WT3, WT3_R]; // isolated
  const l7 = [...l4, T3_L7, Q5, Q5_R, Q7, Q7_R];
  const l8 = [...l7, POLY_3_4, POLY_5_4, POLY_7_4, POLY_3_2];

  const banks = { 1: l1, 2: l2, 3: l3, 4: l4, 5: l5, 6: l6, 7: l7, 8: l8 };
  return banks[level] || l1;
}

/**
 * Returns only the NEW blocks introduced at the given level (for mandatory slots).
 */
export function getNewBlocksForLevel(level) {
  const all = {
    1: [Q_NOTE, Q_REST],
    2: [E_E, E_R, R_R],
    3: [R_E],
    4: [SSSS, E_SS, SS_E, S_S_E, E_S_R, SSSR, RSSS, SS_R_S],
    5: [T3, T3_R, T3_RNR, T3_RN],
    6: [HT3, HT3_R, WT3, WT3_R],
    7: [T3_L7, Q5, Q5_R, Q7, Q7_R],
    8: [POLY_3_4, POLY_5_4, POLY_7_4, POLY_3_2],
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
