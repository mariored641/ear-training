// All scales and chords for the All Scales tab
// intervals: semitones from root, sorted ascending, starting with 0

export const NOTE_DISPLAY_LABELS = {
  'A': 'A', 'A#': 'A#/Bb', 'B': 'B', 'C': 'C', 'C#': 'C#/Db',
  'D': 'D', 'D#': 'D#/Eb', 'E': 'E', 'F': 'F', 'F#': 'F#/Gb',
  'G': 'G', 'G#': 'G#/Ab',
};

// Degree names for display (semitones 0–11 from root)
export const INTERVAL_NAMES = ['R', '♭2', '2', '♭3', '3', '4', '♭5', '5', '♭6', '6', '♭7', '7'];

export const SCALE_CATEGORIES = [
  {
    id: 'misc', label: 'Miscellaneous', type: 'scale',
    items: [
      { id: 'major_pent',           name: 'Major pentatonic',               intervals: [0, 2, 4, 7, 9] },
      { id: 'minor_pent',           name: 'Minor pentatonic',               intervals: [0, 3, 5, 7, 10] },
      { id: 'blues',                name: 'Blues scale',                    intervals: [0, 3, 5, 6, 7, 10] },
      { id: 'chromatic',            name: 'Chromatic',                      intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
      { id: 'whole_tone',           name: 'Whole tone',                     intervals: [0, 2, 4, 6, 8, 10] },
      { id: 'whole_tone_alt',       name: 'Whole tone alt.',                intervals: [0, 1, 3, 5, 7, 9, 11] },
      { id: 'whole_tone_ext',       name: 'Whole tone ext.',                intervals: [0, 2, 4, 6, 7, 8, 10] },
      { id: 'half_whole_dim',       name: 'Half Whole diminished',          intervals: [0, 1, 3, 4, 6, 7, 9, 10] },
      { id: 'half_whole_dim_ext',   name: 'Half Whole diminished ext.',     intervals: [0, 1, 2, 3, 4, 6, 7, 9, 10] },
      { id: 'whole_half_dim',       name: 'Whole Half diminished',          intervals: [0, 2, 3, 5, 6, 8, 9, 11] },
      { id: 'whole_half_dim_ext',   name: 'Whole Half diminished ext.',     intervals: [0, 1, 2, 3, 5, 6, 8, 9, 11] },
    ],
  },
  {
    id: 'major_modes', label: 'Major modes', type: 'scale',
    items: [
      { id: 'ionian',       name: 'Ionian (Major scale)',     intervals: [0, 2, 4, 5, 7, 9, 11] },
      { id: 'dorian',       name: 'Dorian',                   intervals: [0, 2, 3, 5, 7, 9, 10] },
      { id: 'phrygian',     name: 'Phrygian',                 intervals: [0, 1, 3, 5, 7, 8, 10] },
      { id: 'lydian',       name: 'Lydian',                   intervals: [0, 2, 4, 6, 7, 9, 11] },
      { id: 'mixolydian',   name: 'Mixolydian',               intervals: [0, 2, 4, 5, 7, 9, 10] },
      { id: 'aeolian',      name: 'Aeolian (Minor scale)',    intervals: [0, 2, 3, 5, 7, 8, 10] },
      { id: 'locrian',      name: 'Locrian',                  intervals: [0, 1, 3, 5, 6, 8, 10] },
    ],
  },
  {
    id: 'melodic_minor', label: 'Melodic minor modes', type: 'scale',
    items: [
      { id: 'melodic_minor',  name: 'Melodic Minor',                          intervals: [0, 2, 3, 5, 7, 9, 11] },
      { id: 'dorian_b9',      name: 'Dorian ♭9',                              intervals: [0, 1, 3, 5, 7, 9, 10] },
      { id: 'lydian_aug',     name: 'Lydian augmented',                       intervals: [0, 2, 4, 6, 8, 9, 11] },
      { id: 'lydian_dom',     name: 'Lydian dominant',                        intervals: [0, 2, 4, 6, 7, 9, 10] },
      { id: 'mixo_b13',       name: 'Mixolydian ♭13',                         intervals: [0, 2, 4, 5, 7, 8, 10] },
      { id: 'locrian_s2',     name: 'Locrian #2',                             intervals: [0, 2, 3, 5, 6, 8, 10] },
      { id: 'altered',        name: 'Super Locrian (Altered dominant scale)', intervals: [0, 1, 3, 4, 6, 8, 10] },
    ],
  },
  {
    id: 'harmonic_minor', label: 'Harmonic minor modes', type: 'scale',
    items: [
      { id: 'harmonic_minor',     name: 'Harmonic Minor',                         intervals: [0, 2, 3, 5, 7, 8, 11] },
      { id: 'locrian_13',         name: 'Locrian 13 (Half diminished)',           intervals: [0, 1, 3, 5, 6, 9, 10] },
      { id: 'ionian_s5',          name: 'Ionian #5 (Augmented)',                  intervals: [0, 2, 4, 5, 8, 9, 11] },
      { id: 'dorian_s4',          name: 'Dorian #4 (Ukrainian dorian)',           intervals: [0, 2, 3, 6, 7, 9, 10] },
      { id: 'phrygian_dom',       name: 'Phrygian dominant',                      intervals: [0, 1, 4, 5, 7, 8, 10] },
      { id: 'lydian_s2',          name: 'Lydian #2',                              intervals: [0, 3, 4, 6, 7, 9, 11] },
      { id: 'super_loc_bb7',      name: 'Super Locrian ♭♭7 (Diminished)',         intervals: [0, 1, 3, 4, 6, 8, 9] },
    ],
  },
  {
    id: 'bebop', label: 'Bebop', type: 'scale',
    items: [
      { id: 'bebop_dom',          name: 'Dominant (Mixolydian) bebop',    intervals: [0, 2, 4, 5, 7, 9, 10, 11] },
      { id: 'bebop_major',        name: 'Major bebop',                    intervals: [0, 2, 4, 5, 7, 8, 9, 11] },
      { id: 'bebop_dorian',       name: 'Dorian bebop',                   intervals: [0, 2, 3, 5, 7, 9, 10, 11] },
      { id: 'bebop_locrian',      name: 'Locrian bebop',                  intervals: [0, 1, 3, 5, 6, 8, 9, 10] },
      { id: 'bebop_phrygian_dom', name: 'Phrygian dominant bebop',        intervals: [0, 1, 4, 5, 7, 8, 9, 10] },
      { id: 'bebop_harmonic',     name: 'Harmonic minor bebop',           intervals: [0, 2, 3, 5, 7, 8, 10, 11] },
      { id: 'bebop_melodic',      name: 'Melodic minor bebop',            intervals: [0, 2, 3, 5, 7, 9, 10, 11] },
    ],
  },
  {
    id: 'exotic', label: 'Exotic', type: 'scale',
    items: [
      { id: 'arabian',            name: 'Arabian',                                    intervals: [0, 2, 4, 5, 6, 8, 10] },
      { id: 'persian',            name: 'Persian',                                    intervals: [0, 1, 4, 5, 6, 8, 11] },
      { id: 'byzantine',          name: 'Byzantine (Double harmonic)',                intervals: [0, 1, 4, 5, 7, 8, 11] },
      { id: 'egyptian',           name: 'Egyptian',                                   intervals: [0, 2, 5, 7, 10] },
      { id: 'oriental',           name: 'Oriental',                                   intervals: [0, 1, 4, 5, 6, 9, 10] },
      { id: 'hirajoshi',          name: 'Hirajoshi',                                  intervals: [0, 2, 3, 7, 8] },
      { id: 'in_scale',           name: 'In',                                         intervals: [0, 1, 5, 7, 8] },
      { id: 'insen',              name: 'Insen',                                      intervals: [0, 1, 5, 7, 10] },
      { id: 'iwato',              name: 'Iwato',                                      intervals: [0, 1, 5, 6, 10] },
      { id: 'yo',                 name: 'Yo',                                         intervals: [0, 2, 5, 7, 9] },
      { id: 'hungarian_minor',    name: 'Hungarian minor (Double harmonic minor)',    intervals: [0, 2, 3, 6, 7, 8, 11] },
      { id: 'neapolitan',         name: 'Neapolitan',                                 intervals: [0, 1, 3, 5, 7, 9, 11] },
      { id: 'tizita_major',       name: 'Tizita Major',                               intervals: [0, 2, 4, 7, 11] },
      { id: 'tizita_minor',       name: 'Tizita Minor',                               intervals: [0, 2, 3, 7, 10] },
      { id: 'bati_major',         name: 'Bati Major',                                 intervals: [0, 2, 5, 7, 9] },
      { id: 'bati_minor',         name: 'Bati Minor',                                 intervals: [0, 2, 3, 7, 8] },
      { id: 'bati_lydian',        name: 'Bati Lydian',                                intervals: [0, 2, 6, 7, 9] },
      { id: 'ambassel_major',     name: 'Ambassel Major',                             intervals: [0, 1, 5, 7, 9] },
      { id: 'ambassel_minor',     name: 'Ambassel Minor',                             intervals: [0, 1, 5, 7, 8] },
      { id: 'anchihoye_trad',     name: 'Anchihoye Traditional',                      intervals: [0, 1, 5, 7, 10] },
      { id: 'anchihoye_major',    name: 'Anchihoye Major',                            intervals: [0, 1, 5, 7, 11] },
      { id: 'anchihoye_minor',    name: 'Anchihoye Minor',                            intervals: [0, 1, 5, 6, 10] },
      { id: 'yematibela',         name: 'Yematibela Wef',                             intervals: [0, 2, 4, 5, 9] },
    ],
  },
];

export const CHORD_CATEGORIES = [
  {
    id: 'triads', label: 'Triads', type: 'chord',
    items: [
      { id: 'maj',            name: 'Major',           intervals: [0, 4, 7] },
      { id: 'min',            name: 'Minor',           intervals: [0, 3, 7] },
      { id: 'aug',            name: 'Augmented',       intervals: [0, 4, 8] },
      { id: 'dim',            name: 'Diminished',      intervals: [0, 3, 6] },
      { id: 'sus4',           name: 'Sus4',            intervals: [0, 5, 7] },
      { id: 'sus2',           name: 'Sus2',            intervals: [0, 2, 7] },
      { id: 'lydian_triad',   name: 'Lydian triad',    intervals: [0, 4, 6] },
      { id: 'phrygian_triad', name: 'Phrygian triad',  intervals: [0, 1, 7] },
    ],
  },
  {
    id: 'seventh', label: '7th chords', type: 'chord',
    items: [
      { id: 'maj7',     name: 'Major 7th',           intervals: [0, 4, 7, 11] },
      { id: 'min7',     name: 'Minor 7th',           intervals: [0, 3, 7, 10] },
      { id: 'dom7',     name: 'Dominant 7th',        intervals: [0, 4, 7, 10] },
      { id: 'half_dim', name: 'Half diminished 7th', intervals: [0, 3, 6, 10] },
      { id: 'dim7',     name: 'Diminished 7th',      intervals: [0, 3, 6, 9] },
      { id: '7sus4',    name: '7sus4',               intervals: [0, 5, 7, 10] },
      { id: 'maj7b5',   name: 'Major 7th ♭5',        intervals: [0, 4, 6, 11] },
      { id: 'maj7s5',   name: 'Major 7th #5',        intervals: [0, 4, 8, 11] },
      { id: 'min7b5',   name: 'Minor 7th ♭5',        intervals: [0, 3, 6, 10] },
      { id: 'min7s5',   name: 'Minor 7th #5',        intervals: [0, 3, 8, 10] },
      { id: 'dom7b5',   name: 'Dominant 7th ♭5',     intervals: [0, 4, 6, 10] },
      { id: 'dom7s5',   name: 'Dominant 7th #5',     intervals: [0, 4, 8, 10] },
    ],
  },
  {
    id: 'ninth', label: '9th chords', type: 'chord',
    items: [
      { id: 'maj9',       name: 'Major 9th',      intervals: [0, 2, 4, 7, 11] },
      { id: 'min9',       name: 'Minor 9th',      intervals: [0, 2, 3, 7, 10] },
      { id: 'dom9',       name: 'Dominant 9th',   intervals: [0, 2, 4, 7, 10] },
      { id: 'add9',       name: 'Add9',           intervals: [0, 2, 4, 7] },
      { id: 'min_add9',   name: 'Minor Add9',     intervals: [0, 2, 3, 7] },
      { id: '6add9',      name: '6Add9',          intervals: [0, 2, 4, 7, 9] },
      { id: 'min6add9',   name: 'Minor 6 Add9',   intervals: [0, 2, 3, 7, 9] },
    ],
  },
  {
    id: 'misc_chords', label: 'Miscellaneous chords', type: 'chord',
    items: [
      { id: 'min6',   name: 'Minor 6th',       intervals: [0, 3, 7, 9] },
      { id: 'maj6',   name: 'Major 6th',       intervals: [0, 4, 7, 9] },
      { id: 'maj11',  name: 'Major 11th',      intervals: [0, 2, 4, 5, 7, 11] },
      { id: 'min11',  name: 'Minor 11th',      intervals: [0, 2, 3, 5, 7, 10] },
      { id: 'dom11',  name: 'Dominant 11th',   intervals: [0, 2, 4, 5, 7, 10] },
      { id: 'maj13',  name: 'Major 13th',      intervals: [0, 2, 4, 5, 7, 9, 11] },
      { id: 'min13',  name: 'Minor 13th',      intervals: [0, 2, 3, 5, 7, 9, 10] },
      { id: 'dom13',  name: 'Dominant 13th',   intervals: [0, 2, 4, 5, 7, 9, 10] },
    ],
  },
];

// Flat lookup maps
export const ALL_SCALES_MAP = {};
export const ALL_CHORDS_MAP = {};
SCALE_CATEGORIES.forEach(cat => cat.items.forEach(item => { ALL_SCALES_MAP[item.id] = item; }));
CHORD_CATEGORIES.forEach(cat => cat.items.forEach(item => { ALL_CHORDS_MAP[item.id] = item; }));

export const ALL_SCALES_FLAT = SCALE_CATEGORIES.flatMap(cat => cat.items);
export const ALL_CHORDS_FLAT = CHORD_CATEGORIES.flatMap(cat => cat.items);

// Compute note names from root + intervals
export function computeNotes(root, intervals) {
  const CHROMATIC = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
  const rootIdx = CHROMATIC.indexOf(root);
  return intervals.map(i => CHROMATIC[(rootIdx + i) % 12]);
}

// Auto-detect which scale the active notes match (relative to root)
export function detectScale(noteClassesSet, root) {
  const CHROMATIC = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
  const rootIdx = CHROMATIC.indexOf(root);
  const intervals = [...noteClassesSet]
    .map(note => (CHROMATIC.indexOf(note) - rootIdx + 12) % 12)
    .sort((a, b) => a - b);
  const key = intervals.join(',');
  return ALL_SCALES_FLAT.find(s => s.intervals.join(',') === key)?.id ?? null;
}
