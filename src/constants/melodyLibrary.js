// Note entities - represent musical notes independent of instrument
export const noteEntities = [
  { id: 1, note: 'E', octave: 2, fullNote: 'E2' },
  { id: 2, note: 'F', octave: 2, fullNote: 'F2' },
  { id: 3, note: 'G', octave: 2, fullNote: 'G2' },
  { id: 4, note: 'A', octave: 2, fullNote: 'A2' },
  { id: 5, note: 'D', octave: 3, fullNote: 'D3' },
  { id: 6, note: 'C', octave: 3, fullNote: 'C3' },
  { id: 7, note: 'E', octave: 3, fullNote: 'E3' },
  { id: 8, note: 'F', octave: 3, fullNote: 'F3' },
  { id: 9, note: 'G', octave: 3, fullNote: 'G3' }
];

// Guitar position entities - map notes to fretboard positions
export const guitarPositions = [
  // E2 positions
  { id: 1, noteId: 1, string: 0, fret: 0 },

  // F2 positions
  { id: 2, noteId: 2, string: 0, fret: 1 },

  // G2 positions
  { id: 3, noteId: 3, string: 0, fret: 3 },

  // A2 positions
  { id: 4, noteId: 4, string: 1, fret: 0 },

  // D3 positions
  { id: 5, noteId: 5, string: 2, fret: 0 },

  // C3 positions
  { id: 6, noteId: 6, string: 1, fret: 3 },  // A string, fret 3
  { id: 7, noteId: 6, string: 2, fret: 10 }, // D string, fret 10

  // E3 positions
  { id: 8, noteId: 7, string: 2, fret: 2 },  // D string, fret 2
  { id: 9, noteId: 7, string: 1, fret: 7 },  // A string, fret 7

  // F3 positions
  { id: 10, noteId: 8, string: 1, fret: 8 },

  // G3 positions
  { id: 11, noteId: 9, string: 3, fret: 0 }  // G string, open
];

// Melody library - references note entities
export const melodyLibrary = [
  {
    id: 1,
    name: 'Single note - E string',
    difficulty: 1,
    noteSequence: [2], // F2
    tags: ['beginner', 'single-note']
  },
  {
    id: 2,
    name: 'Two notes - ascending step',
    difficulty: 1,
    noteSequence: [1, 2], // E2, F2
    tags: ['beginner', 'two-notes', 'steps']
  },
  {
    id: 3,
    name: 'Two notes - descending step',
    difficulty: 1,
    noteSequence: [2, 1], // F2, E2
    tags: ['beginner', 'two-notes', 'steps']
  },
  {
    id: 4,
    name: 'Three notes - ascending',
    difficulty: 2,
    noteSequence: [1, 2, 3], // E2, F2, G2
    tags: ['beginner', 'three-notes', 'steps']
  },
  {
    id: 5,
    name: 'Three notes - descending',
    difficulty: 2,
    noteSequence: [3, 2, 1], // G2, F2, E2
    tags: ['beginner', 'three-notes', 'steps']
  },
  {
    id: 6,
    name: 'Simple triad - C major',
    difficulty: 3,
    noteSequence: [6, 7, 9], // C3, E3, G3
    tags: ['intermediate', 'triadic', 'diatonic']
  },
  {
    id: 7,
    name: 'Four notes - up and down',
    difficulty: 3,
    noteSequence: [1, 2, 3, 2], // E2, F2, G2, F2
    tags: ['intermediate', 'four-notes', 'pattern']
  },
  {
    id: 8,
    name: 'Cross-string pattern',
    difficulty: 4,
    noteSequence: [1, 4, 5], // E2, A2, D3
    tags: ['intermediate', 'cross-string', 'open-strings']
  },
  {
    id: 9,
    name: 'Simple scale fragment',
    difficulty: 4,
    noteSequence: [6, 5, 7, 8], // C3, D3, E3, F3
    tags: ['intermediate', 'scale', 'diatonic']
  },
  {
    id: 10,
    name: 'Octave leap',
    difficulty: 5,
    noteSequence: [1, 7], // E2, E3
    tags: ['advanced', 'leaps', 'octaves']
  }
];
