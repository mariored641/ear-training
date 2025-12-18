/**
 * Default settings and constants for Exercise 4 - Rhythm Training
 */

export const DEFAULT_EXERCISE4_SETTINGS = {
  soundSet: 'classicClick' // 'classicClick' | 'drumKit' | 'woodblock' | 'electronicBeep'
};

export const DEFAULT_RHYTHM_EXPLORER = {
  beats: 4,
  subdivision: 1,
  bpm: 90,
  timeSignature: '4/4',
  grid: null // Will be initialized dynamically
};

export const DEFAULT_POLYRHYTHM = {
  top: {
    count: 3,
    cells: null // Will be initialized dynamically
  },
  bottom: {
    count: 4,
    cells: null // Will be initialized dynamically
  },
  bpm: 90
};

export const DEFAULT_ADVANCED = {
  beats: [
    { length: 1, division: 1, cells: null },
    { length: 1, division: 1, cells: null },
    { length: 1, division: 1, cells: null },
    { length: 1, division: 1, cells: null }
  ],
  bpm: 90
};

// Cell states
export const CELL_STATES = {
  ACCENT: 'accent',     // Strong - dark blue
  NORMAL: 'normal',     // Regular - medium blue
  SOFT: 'soft',         // Weak - light blue
  MUTE: 'mute'          // Silent - gray
};

// Subdivisions for Rhythm Explorer
export const SUBDIVISIONS = [
  { value: 1, label: '1', icon: '♩' },
  { value: 2, label: '2', icon: '♪♪' },
  { value: 3, label: '3', icon: '♪♪♪' },
  { value: 4, label: '4', icon: '♪♪♪♪' },
  { value: 6, label: '6', icon: '♪♪♪♪♪♪' }
];

// Time signatures
export const TIME_SIGNATURES = [
  '4/4', '3/4', '2/4', '1/4',
  '5/8', '3/8', '6/4', '5/4',
  '12/8', '9/8', '7/8', '6/8'
];

// Polyrhythm presets
export const POLYRHYTHM_PRESETS = [
  { top: 3, bottom: 2, label: '3:2' },
  { top: 4, bottom: 3, label: '4:3' },
  { top: 5, bottom: 4, label: '5:4' },
  { top: 7, bottom: 4, label: '7:4' },
  { top: 5, bottom: 3, label: '5:3' },
  { top: 7, bottom: 5, label: '7:5' }
];

// BPM ranges and tempo markings
export const BPM_MIN = 40;
export const BPM_MAX = 240;
export const BPM_DEFAULT = 90;

export const TEMPO_MARKINGS = [
  { min: 40, max: 60, name: 'Largo' },
  { min: 66, max: 76, name: 'Adagio' },
  { min: 76, max: 108, name: 'Andante' },
  { min: 108, max: 120, name: 'Moderato' },
  { min: 120, max: 168, name: 'Allegro' },
  { min: 168, max: 200, name: 'Presto' },
  { min: 200, max: 300, name: 'Prestissimo' }
];

// Advanced Subdivisions - Division options
export const DIVISION_OPTIONS = [
  { value: 1, label: '1 - None' },
  { value: 2, label: '2 - Eighths' },
  { value: 3, label: '3 - Triplets' },
  { value: 4, label: '4 - Sixteenths' },
  { value: 5, label: '5 - Quintuplets' },
  { value: 6, label: '6 - Sextuplets' },
  { value: 7, label: '7 - Septuplets' },
  { value: 8, label: '8 - Thirty-seconds' }
];

// Note icons for length values
export const NOTE_ICONS = {
  4: '𝅝',    // Whole
  2: '𝅗𝅥',    // Half
  1: '♩',    // Quarter
  0.5: '♪',  // Eighth
  0.25: '𝅘𝅥𝅯' // Sixteenth
};
