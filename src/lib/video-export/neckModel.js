/**
 * Pure model of what the exported neck shows for one chord + one neck view.
 * Mirrors LiveFretboard semantics: scale notes in grey, chord tones overlaid,
 * root follows the chord unless a fixed root is chosen.
 */
import { CHROMATIC_SCALE, STRING_TUNING } from '../../constants/positionData.js'
import { ALL_SCALES_MAP, computeNotes, INTERVAL_NAMES } from '../../constants/allScalesData.js'
import { parseChordSymbol, PITCH_NAMES, getChordData } from '../style-engine/YamChordMap.js'
import { normalizeFretRange } from './exportPlan.js'

const ENHARMONIC = { Eb: 'D#', Ab: 'G#', Bb: 'A#', Db: 'C#', Gb: 'F#' }
const toSharp = (n) => ENHARMONIC[n] || n

export function noteAt(stringNum, fret) {
  const open = CHROMATIC_SCALE.indexOf(STRING_TUNING[stringNum - 1])
  return CHROMATIC_SCALE[(open + fret) % 12]
}

/**
 * @returns {{ fretStart, fretEnd, chordRoot, scaleRoot, scaleName, dots: Array<{string, fret, note, role, label}> }}
 * role: 'chordRoot' | 'chordTone' | 'scale'. Strings are numbered 1 (high E) … 6 (low E).
 */
export function buildNeckModel(view, chordSymbol) {
  const [fretStart, fretEnd] = normalizeFretRange(view?.fretStart, view?.fretEnd)
  let rootPitch = 0
  let typeName = 'Maj'
  if (chordSymbol) ({ rootPitch, typeName } = parseChordSymbol(chordSymbol))
  const chordRoot = toSharp(PITCH_NAMES[rootPitch] ?? 'C')
  const chordNotes = chordSymbol
    ? new Set(computeNotes(chordRoot, getChordData(typeName).intervals))
    : new Set()

  const scale = view?.scaleId ? ALL_SCALES_MAP[view.scaleId] : null
  const scaleRoot = view?.root && view.root !== 'auto' ? view.root : chordRoot
  const scaleNotes = scale ? new Set(computeNotes(scaleRoot, scale.intervals)) : new Set()
  const labelRoot = scale ? scaleRoot : chordRoot
  const labelRootIdx = CHROMATIC_SCALE.indexOf(labelRoot)

  const dots = []
  for (let string = 1; string <= 6; string++) {
    for (let fret = fretStart; fret <= fretEnd; fret++) {
      const note = noteAt(string, fret)
      const isChord = chordNotes.has(note)
      const isScale = scaleNotes.has(note)
      if (!isChord && !isScale) continue
      const role = note === chordRoot && isChord ? 'chordRoot' : isChord ? 'chordTone' : 'scale'
      const degree = INTERVAL_NAMES[(CHROMATIC_SCALE.indexOf(note) - labelRootIdx + 12) % 12]
      dots.push({ string, fret, note, role, degree })
    }
  }
  return { fretStart, fretEnd, chordRoot, scaleRoot, scaleName: scale?.name ?? null, scaleId: scale?.id ?? null, dots }
}
