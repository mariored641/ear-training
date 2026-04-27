/**
 * Famous chord progressions — used by F4 (recognize known progression).
 * Stored in C major / A minor — transpose at runtime for display.
 */

export const KNOWN_PROGRESSIONS = [
  // ── Level 1 pool (2 progressions) ────────────────────────────────────────
  {
    id: 'folk_basic',
    name: 'I–IV–V (עממי)',
    chords: ['C', 'F', 'G'],
    degrees: ['I', 'IV', 'V'],
    mode: 'major',
    examples: ['Twist and Shout', 'La Bamba', 'Johnny B. Goode'],
    difficulty: 1
  },
  {
    id: 'pop_classic',
    name: 'I–V–vi–IV (פופ קלאסי)',
    chords: ['C', 'G', 'Am', 'F'],
    degrees: ['I', 'V', 'vi', 'IV'],
    mode: 'major',
    examples: ["Don't Stop Believin'", 'Let It Be', 'Someone Like You'],
    difficulty: 1
  },

  // ── Level 2 additions (4 total) ─────────────────────────────────────────
  {
    id: 'pop_50s',
    name: 'I–vi–IV–V (50s)',
    chords: ['C', 'Am', 'F', 'G'],
    degrees: ['I', 'vi', 'IV', 'V'],
    mode: 'major',
    examples: ['Stand By Me', 'Earth Angel'],
    difficulty: 1
  },
  {
    id: 'rock_IVV',
    name: 'I–V–IV (רוק)',
    chords: ['C', 'G', 'F'],
    degrees: ['I', 'V', 'IV'],
    mode: 'major',
    examples: ['Louie Louie', 'Wild Thing'],
    difficulty: 2
  },

  // ── Level 3 additions (6-8 total) ───────────────────────────────────────
  {
    id: 'minor_pop',
    name: 'i–VI–III–VII (מינור פופ)',
    chords: ['Am', 'F', 'C', 'G'],
    degrees: ['i', 'VI', 'III', 'VII'],
    mode: 'minor',
    examples: ['Save Tonight', 'Numb'],
    difficulty: 1
  },
  {
    id: 'andalusian',
    name: 'i–VII–VI–V (אנדלוסי)',
    chords: ['Am', 'G', 'F', 'E'],
    degrees: ['i', 'VII', 'VI', 'V'],
    mode: 'minor',
    examples: ['Hit The Road Jack', 'Stray Cat Strut'],
    difficulty: 2
  },
  {
    id: 'bVI_bVII_I',
    name: '♭VI–♭VII–I (אקורדים שאולים)',
    chords: ['Ab', 'Bb', 'C'],
    degrees: ['♭VI', '♭VII', 'I'],
    mode: 'major',
    examples: ['Living on a Prayer', "Sweet Child O' Mine"],
    difficulty: 3
  },

  // ── Level 4 additions (jazz) ────────────────────────────────────────────
  {
    id: 'jazz_251',
    name: 'ii–V–I (ג\'אז)',
    chords: ['Dm7', 'G7', 'CMaj7'],
    degrees: ['ii7', 'V7', 'IMaj7'],
    mode: 'major',
    examples: ['Autumn Leaves', 'All The Things You Are'],
    difficulty: 2
  },
  {
    id: 'rhythm_changes_a',
    name: 'Rhythm Changes (A)',
    chords: ['C', 'Am', 'Dm', 'G', 'C', 'Am', 'Dm', 'G'],
    degrees: ['I', 'vi', 'ii', 'V', 'I', 'vi', 'ii', 'V'],
    mode: 'major',
    examples: ["I Got Rhythm", 'Oleo'],
    difficulty: 3
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

  // ── Bonus (appear from level 5 onward) ─────────────────────────────────
  {
    id: 'canon',
    name: 'Canon (I–V–vi–iii–IV–I–IV–V)',
    chords: ['C', 'G', 'Am', 'Em', 'F', 'C', 'F', 'G'],
    degrees: ['I', 'V', 'vi', 'iii', 'IV', 'I', 'IV', 'V'],
    mode: 'major',
    examples: ['Canon in D', 'Basket Case'],
    difficulty: 2
  },
  {
    id: 'circle',
    name: 'Circle — vi–ii–V–I',
    chords: ['Am', 'Dm', 'G', 'C'],
    degrees: ['vi', 'ii', 'V', 'I'],
    mode: 'major',
    examples: ['Fly Me To The Moon'],
    difficulty: 2
  },
];

// IDs that belong to each level pool
const POOL_IDS = {
  1: ['folk_basic', 'pop_classic'],
  2: ['folk_basic', 'pop_classic', 'pop_50s', 'rock_IVV'],
  3: ['folk_basic', 'pop_classic', 'pop_50s', 'rock_IVV', 'minor_pop', 'andalusian', 'bVI_bVII_I'],
  4: ['folk_basic', 'pop_classic', 'pop_50s', 'rock_IVV', 'minor_pop', 'andalusian', 'bVI_bVII_I', 'jazz_251', 'rhythm_changes_a', 'blues_basic'],
};

export const PROGRESSIONS_BY_DIFFICULTY = (level) => {
  if (level <= 4) {
    const ids = POOL_IDS[level] || POOL_IDS[4];
    return KNOWN_PROGRESSIONS.filter(p => ids.includes(p.id));
  }
  return KNOWN_PROGRESSIONS;
};
