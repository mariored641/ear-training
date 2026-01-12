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
