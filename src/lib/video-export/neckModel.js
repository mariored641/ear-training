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

const SHARP_KEYS = { major: ['G', 'D', 'A', 'E', 'B', 'F#', 'C#'], minor: ['E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#'] }
const FLAT_NAME = { 'A#': 'Bb', 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab' }
/** 'sharp' for sharp keys, else 'flat' (flat keys and C / Am — so a C7's b7 reads B♭, not A♯). */
export function spellingForKey(key) {
  if (!key?.root) return 'sharp'
  const root = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' }[key.root] || key.root
  return SHARP_KEYS[key.type === 'minor' ? 'minor' : 'major'].includes(root) ? 'sharp' : 'flat'
}
export const spellNote = (note, spelling) => (spelling === 'flat' && FLAT_NAME[note]) || note

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
 * @param {object} [opts] { shape: precomputed viewShape, range: [start, end] forced window (two necks share one),
 *                          keyScale: { scaleId, root } used when the view names no scale }
 * The working scale is ALWAYS drawn (Mario, round 3): a view without a scale falls back to the
 * track key's scale, so a neck can never show chord tones (or a pentatonic) alone.
 * @returns {{ fretStart, fretEnd, chordRoot, scaleRoot, scaleName, frames, dots: Array<{string, fret, note, role, degree, soft}> }}
 * role: 'chordRoot' | 'chordTone' | 'scale'; soft = scale note pushed to the background by the
 * emphasis ('arpeggio': every non-chord scale note; 'pentatonic': scale notes outside the pentatonic).
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

  const fallback = !ALL_SCALES_MAP[view?.scaleId] && opts.keyScale && ALL_SCALES_MAP[opts.keyScale.scaleId] ? opts.keyScale : null
  const scale = fallback ? ALL_SCALES_MAP[fallback.scaleId] : view?.scaleId ? ALL_SCALES_MAP[view.scaleId] ?? null : null
  const scaleRoot = fallback ? fallback.root : view?.root && view.root !== 'auto' ? view.root : chordRoot
  const scaleNotes = scale ? new Set(computeNotes(scaleRoot, scale.intervals)) : new Set()
  const labelRoot = scale ? scaleRoot : chordRoot
  const labelRootIdx = CHROMATIC_SCALE.indexOf(labelRoot)
  const pent = view?.emphasis === 'pentatonic' && scale
    ? pentatonicPcs(scaleRoot, scale.intervals.includes(3) && !scale.intervals.includes(4))
    : null
  const arpeggio = view?.emphasis === 'arpeggio' && scale && chordSymbol

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
      const soft = role === 'scale' && Boolean(arpeggio || (pent && !pent.has(noteToPc(note))))
      dots.push({ string, fret, note, name: spellNote(note, opts.spelling), role, degree, soft })
    }
  }
  return { fretStart, fretEnd, chordRoot, scaleRoot, scaleName: scale?.name ?? null, scaleId: scale?.id ?? null, shapeId: shape ? (view.shapeIds?.[0] ?? view.shapeId) : null,
    shapeIds: shape ? (view.shapeIds?.length ? view.shapeIds : [view.shapeId]) : [],
    frames: shape ? shape.frames.filter(f => f.fretEnd >= fretStart && f.fretStart <= fretEnd) : [],
    emphasis: pent ? 'pentatonic' : arpeggio ? 'arpeggio' : null,
    dots }
}
