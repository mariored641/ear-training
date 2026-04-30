// Centralized chord-type labels — Hebrew names vs musical notation.
// Used across all ear-training exercises to keep terminology consistent.

export const CHORD_TYPE_HEBREW = {
  major:       "מז'ור",
  minor:       'מינור',
  diminished:  'מוקטן',
  augmented:   'מוגדל',
  triad:       "מז'ור / מינור",
  seventh:     'אקורדי שביעי',
  maj7:        "מז'ור 7",
  m7:          'מינור 7',
  dom7:        'דומיננטה 7',
  halfDim:     'חצי מוקטן',
  dim7:        'מוקטן 7',
  sus2:        'sus2',
  sus4:        'sus4',
  add9:        'add9',
  maj9:        "מז'ור 9",
  nine:        '9',
  eleven:      '11',
  thirteen:    '13',
};

export const CHORD_TYPE_NOTATION = {
  major:       'Maj',
  minor:       'm',
  diminished:  'dim',
  augmented:   'aug',
  triad:       'Maj / m',
  seventh:     '7th',
  maj7:        'Maj7',
  m7:          'm7',
  dom7:        '7',
  halfDim:     'm7♭5',
  dim7:        'dim7',
  sus2:        'sus2',
  sus4:        'sus4',
  add9:        'add9',
  maj9:        'Maj9',
  nine:        '9',
  eleven:      '11',
  thirteen:    '13',
};

export const getChordLabel = (id, mode = 'hebrew') => {
  const map = mode === 'notation' ? CHORD_TYPE_NOTATION : CHORD_TYPE_HEBREW;
  return map[id] ?? id;
};

export const TERMINOLOGY_TOGGLE_OPTIONS = [
  { value: 'hebrew',   label: "מז'ור" },
  { value: 'notation', label: 'Maj' },
];
