/**
 * Famous chord progressions — used by F4 (recognize known progression).
 * Stored in C major / A minor — transpose at runtime.
 */

export const KNOWN_PROGRESSIONS = [
  {
    id: 'pop_classic',
    name: 'Pop Classic — I V vi IV',
    chords: ['C', 'G', 'Am', 'F'],
    degrees: ['I', 'V', 'vi', 'IV'],
    mode: 'major',
    examples: ["Don't Stop Believin'", "Let It Be", "Someone Like You"],
    difficulty: 1
  },
  {
    id: 'pop_50s',
    name: '50s — I vi IV V',
    chords: ['C', 'Am', 'F', 'G'],
    degrees: ['I', 'vi', 'IV', 'V'],
    mode: 'major',
    examples: ['Stand By Me', 'Earth Angel'],
    difficulty: 1
  },
  {
    id: 'blues_basic',
    name: '12-Bar Blues',
    chords: ['C7', 'C7', 'C7', 'C7', 'F7', 'F7', 'C7', 'C7', 'G7', 'F7', 'C7', 'G7'],
    degrees: ['I7', 'I7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'I7', 'V7', 'IV7', 'I7', 'V7'],
    mode: 'major',
    examples: ['Sweet Home Chicago', 'Pride and Joy'],
    difficulty: 2
  },
  {
    id: 'jazz_251',
    name: 'ii-V-I Jazz',
    chords: ['Dm7', 'G7', 'CMaj7'],
    degrees: ['ii7', 'V7', 'IMaj7'],
    mode: 'major',
    examples: ['Autumn Leaves', 'All The Things You Are'],
    difficulty: 2
  },
  {
    id: 'rhythm_changes_a',
    name: 'Rhythm Changes (A section)',
    chords: ['C', 'Am', 'Dm', 'G', 'C', 'Am', 'Dm', 'G'],
    degrees: ['I', 'vi', 'ii', 'V', 'I', 'vi', 'ii', 'V'],
    mode: 'major',
    examples: ["I Got Rhythm", 'Oleo'],
    difficulty: 3
  },
  {
    id: 'andalusian',
    name: 'Andalusian — i VII VI V',
    chords: ['Am', 'G', 'F', 'E'],
    degrees: ['i', 'VII', 'VI', 'V'],
    mode: 'minor',
    examples: ['Hit The Road Jack', 'Stray Cat Strut'],
    difficulty: 2
  },
  {
    id: 'minor_pop',
    name: 'Minor Pop — i VI III VII',
    chords: ['Am', 'F', 'C', 'G'],
    degrees: ['i', 'VI', 'III', 'VII'],
    mode: 'minor',
    examples: ['Save Tonight', 'Numb'],
    difficulty: 1
  },
  {
    id: 'canon',
    name: "Pachelbel's Canon",
    chords: ['C', 'G', 'Am', 'Em', 'F', 'C', 'F', 'G'],
    degrees: ['I', 'V', 'vi', 'iii', 'IV', 'I', 'IV', 'V'],
    mode: 'major',
    examples: ['Canon in D', 'Basket Case'],
    difficulty: 2
  },
  {
    id: 'doo_wop_minor',
    name: 'Minor Doo-Wop — i v VI VII',
    chords: ['Am', 'Em', 'F', 'G'],
    degrees: ['i', 'v', 'VI', 'VII'],
    mode: 'minor',
    examples: [],
    difficulty: 2
  },
  {
    id: 'circle',
    name: 'Circle of 5ths — vi ii V I',
    chords: ['Am', 'Dm', 'G', 'C'],
    degrees: ['vi', 'ii', 'V', 'I'],
    mode: 'major',
    examples: ['Fly Me To The Moon'],
    difficulty: 2
  }
];

export const PROGRESSIONS_BY_DIFFICULTY = (level) =>
  KNOWN_PROGRESSIONS.filter(p => p.difficulty <= level);
