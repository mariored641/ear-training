/**
 * YamChordMap.js — Yamaha chord type definitions
 *
 * Maps from YamChord type name (as stored in parsed .sty CTAB) to:
 *   - intervals: semitones from root (for fitting algorithms)
 *   - scale:     7-note modal scale for melody fitting
 *   - aliases:   user-facing chord suffix strings → YamChord name
 *
 * The 34 Yamaha chord types are ordered as in YamChord.java (index 0→33).
 * CRITICAL: this order matches the CTAB byte encoding (index = 0x21 - b1).
 */

// ─── Root note pitch map ────────────────────────────────────────────────────

export const NOTE_PITCHES = {
  'C': 0, 'C#': 1, 'Db': 1,
  'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4, 'Fb': 4,
  'F': 5, 'E#': 5, 'F#': 6, 'Gb': 6,
  'G': 7, 'G#': 8, 'Ab': 8,
  'A': 9, 'A#': 10, 'Bb': 10,
  'B': 11, 'Cb': 11,
}

export const PITCH_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']

// ─── Scale definitions ──────────────────────────────────────────────────────
// 7-note scales used for melody transposition (semitones from root)

export const SCALES = {
  IONIAN:          [0, 2, 4, 5, 7, 9, 11],  // major
  DORIAN:          [0, 2, 3, 5, 7, 9, 10],  // minor with nat6
  PHRYGIAN:        [0, 1, 3, 5, 7, 8, 10],
  LYDIAN:          [0, 2, 4, 6, 7, 9, 11],  // major with #4
  MIXOLYDIAN:      [0, 2, 4, 5, 7, 9, 10],  // dominant
  AEOLIAN:         [0, 2, 3, 5, 7, 8, 10],  // natural minor
  LOCRIAN:         [0, 1, 3, 5, 6, 8, 10],  // half-dim
  HARMONIC_MINOR:  [0, 2, 3, 5, 7, 8, 11],
  MELODIC_MINOR:   [0, 2, 3, 5, 7, 9, 11],  // ascending
  WHOLE_TONE:      [0, 2, 4, 6, 8, 10, 10], // approximation
  DIMINISHED:      [0, 2, 3, 5, 6, 8, 9],   // half-whole
}

// ─── Chord intervals + scale mapping ────────────────────────────────────────

/**
 * For each YamChord type:
 *   intervals: chord tone offsets (semitones from root)
 *   scale:     7-note scale key for melody fitting (from SCALES)
 */
export const CHORD_DATA = {
  // Index 0
  '1+2+5':      { intervals: [0, 2, 7],            scale: 'IONIAN' },
  // Index 1
  'sus4':        { intervals: [0, 5, 7],            scale: 'MIXOLYDIAN' },
  // Index 2
  '1+5':         { intervals: [0, 7],               scale: 'IONIAN' },
  // Index 3
  '1+8':         { intervals: [0, 12],              scale: 'IONIAN' },
  // Index 4  — 7#5 = 7aug (b7, maj3, aug5)
  '7aug':        { intervals: [0, 4, 8, 10],        scale: 'WHOLE_TONE' },
  // Index 5
  'Maj7aug':     { intervals: [0, 4, 8, 11],        scale: 'LYDIAN' },
  // Index 6  — 7#9 (Hendrix chord)
  '7(#9)':       { intervals: [0, 4, 7, 10, 3],     scale: 'MIXOLYDIAN' },
  // Index 7  — dom7 b13 = same as 7aug for voicing
  '7(b13)':      { intervals: [0, 4, 8, 10],        scale: 'MIXOLYDIAN' },
  // Index 8
  '7(b9)':       { intervals: [0, 4, 7, 10, 1],     scale: 'MIXOLYDIAN' },
  // Index 9
  '7(13)':       { intervals: [0, 4, 7, 10, 9],     scale: 'MIXOLYDIAN' },
  // Index 10
  '7#11':        { intervals: [0, 4, 7, 10, 6],     scale: 'LYDIAN' },
  // Index 11
  '7(9)':        { intervals: [0, 4, 7, 10, 2],     scale: 'MIXOLYDIAN' },
  // Index 12
  '7b5':         { intervals: [0, 4, 6, 10],        scale: 'MIXOLYDIAN' },
  // Index 13
  '7sus4':       { intervals: [0, 5, 7, 10],        scale: 'MIXOLYDIAN' },
  // Index 14
  '7th':         { intervals: [0, 4, 7, 10],        scale: 'MIXOLYDIAN' },
  // Index 15
  'dim7':        { intervals: [0, 3, 6, 9],         scale: 'DIMINISHED' },
  // Index 16
  'dim':         { intervals: [0, 3, 6],            scale: 'LOCRIAN' },
  // Index 17
  'minMaj7(9)':  { intervals: [0, 3, 7, 11, 2],     scale: 'MELODIC_MINOR' },
  // Index 18
  'minMaj7':     { intervals: [0, 3, 7, 11],        scale: 'MELODIC_MINOR' },
  // Index 19
  'min7(11)':    { intervals: [0, 3, 7, 10, 5],     scale: 'DORIAN' },
  // Index 20
  'min7(9)':     { intervals: [0, 3, 7, 10, 2],     scale: 'DORIAN' },
  // Index 21
  'min(9)':      { intervals: [0, 3, 7, 2],         scale: 'AEOLIAN' },
  // Index 22
  'm7b5':        { intervals: [0, 3, 6, 10],        scale: 'LOCRIAN' },
  // Index 23
  'min7':        { intervals: [0, 3, 7, 10],        scale: 'DORIAN' },
  // Index 24
  'min6':        { intervals: [0, 3, 7, 9],         scale: 'DORIAN' },
  // Index 25
  'min':         { intervals: [0, 3, 7],            scale: 'AEOLIAN' },
  // Index 26
  'aug':         { intervals: [0, 4, 8],            scale: 'WHOLE_TONE' },
  // Index 27
  'Maj6(9)':     { intervals: [0, 4, 7, 9, 2],      scale: 'IONIAN' },
  // Index 28
  'Maj7(9)':     { intervals: [0, 4, 7, 11, 2],     scale: 'LYDIAN' },
  // Index 29
  'Maj(9)':      { intervals: [0, 4, 7, 2],         scale: 'IONIAN' },
  // Index 30
  'Maj7#11':     { intervals: [0, 4, 7, 11, 6],     scale: 'LYDIAN' },
  // Index 31
  'Maj7':        { intervals: [0, 4, 7, 11],        scale: 'LYDIAN' },
  // Index 32
  'Maj6':        { intervals: [0, 4, 7, 9],         scale: 'IONIAN' },
  // Index 33
  'Maj':         { intervals: [0, 4, 7],            scale: 'IONIAN' },
}

/**
 * Get chord data for a YamChord type name.
 * Falls back to 'Maj' if not found.
 * @param {string} typeName
 * @returns {{ intervals: number[], scale: string }}
 */
export function getChordData(typeName) {
  return CHORD_DATA[typeName] || CHORD_DATA['Maj']
}

// ─── Alias lookup ────────────────────────────────────────────────────────────
// Maps user-facing chord suffix strings to YamChord names.
// Used by parseChordSymbol() in ChordEngine.

export const CHORD_ALIASES = {
  // Dominant 7ths
  '7':         '7th',
  'dom7':      '7th',
  '9':         '7(9)',
  '13':        '7(13)',
  '7b9':       '7(b9)',
  '7#9':       '7(#9)',
  '7#11':      '7#11',
  '7b5':       '7b5',
  '7sus':      '7sus4',
  '7sus4':     '7sus4',
  '9sus':      '7sus4',
  '13sus':     '7sus4',
  'alt':       '7aug',
  '7alt':      '7aug',
  '7#5':       '7aug',
  '9#5':       '7aug',
  '7b13':      '7(b13)',

  // Major
  '':          'Maj',
  'maj':       'Maj',
  'M':         'Maj',
  'maj6':      'Maj6',
  '6':         'Maj6',
  'maj7':      'Maj7',
  'M7':        'Maj7',
  'Δ':         'Maj7',
  'Δ7':        'Maj7',
  'maj9':      'Maj7(9)',
  'M9':        'Maj7(9)',
  'M13':       'Maj7(9)',
  'add9':      'Maj(9)',
  '69':        'Maj6(9)',
  'maj7#11':   'Maj7#11',
  'M7#11':     'Maj7#11',
  'M7b5':      'Maj7#11',
  'maj7aug':   'Maj7aug',
  'M7#5':      'Maj7aug',

  // Minor
  'm':         'min',
  'min':       'min',
  '-':         'min',
  'm6':        'min6',
  'min6':      'min6',
  'm7':        'min7',
  'min7':      'min7',
  '-7':        'min7',
  'm9':        'min7(9)',
  'min9':      'min7(9)',
  'min11':     'min7(11)',
  'm11':       'min7(11)',
  'madd9':     'min(9)',
  'm2':        'min(9)',
  'mmaj7':     'minMaj7',
  'mM7':       'minMaj7',
  'm7M':       'minMaj7',
  'minmaj7':   'minMaj7',
  'mmaj9':     'minMaj7(9)',
  'm7b5':      'm7b5',
  'ø':         'm7b5',
  'ø7':        'm7b5',
  'm9b5':      'm7b5',
  'm+':        'm7b5',

  // Diminished
  'dim':       'dim',
  'o':         'dim',
  'dim7':      'dim7',
  'o7':        'dim7',
  'dimM7':     'dim7',

  // Augmented
  'aug':       'aug',
  '+':         'aug',

  // Sus
  'sus':       'sus4',
  'sus4':      'sus4',
  'sus2':      '1+2+5',

  // Power chords
  '5':         '1+5',
  'pow':       '1+5',
}

/**
 * Parse a chord symbol string like 'Dm7', 'F#maj7', 'Bb13' into
 * { rootPitch: 0-11, typeName: YamChord name }.
 *
 * @param {string} chordStr
 * @returns {{ rootPitch: number, typeName: string }}
 */
export function parseChordSymbol(chordStr) {
  if (!chordStr) return { rootPitch: 0, typeName: 'Maj' }

  // Extract root note (1-2 chars)
  const rootMatch = chordStr.match(/^([A-G][b#]?)(.*)$/)
  if (!rootMatch) return { rootPitch: 0, typeName: 'Maj' }

  const rootStr = rootMatch[1]
  const typeStr = rootMatch[2]

  const rootPitch = NOTE_PITCHES[rootStr]
  if (rootPitch === undefined) return { rootPitch: 0, typeName: 'Maj' }

  // Look up chord type from aliases
  const typeName = CHORD_ALIASES[typeStr]
  if (typeName) return { rootPitch, typeName }

  // Try case-insensitive fallback
  const lc = typeStr.toLowerCase()
  for (const [alias, name] of Object.entries(CHORD_ALIASES)) {
    if (alias.toLowerCase() === lc) return { rootPitch, typeName: name }
  }

  // Unknown type — default to Maj
  console.warn(`YamChordMap: unknown chord type "${typeStr}" in "${chordStr}", defaulting to Maj`)
  return { rootPitch, typeName: 'Maj' }
}
