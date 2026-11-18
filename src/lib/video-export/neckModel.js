/**
 * Pure model of what the exported neck shows for one chord + one neck view.
 * Mirrors LiveFretboard semantics: scale notes in grey, chord tones overlaid,
 * root follows the chord unless a fixed root is chosen.
 */
import { CHROMATIC_SCALE, STRING_TUNING } from '../../constants/positionData.js'
import { ALL_SCALES_MAP, computeNotes, INTERVAL_NAMES } from '../../constants/allScalesData.js'
import { parseChordSymbol, PITCH_NAMES, getChordData } from '../style-engine/YamChordMap.js'
import { normalizeFretRange, MAX_FRET } from './exportPlan.js'
import { shapeSet, pentatonicPcs, noteToPc } from '../../constants/neckShapes.js'

const ENHARMONIC = { Eb: 'D#', Ab: 'G#', Bb: 'A#', Db: 'C#', Gb: 'F#' }
const toSharp = (n) => ENHARMONIC[n] || n

export function noteAt(stringNum, fret) {
  const open = CHROMATIC_SCALE.indexOf(STRING_TUNING[stringNum - 1])
  return CHROMATIC_SCALE[(open + fret) % 12]
}

/** Cells/frames of a view's lesson shapes (null when the view is a plain fret window). */
export function viewShape(view, near = null) {
  const ids = view?.shapeIds?.length ? view.shapeIds : view?.shapeId ? [view.shapeId] : []
  return ids.length ? shapeSet(ids, view.shapeKey || 'C', { near }) : null
}

/** Fret window of a view: its shapes ±1 fret, else its own range. */
export function viewFretRange(view, shape = viewShape(view)) {
  return shape
    ? normalizeFretRange(Math.max(0, shape.fretStart - 1), Math.min(MAX_FRET, shape.fretEnd + 1))
    : normalizeFretRange(view?.fretStart, view?.fretEnd)
}

/**
 * @param {object} [opts] { shape: precomputed viewShape, range: [start, end] forced window (two necks share one) }
 * @returns {{ fretStart, fretEnd, chordRoot, scaleRoot, scaleName, frames, dots: Array<{string, fret, note, role, degree, soft}> }}
 * role: 'chordRoot' | 'chordTone' | 'scale'; soft = scale note outside the emphasised pentatonic.
 * Strings are numbered 1 (high E) … 6 (low E).
 */
export function buildNeckModel(view, chordSymbol, opts = {}) {
  // Lesson shapes decide which cells may show a dot and the fret window (shape ±1 fret).
  const shape = opts.shape !== undefined ? opts.shape : viewShape(view)
  const [fretStart, fretEnd] = opts.range ?? viewFretRange(view, shape)
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
  const pent = view?.emphasis === 'pentatonic' && scale
    ? pentatonicPcs(scaleRoot, scale.intervals.includes(3) && !scale.intervals.includes(4))
    : null

  const dots = []
  for (let string = 1; string <= 6; string++) {
    for (let fret = fretStart; fret <= fretEnd; fret++) {
      if (shape && !shape.cells.has(`${string}-${fret}`)) continue
      const note = noteAt(string, fret)
      const isChord = chordNotes.has(note)
      const isScale = scaleNotes.has(note)
      if (!isChord && !isScale) continue
      const role = note === chordRoot && isChord ? 'chordRoot' : isChord ? 'chordTone' : 'scale'
      const degree = INTERVAL_NAMES[(CHROMATIC_SCALE.indexOf(note) - labelRootIdx + 12) % 12]
      const soft = Boolean(pent && role === 'scale' && !pent.has(noteToPc(note)))
      dots.push({ string, fret, note, role, degree, soft })
    }
  }
  return { fretStart, fretEnd, chordRoot, scaleRoot, scaleName: scale?.name ?? null, scaleId: scale?.id ?? null, shapeId: shape ? (view.shapeIds?.[0] ?? view.shapeId) : null,
    shapeIds: shape ? (view.shapeIds?.length ? view.shapeIds : [view.shapeId]) : [],
    frames: shape ? shape.frames.filter(f => f.fretEnd >= fretStart && f.fretStart <= fretEnd) : [],
    emphasis: pent ? 'pentatonic' : null,
    dots }
}
