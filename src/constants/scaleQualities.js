/**
 * Scale categorization for M3 (scale identification).
 * Lightweight metadata wrapper around allScalesData.
 */

// Intervals (semitones from root) for each scale used in M3.
export const SCALE_INTERVALS = {
  major:           [0, 2, 4, 5, 7, 9, 11],
  naturalMinor:    [0, 2, 3, 5, 7, 8, 10],
  harmonicMinor:   [0, 2, 3, 5, 7, 8, 11],
  melodicMinor:    [0, 2, 3, 5, 7, 9, 11],
  ionian:          [0, 2, 4, 5, 7, 9, 11],
  dorian:          [0, 2, 3, 5, 7, 9, 10],
  phrygian:        [0, 1, 3, 5, 7, 8, 10],
  lydian:          [0, 2, 4, 6, 7, 9, 11],
  mixolydian:      [0, 2, 4, 5, 7, 9, 10],
  aeolian:         [0, 2, 3, 5, 7, 8, 10],
  locrian:         [0, 1, 3, 5, 6, 8, 10],
  majorPentatonic: [0, 2, 4, 7, 9],
  minorPentatonic: [0, 3, 5, 7, 10],
  blues:           [0, 3, 5, 6, 7, 10],
  bebopMajor:      [0, 2, 4, 5, 7, 8, 9, 11],
  bebopDominant:   [0, 2, 4, 5, 7, 9, 10, 11],
  altered:         [0, 1, 3, 4, 6, 8, 10],
  lydianDominant:  [0, 2, 4, 6, 7, 9, 10],
  wholeTone:       [0, 2, 4, 6, 8, 10],
  diminishedHW:    [0, 1, 3, 4, 6, 7, 9, 10],
  diminishedWH:    [0, 2, 3, 5, 6, 8, 9, 11],
  chromatic:       [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
};

export const SCALE_GROUPS = {
  diatonic: {
    label: 'דיאטוני',
    scales: ['major', 'naturalMinor', 'harmonicMinor', 'melodicMinor']
  },
  modes: {
    label: 'מודוסים',
    scales: ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian']
  },
  pentatonic: {
    label: 'פנטטוני / בלוז',
    scales: ['majorPentatonic', 'minorPentatonic', 'blues']
  },
  jazz: {
    label: "ג'אז",
    scales: ['bebopMajor', 'bebopDominant', 'altered', 'lydianDominant']
  },
  symmetric: {
    label: 'סימטריים',
    scales: ['wholeTone', 'diminishedHW', 'diminishedWH', 'chromatic']
  }
};

// Scales by difficulty level (M3 stages 1-7).
export const SCALES_BY_LEVEL = {
  1: ['major', 'naturalMinor'],
  2: ['major', 'naturalMinor', 'harmonicMinor', 'melodicMinor'],
  3: ['major', 'majorPentatonic', 'minorPentatonic', 'blues'],
  4: ['ionian', 'dorian', 'mixolydian', 'aeolian'],
  5: ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'],
  6: ['major', 'naturalMinor', 'harmonicMinor', 'bebopDominant', 'altered'],
  7: ['major', 'wholeTone', 'diminishedHW', 'diminishedWH', 'chromatic']
};

export const SCALE_HEBREW_NAMES = {
  major: 'מז\'ור',
  naturalMinor: 'מינור טבעי',
  harmonicMinor: 'מינור הרמוני',
  melodicMinor: 'מינור מלודי',
  ionian: 'יוני',
  dorian: 'דוריאני',
  phrygian: 'פריגי',
  lydian: 'לידי',
  mixolydian: 'מיקסולידי',
  aeolian: 'אאולי',
  locrian: 'לוקרי',
  majorPentatonic: 'פנטטוני מז\'ורי',
  minorPentatonic: 'פנטטוני מינורי',
  blues: 'בלוז',
  bebopMajor: 'בי-בופ מז\'ור',
  bebopDominant: 'בי-בופ דומיננטי',
  altered: 'אלטרד',
  lydianDominant: 'לידי דומיננטי',
  wholeTone: 'טון שלם',
  diminishedHW: 'מוקטן (חצי-שלם)',
  diminishedWH: 'מוקטן (שלם-חצי)',
  chromatic: 'כרומטי'
};
