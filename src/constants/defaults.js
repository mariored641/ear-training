export const DEFAULT_EXERCISE1_SETTINGS = {
  availableNotes: {
    C: true,
    'C#': true,
    D: true,
    'D#': true,
    E: true,
    F: true,
    'F#': true,
    G: true,
    'G#': true,
    A: true,
    'A#': true,
    B: true
  },
  octaveRange: 2,
  playC: 'everyTime',
  transition: 'auto',
  numQuestions: 10
};

export const DEFAULT_EXERCISE2_SETTINGS = {
  source: 'library',
  numNotes: 3,
  availableNotes: {
    C: true,
    'C#': true,
    D: true,
    'D#': true,
    E: true,
    F: true,
    'F#': true,
    G: true,
    'G#': true,
    A: true,
    'A#': true,
    B: true
  },
  octaveRange: 2,
  movement: 'mixed',
  frets: { from: 0, to: 12 },
  strings: {
    E: true,
    A: true,
    D: true,
    G: true,
    B: true,
    e: true
  },
  display: {
    noteNames: true,
    dots: true
  },
  marking: 'inOrder',
  help: {
    enabled: true,
    afterAttempts: 3
  },
  transition: 'auto',
  numQuestions: 10
};
