/**
 * ChordTheoryUtils.js — chord symbol → expected pitch-class set.
 *
 * Used by Test 2 (Chord Coverage) to verify that notes the engine plays
 * for a given chord actually belong to that chord.
 *
 * Reuses the chord intervals defined in YamChordMap.js so we are checking
 * against the same definitions the engine uses internally.
 */

import { CHORD_DATA, NOTE_PITCHES } from '../../../lib/style-engine/YamChordMap.js'
import { parseChordSymbol } from '../../../lib/style-engine/ChordEngine.js'

/**
 * Return a Set of pitch classes (0–11) that belong to the chord.
 * Chord-tones only (root, 3rd, 5th, 7th, plus any extensions in the YamChord
 * definition). Used as the strict-acceptance set for the BASS instrument.
 */
export function chordSymbolToPitchClassSet(symbol) {
  const { rootPitch, typeName } = parseChordSymbol(symbol)
  const data = CHORD_DATA[typeName] || CHORD_DATA['Maj']
  const set = new Set()
  for (const interval of data.intervals) {
    set.add(((rootPitch + interval) % 12 + 12) % 12)
  }
  return set
}

/**
 * Return a wider Set that includes the chord's parent scale.
 * Used as the loose-acceptance set for chord/voice instruments — they often
 * play tensions (9, 11, 13) that aren't in the basic interval list.
 */
export function chordSymbolToScaleSet(symbol) {
  const { rootPitch, typeName } = parseChordSymbol(symbol)
  const data = CHORD_DATA[typeName] || CHORD_DATA['Maj']
  const scaleName = data.scale
  const intervals = SCALE_INTERVALS[scaleName] || SCALE_INTERVALS.IONIAN
  const set = new Set()
  for (const interval of intervals) {
    set.add(((rootPitch + interval) % 12 + 12) % 12)
  }
  for (const interval of data.intervals) {
    set.add(((rootPitch + interval) % 12 + 12) % 12)
  }
  return set
}

const SCALE_INTERVALS = {
  IONIAN:         [0, 2, 4, 5, 7, 9, 11],
  DORIAN:         [0, 2, 3, 5, 7, 9, 10],
  PHRYGIAN:       [0, 1, 3, 5, 7, 8, 10],
  LYDIAN:         [0, 2, 4, 6, 7, 9, 11],
  MIXOLYDIAN:     [0, 2, 4, 5, 7, 9, 10],
  AEOLIAN:        [0, 2, 3, 5, 7, 8, 10],
  LOCRIAN:        [0, 1, 3, 5, 6, 8, 10],
  HARMONIC_MINOR: [0, 2, 3, 5, 7, 8, 11],
  MELODIC_MINOR:  [0, 2, 3, 5, 7, 9, 11],
  WHOLE_TONE:     [0, 2, 4, 6, 8, 10],
  DIMINISHED:     [0, 2, 3, 5, 6, 8, 9, 11],
}

const PITCH_NAMES_DISPLAY = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B']

export function pitchClassName(pc) {
  return PITCH_NAMES_DISPLAY[((pc % 12) + 12) % 12]
}

export function midiToName(pitch) {
  const pc = ((pitch % 12) + 12) % 12
  const oct = Math.floor(pitch / 12) - 1
  return `${PITCH_NAMES_DISPLAY[pc]}${oct}`
}

/**
 * Return a human-readable string for a chord object {rootPitch, typeName}.
 * e.g. {rootPitch: 2, typeName: 'min7'} → "Dm7"
 */
export function chordObjectToSymbol(chord) {
  if (!chord) return '—'
  const root = PITCH_NAMES_DISPLAY[((chord.rootPitch % 12) + 12) % 12]
  const suffix = TYPE_TO_SUFFIX[chord.typeName] ?? chord.typeName
  return `${root}${suffix}`
}

const TYPE_TO_SUFFIX = {
  Maj: '', 'Maj7': 'maj7', 'Maj6': '6', 'Maj(9)': 'add9', 'Maj7(9)': 'maj9',
  'Maj6(9)': '6/9', 'Maj7#11': 'maj7♯11',
  min: 'm', 'min7': 'm7', 'min6': 'm6', 'min(9)': 'madd9',
  'min7(9)': 'm9', 'min7(11)': 'm11', 'minMaj7': 'm(maj7)', 'minMaj7(9)': 'm(maj9)',
  '7th': '7', '7(9)': '9', '7(13)': '13', '7(b9)': '7♭9', '7(#9)': '7♯9',
  '7(b13)': '7♭13', '7#11': '7♯11', '7b5': '7♭5', '7sus4': '7sus', '7aug': '7♯5',
  'Maj7aug': 'maj7♯5',
  dim: '°', dim7: '°7', m7b5: 'ø7',
  aug: '+',
  'sus4': 'sus', '1+5': '5', '1+8': '(oct)', '1+2+5': 'sus2',
}
