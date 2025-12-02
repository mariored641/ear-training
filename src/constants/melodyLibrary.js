export const melodyLibrary = [
  {
    id: 1,
    name: 'Single note - E string',
    difficulty: 1,
    notes: [
      { note: 'F', octave: 2, string: 0, fret: 1, fullNote: 'F2' }
    ],
    tags: ['beginner', 'single-note']
  },
  {
    id: 2,
    name: 'Two notes - ascending step',
    difficulty: 1,
    notes: [
      { note: 'E', octave: 2, string: 0, fret: 0, fullNote: 'E2' },
      { note: 'F', octave: 2, string: 0, fret: 1, fullNote: 'F2' }
    ],
    tags: ['beginner', 'two-notes', 'steps']
  },
  {
    id: 3,
    name: 'Two notes - descending step',
    difficulty: 1,
    notes: [
      { note: 'F', octave: 2, string: 0, fret: 1, fullNote: 'F2' },
      { note: 'E', octave: 2, string: 0, fret: 0, fullNote: 'E2' }
    ],
    tags: ['beginner', 'two-notes', 'steps']
  },
  {
    id: 4,
    name: 'Three notes - ascending',
    difficulty: 2,
    notes: [
      { note: 'E', octave: 2, string: 0, fret: 0, fullNote: 'E2' },
      { note: 'F', octave: 2, string: 0, fret: 1, fullNote: 'F2' },
      { note: 'G', octave: 2, string: 0, fret: 3, fullNote: 'G2' }
    ],
    tags: ['beginner', 'three-notes', 'steps']
  },
  {
    id: 5,
    name: 'Three notes - descending',
    difficulty: 2,
    notes: [
      { note: 'G', octave: 2, string: 0, fret: 3, fullNote: 'G2' },
      { note: 'F', octave: 2, string: 0, fret: 1, fullNote: 'F2' },
      { note: 'E', octave: 2, string: 0, fret: 0, fullNote: 'E2' }
    ],
    tags: ['beginner', 'three-notes', 'steps']
  },
  {
    id: 6,
    name: 'Simple triad - C major',
    difficulty: 3,
    notes: [
      { note: 'C', octave: 3, string: 2, fret: 3, fullNote: 'C3' },
      { note: 'E', octave: 3, string: 2, fret: 7, fullNote: 'E3' },
      { note: 'G', octave: 3, string: 3, fret: 0, fullNote: 'G3' }
    ],
    tags: ['intermediate', 'triadic', 'diatonic']
  },
  {
    id: 7,
    name: 'Four notes - up and down',
    difficulty: 3,
    notes: [
      { note: 'E', octave: 2, string: 0, fret: 0, fullNote: 'E2' },
      { note: 'F', octave: 2, string: 0, fret: 1, fullNote: 'F2' },
      { note: 'G', octave: 2, string: 0, fret: 3, fullNote: 'G2' },
      { note: 'F', octave: 2, string: 0, fret: 1, fullNote: 'F2' }
    ],
    tags: ['intermediate', 'four-notes', 'pattern']
  },
  {
    id: 8,
    name: 'Cross-string pattern',
    difficulty: 4,
    notes: [
      { note: 'E', octave: 2, string: 0, fret: 0, fullNote: 'E2' },
      { note: 'A', octave: 2, string: 1, fret: 0, fullNote: 'A2' },
      { note: 'D', octave: 3, string: 2, fret: 0, fullNote: 'D3' }
    ],
    tags: ['intermediate', 'cross-string', 'open-strings']
  },
  {
    id: 9,
    name: 'Simple scale fragment',
    difficulty: 4,
    notes: [
      { note: 'C', octave: 3, string: 1, fret: 3, fullNote: 'C3' },
      { note: 'D', octave: 3, string: 1, fret: 5, fullNote: 'D3' },
      { note: 'E', octave: 3, string: 1, fret: 7, fullNote: 'E3' },
      { note: 'F', octave: 3, string: 1, fret: 8, fullNote: 'F3' }
    ],
    tags: ['intermediate', 'scale', 'diatonic']
  },
  {
    id: 10,
    name: 'Octave leap',
    difficulty: 5,
    notes: [
      { note: 'E', octave: 2, string: 0, fret: 0, fullNote: 'E2' },
      { note: 'E', octave: 3, string: 2, fret: 2, fullNote: 'E3' }
    ],
    tags: ['advanced', 'leaps', 'octaves']
  }
];
