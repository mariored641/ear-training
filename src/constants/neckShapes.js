/**
 * Named neck shapes ("positions") used by the "אלתור בהישג יד" lessons, defined as
 * exact string/fret cells. One definition feeds the Positions section, the live neck
 * in Backing Tracks and the video export.
 *
 * Strings are numbered 1 (high E) … 6 (low E), like the rest of the app.
 * Every shape is anchored to a key through its MAJOR root (relative major for minor
 * keys), so C major and A minor share the same physical shape.
 *
 *  - caged_*   : the five CAGED windows (same fret ranges as the Positions tab).
 *  - octave_*  : Mario's "octave positions" — three identical 2-string boxes stacked
 *                diagonally (+2 frets per string pair, +1 more across the B string).
 *                Cells copied verbatim from his diagram "octave position - AM (red)
 *                G7 (orange)" (guitarscientist.com/diagrams/poo7u47), drawn for
 *                C major / A minor.
 *  - nps3_*    : three-notes-per-string patterns, one starting on each scale degree
 *                of the major scale on the low E string (lesson 12 "fixed notes per string").
 */
import { CHROMATIC_SCALE, C_AM_POSITION_RANGES, MAJOR_SCALE_INTERVALS } from './positionData.js'

const FLAT_TO_SHARP = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#', Cb: 'B', Fb: 'E', 'E#': 'F', 'B#': 'C' }
export const toSharpName = (n) => FLAT_TO_SHARP[n] || n
const pc = (n) => {
  const i = CHROMATIC_SCALE.indexOf(toSharpName(n))
  return i < 0 ? null : (i - CHROMATIC_SCALE.indexOf('C') + 12) % 12  // 0 = C
}

/** Relative-major root of a key, in CHROMATIC_SCALE (sharp) spelling. */
export function majorRootOf(root, type = 'major') {
  const p = pc(root)
  if (p === null) return 'C'
  const major = type === 'minor' ? (p + 3) % 12 : p
  return CHROMATIC_SCALE[(CHROMATIC_SCALE.indexOf('C') + major) % 12]
}

// ── Octave positions (verbatim cells, C major / A minor) ─────────────────────
const OCTAVE_134 = [
  [6, 5], [6, 7], [6, 8], [5, 5], [5, 7], [5, 8],
  [4, 5], [4, 7], [4, 9], [4, 10], [3, 7], [3, 9], [3, 10],
  [2, 8], [2, 10], [2, 12], [2, 13], [1, 10], [1, 12], [1, 13],
]
const OCTAVE_124 = [
  [6, 7], [6, 8], [6, 10], [5, 7], [5, 8], [5, 10],
  [4, 7], [4, 9], [4, 10], [4, 12], [3, 9], [3, 10], [3, 12],
  [2, 10], [2, 12], [2, 13], [2, 15], [1, 12], [1, 13], [1, 15],
]
const unionCells = (...lists) => {
  const seen = new Map()
  for (const list of lists) for (const [s, f] of list) seen.set(`${s}-${f}`, [s, f])
  return [...seen.values()]
}
const OCTAVE_CELLS = {
  octave_134: OCTAVE_134,
  octave_124: OCTAVE_124,
  octave_hybrid: unionCells(OCTAVE_134, OCTAVE_124),
}

export const SHAPE_GROUPS = [
  { id: 'caged', shapes: ['caged_C', 'caged_A', 'caged_G', 'caged_E', 'caged_D'] },
  { id: 'octave', shapes: ['octave_134', 'octave_124', 'octave_hybrid'] },
  { id: 'nps3', shapes: ['nps3_1', 'nps3_2', 'nps3_3', 'nps3_4', 'nps3_5', 'nps3_6', 'nps3_7'] },
]
export const SHAPE_IDS = SHAPE_GROUPS.flatMap(g => g.shapes)
export const isShapeId = (id) => SHAPE_IDS.includes(id)
export const NON_CAGED_SHAPE_IDS = SHAPE_IDS.filter(id => !id.startsWith('caged_'))

/** Short label that needs no translation (fingering numbers / CAGED letter). */
export function shapeShortLabel(id) {
  if (id.startsWith('caged_')) return id.slice(6)
  if (id === 'octave_134') return '1-3-4'
  if (id === 'octave_124') return '1-2-4'
  if (id === 'octave_hybrid') return '1-3-4/1-2-4'
  if (id.startsWith('nps3_')) return id.slice(5)
  return id
}

// Open-string MIDI pitches, string 1 (high E) … 6 (low E).
const OPEN_MIDI = [64, 59, 55, 50, 45, 40]

function nps3Cells(degree, majorPc) {
  // Scale pitches (absolute MIDI) ascending from the chosen degree on the low E string.
  const startPc = (majorPc + MAJOR_SCALE_INTERVALS[degree - 1]) % 12
  const lowE = 4 // pitch class of E
  let pitch = OPEN_MIDI[5] + ((startPc - lowE + 12) % 12)
  const scale = new Set(MAJOR_SCALE_INTERVALS.map(i => (majorPc + i) % 12))
  const cells = []
  for (let string = 6; string >= 1; string--) {
    for (let n = 0; n < 3; n++) {
      while (!scale.has(pitch % 12)) pitch++
      cells.push([string, pitch - OPEN_MIDI[string - 1]])
      pitch++
    }
  }
  return cells
}

/**
 * Cells of `shapeId` placed for the key whose major root is `majorRoot`.
 * @returns {{ cells: Set<string>, list: Array<[number, number]>, fretStart: number, fretEnd: number } | null}
 *          cells are "string-fret" keys.
 */
export function shapeCells(shapeId, majorRoot = 'C') {
  const offset = pc(majorRoot) ?? 0
  let list = null

  if (shapeId?.startsWith('caged_')) {
    const base = C_AM_POSITION_RANGES[shapeId.slice(6)]
    if (!base) return null
    let start = base.fretStart + offset
    let end = base.fretEnd + offset
    if (end > 15 && start - 12 >= 0) { start -= 12; end -= 12 }
    list = []
    for (let string = 1; string <= 6; string++) for (let f = start; f <= end; f++) list.push([string, f])
  } else if (OCTAVE_CELLS[shapeId]) {
    const shift = ((offset + 5) % 12) - 5          // −5 … +6 keeps every cell on the neck
    list = OCTAVE_CELLS[shapeId].map(([s, f]) => [s, f + shift])
  } else if (shapeId?.startsWith('nps3_')) {
    const degree = Number(shapeId.slice(5))
    if (!(degree >= 1 && degree <= 7)) return null
    list = nps3Cells(degree, offset)
  } else {
    return null
  }

  const frets = list.map(([, f]) => f)
  return {
    list,
    cells: new Set(list.map(([s, f]) => `${s}-${f}`)),
    fretStart: Math.min(...frets),
    fretEnd: Math.max(...frets),
  }
}

// ── Several shapes on one neck (two-neck video layout, live neck combos) ──────
const PAIRS = [[6, 5], [4, 3], [2, 1]]
const pcOf = (n) => pc(n) ?? 0

/** Parse a stored shape value: one id or a comma-joined combo ("caged_C,caged_G,caged_D"). */
export function parseShapeIds(value) {
  const list = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : []
  const ids = [...new Set(list.map(s => String(s).trim()).filter(isShapeId))]
  return ids.slice(0, 5)
}

/** Combos offered in selects (CAGED split so the windows never overlap, octave pair). */
export const SHAPE_COMBOS = [
  ['caged_C', 'caged_G', 'caged_D'],
  ['caged_A', 'caged_E'],
  ['caged_G', 'caged_E'],
  ['octave_134', 'octave_124'],
]

/**
 * Cells + labelled frames for several shapes on one neck.
 * CAGED windows are laid out in neck order from the first one, so a combo such as
 * C·G·D never overlaps (frets 0–3 / 4–8 / 9–13 in C) whatever the key.
 * Frames: CAGED → one rectangle over all strings; octave / 3NPS → one per string pair.
 * @returns {{ list, cells:Set<string>, fretStart, fretEnd, frames: Array<{shapeId,label,fretStart,fretEnd,stringFrom,stringTo}> } | null}
 */
export function shapeSet(shapeIds, majorRoot = 'C', { near = null } = {}) {
  const ids = parseShapeIds(shapeIds)
  if (!ids.length) return null
  const offset = pcOf(majorRoot)
  // CAGED windows repeat every 12 frets: with `near` (a fret), use the octave closest to it.
  let cagedShift = 0
  if (near !== null && ids.some(id => id.startsWith('caged_'))) {
    const probe = shapeSet(ids.filter(id => id.startsWith('caged_')), majorRoot)
    const center = (probe.fretStart + probe.fretEnd) / 2
    for (const k of [-12, 12]) {
      if (probe.fretStart + k >= 0 && probe.fretEnd + k <= 24 && Math.abs(center + k - near) < Math.abs(center + cagedShift - near)) cagedShift = k
    }
  }
  const list = []
  const frames = []
  let firstStart = null
  let firstBase = null
  for (const id of ids) {
    if (id.startsWith('caged_')) {
      const base = C_AM_POSITION_RANGES[id.slice(6)]
      let start
      if (firstStart === null) {
        start = (base.fretStart + offset) % 12 + cagedShift
        firstStart = start; firstBase = base.fretStart
      } else {
        start = firstStart + ((base.fretStart - firstBase + 12) % 12)
      }
      const end = start + (base.fretEnd - base.fretStart)
      for (let s = 1; s <= 6; s++) for (let f = start; f <= end; f++) list.push([s, f])
      frames.push({ shapeId: id, label: id.slice(6), fretStart: start, fretEnd: end, stringFrom: 1, stringTo: 6 })
    } else {
      const shape = shapeCells(id, majorRoot)
      list.push(...shape.list)
      PAIRS.forEach(([lo, hi], i) => {
        const frets = shape.list.filter(([s]) => s === lo || s === hi).map(([, f]) => f)
        if (!frets.length) return
        frames.push({
          shapeId: id, label: i === 0 ? shapeShortLabel(id) : '',
          fretStart: Math.min(...frets), fretEnd: Math.max(...frets), stringFrom: hi, stringTo: lo,
        })
      })
    }
  }
  const frets = list.map(([, f]) => f)
  const cells = new Set(list.map(([s, f]) => `${s}-${f}`))
  return { list, cells, fretStart: Math.min(...frets), fretEnd: Math.max(...frets), frames }
}

/** Pentatonic subset used to emphasise notes inside a full major/minor scale. */
export function pentatonicPcs(scaleRoot, minor) {
  const r = pcOf(scaleRoot)
  return new Set((minor ? [0, 3, 5, 7, 10] : [0, 2, 4, 7, 9]).map(i => (r + i) % 12))
}
export const noteToPc = pcOf
