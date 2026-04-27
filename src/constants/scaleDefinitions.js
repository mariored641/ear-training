/**
 * Scale definitions — semitone offsets from the root.
 * Used by M3 (Scale ID), generators, and any scale-aware exercise.
 */

export const SCALE_DEFINITIONS = {
  // Diatonic
  major:           [0, 2, 4, 5, 7, 9, 11],
  natural_minor:   [0, 2, 3, 5, 7, 8, 10],
  harmonic_minor:  [0, 2, 3, 5, 7, 8, 11],
  melodic_minor:   [0, 2, 3, 5, 7, 9, 11],

  // Modes
  dorian:          [0, 2, 3, 5, 7, 9, 10],
  phrygian:        [0, 1, 3, 5, 7, 8, 10],
  lydian:          [0, 2, 4, 6, 7, 9, 11],
  mixolydian:      [0, 2, 4, 5, 7, 9, 10],
  locrian:         [0, 1, 3, 5, 6, 8, 10],

  // Jazz
  lydian_dominant: [0, 2, 4, 6, 7, 9, 10],
  altered:         [0, 1, 3, 4, 6, 8, 10],
  bebop_dominant:  [0, 2, 4, 5, 7, 9, 10, 11],

  // Pentatonic + blues
  pentatonic_major: [0, 2, 4, 7, 9],
  pentatonic_minor: [0, 3, 5, 7, 10],
  blues:           [0, 3, 5, 6, 7, 10],

  // Symmetric
  diminished_wh:   [0, 2, 3, 5, 6, 8, 9, 11],
  diminished_hw:   [0, 1, 3, 4, 6, 7, 9, 10],
  whole_tone:      [0, 2, 4, 6, 8, 10]
};

export const SCALE_NAMES_HEBREW = {
  major: 'מז\'ור',
  natural_minor: 'מינור טבעי',
  harmonic_minor: 'מינור הרמוני',
  melodic_minor: 'מינור מלודי',
  dorian: 'דוריאן',
  phrygian: 'פריגיאן',
  lydian: 'לידיאן',
  mixolydian: 'מיקסולידיאן',
  locrian: 'לוקריאן',
  lydian_dominant: 'לידי דומינאנטי',
  altered: 'Altered',
  bebop_dominant: 'Bebop דומינאנטי',
  pentatonic_major: 'פנטטוני מז\'ור',
  pentatonic_minor: 'פנטטוני מינור',
  blues: 'בלוז',
  diminished_wh: 'דימינישד W-H',
  diminished_hw: 'דימינישד H-W',
  whole_tone: 'Whole Tone'
};

const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

/** Build the scale notes (with octave) from root + scale id. */
export function buildScale(scaleId, root = 'C', startOctave = 4) {
  const intervals = SCALE_DEFINITIONS[scaleId];
  if (!intervals) return [];
  const rootIdx = NOTE_NAMES.indexOf(root);
  if (rootIdx < 0) return [];
  return intervals.map(semi => {
    const totalSemis = rootIdx + semi;
    const note = NOTE_NAMES[totalSemis % 12];
    const oct = startOctave + Math.floor(totalSemis / 12);
    return `${note}${oct}`;
  });
}

/** Scale grouping per M3 levels. */
export const M3_LEVEL_SCALES = {
  1: ['major', 'natural_minor'],
  2: ['natural_minor', 'harmonic_minor', 'melodic_minor'],
  3: ['major', 'natural_minor', 'harmonic_minor', 'melodic_minor'],
  4: ['dorian', 'phrygian', 'lydian', 'mixolydian'],
  5: ['major', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'natural_minor', 'locrian'],
  6: ['lydian_dominant', 'altered', 'bebop_dominant'],
  7: ['pentatonic_major', 'pentatonic_minor', 'blues'],
  8: ['diminished_wh', 'diminished_hw', 'whole_tone'],
  9: Object.keys(SCALE_DEFINITIONS)
};
