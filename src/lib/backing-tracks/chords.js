// Chord building utilities for Backing Tracks

export const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export const QUALITY_SEMITONES = {
  major:      [0, 4, 7],
  minor:      [0, 3, 7],
  augmented:  [0, 4, 8],
  diminished: [0, 3, 6],
  halfDim:    [0, 3, 6, 10],
  minMaj7:    [0, 3, 7, 11],
  sus2:       [0, 2, 7],
  sus4:       [0, 5, 7],
}

export const EXTENSION_SEMITONE = {
  '7':    10, 'maj7': 11,
  '9':    14, 'b9':   13, '#9':   15,
  '11':   17, '#11':  18,
  '13':   21, 'b13':  20,
  'add9': 14, 'add11': 17,
}

export const QUALITY_SYMBOL = {
  major: '', minor: 'm', augmented: 'aug', diminished: 'dim',
  halfDim: 'ø', minMaj7: 'mMaj', sus2: 'sus2', sus4: 'sus4',
}

// Build an array of note strings like ['C4', 'E4', 'G4'] for a chord
export function buildChordNotes(chord, octave = 4) {
  const rootIdx = CHROMATIC.indexOf(chord.root)
  if (rootIdx === -1) return []
  const baseSemitones = QUALITY_SEMITONES[chord.quality] || [0, 4, 7]
  const extSemitones = (chord.extensions || []).map(e => EXTENSION_SEMITONE[e]).filter(v => v != null)
  const allSemitones = [...new Set([...baseSemitones, ...extSemitones])].sort((a, b) => a - b)

  return allSemitones.map(s => {
    const noteIdx = (rootIdx + s) % 12
    const noteOctave = octave + Math.floor((rootIdx + s) / 12)
    return `${CHROMATIC[noteIdx]}${noteOctave}`
  })
}

// Shell voicing: third + seventh (jazz comping)
export function shellVoicing(chord, octave = 4) {
  const notes = buildChordNotes(chord, octave)
  if (notes.length < 2) return notes
  return [notes[1], notes[notes.length - 1]].filter(Boolean)
}

// Power chord: root + fifth + octave (rock)
export function powerChordVoicing(chord, octave = 3) {
  const notesLow = buildChordNotes(chord, octave)
  const notesHigh = buildChordNotes(chord, octave + 1)
  const root = notesLow[0]
  const fifth = notesLow[2] || notesLow[1]
  const rootUp = notesHigh[0]
  return [root, fifth, rootUp].filter(Boolean)
}

// Dyad: root + fifth (blues)
export function dyadVoicing(chord, octave = 4) {
  const notes = buildChordNotes(chord, octave)
  return [notes[0], notes[2] || notes[1]].filter(Boolean)
}

// Get the bass note (root or slash note) at given octave
export function getBassNote(chord, octave = 2) {
  const root = chord.bassNote || chord.root
  const idx = CHROMATIC.indexOf(root)
  if (idx === -1) return `${chord.root}${octave}`
  return `${CHROMATIC[idx]}${octave}`
}

// Get the fifth of a chord at given octave
export function getFifthNote(chord, octave = 2) {
  const rootIdx = CHROMATIC.indexOf(chord.root)
  if (rootIdx === -1) return getBassNote(chord, octave)
  const semitones = QUALITY_SEMITONES[chord.quality] || [0, 4, 7]
  const fifthSemitone = semitones[2] != null ? semitones[2] : 7
  const fifthIdx = (rootIdx + fifthSemitone) % 12
  const noteOctave = octave + Math.floor((rootIdx + fifthSemitone) / 12)
  return `${CHROMATIC[fifthIdx]}${noteOctave}`
}

// Chromatic approach: half-step below root of next chord
export function getApproachNote(nextChord, octave = 2) {
  const rootIdx = CHROMATIC.indexOf(nextChord.root)
  if (rootIdx === -1) return `B${octave}`
  const approachIdx = (rootIdx - 1 + 12) % 12
  return `${CHROMATIC[approachIdx]}${octave}`
}

// Human-readable chord name: "Cm9", "G7#11", "D/F#"
export function chordDisplayName(chord) {
  const exts = (chord.extensions || []).join('')
  const name = `${chord.root}${QUALITY_SYMBOL[chord.quality] || ''}${exts}`
  return chord.bassNote ? `${name}/${chord.bassNote}` : name
}
