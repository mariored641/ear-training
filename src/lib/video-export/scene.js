/**
 * Turns the live playback state into the data renderFrame.drawFrame needs.
 * Pure: formatting helpers are injected so this runs under node:test.
 */
import { buildNeckModel, viewShape, viewFretRange } from './neckModel.js'
import { shapeShortLabel } from '../../constants/neckShapes.js'
import { locateChord, viewsForRepetition, sanitizeView, normalizeFretRange } from './exportPlan.js'

const FALLBACK_VIEW = sanitizeView({ displayMode: 'notes' })

/**
 * @param {object} p
 * @param {object} p.live      { isPlaying, currentBar, currentBeat, loopCount, playbackPhase, chords, beatsPerBar }
 * @param {object} p.settings  sanitized export settings (repetitions, rotateEvery, views)
 * @param {object} p.meta      { styleName, keyLabel, tempo }
 * @param {object} p.labels    translated strings
 * @param {object} p.deps      { chordSymbol(chord) → ascii symbol, pretty(symbol) → display, noteLabel(note), scaleName(id), shapeName?(id) }
 */
export function buildScene({ live, settings, meta, labels, deps }) {
  const chords = live.chords || []
  const bpb = live.beatsPerBar || 4
  const views = settings.views.length ? settings.views : [FALLBACK_VIEW]
  const phase = live.playbackPhase === 'intro' ? 'intro' : live.playbackPhase === 'ending' ? 'ending' : 'main'
  const repIndex = Math.min(Math.max(0, live.loopCount || 0), settings.repetitions - 1)
  const { group, groupCount, indices } = viewsForRepetition(repIndex, { ...settings, views })

  const bar = phase === 'intro' ? 0 : live.currentBar || 0
  const beat = live.currentBeat ?? null
  const { index, next } = phase === 'intro'
    ? { index: 0, next: chords.length > 1 ? 1 : 0 }
    : locateChord(chords, bpb, bar, beat ?? 0)
  const current = chords[index]
  const currentSymbol = current ? deps.chordSymbol(current) : null

  // Two necks share one fret range so the same fret sits at the same x on both.
  const shapes = []
  for (const i of indices) {
    const near = shapes.length && shapes[0] ? (shapes[0].fretStart + shapes[0].fretEnd) / 2 : null
    shapes.push(viewShape(views[i], near))
  }
  let range = null
  if (indices.length > 1) {
    const ranges = indices.map((i, k) => viewFretRange(views[i], shapes[k]))
    range = normalizeFretRange(Math.min(...ranges.map(r => r[0])), Math.max(...ranges.map(r => r[1])))
  }
  const necks = indices.map((i, k) => {
    const view = views[i]
    const neck = buildNeckModel(view, currentSymbol, { shape: shapes[k], range })
    return { neck, view, caption: neckCaption(neck, labels, deps) }
  })
  const first = necks[0]

  return {
    phase,
    repIndex,
    repetitions: settings.repetitions,
    chordLabel: current ? deps.pretty(currentSymbol) : '',
    nextLabel: chords[next] ? deps.pretty(deps.chordSymbol(chords[next])) : '',
    beat,
    beatsPerBar: bpb,
    chips: chords.map((c, i) => ({ label: deps.pretty(deps.chordSymbol(c)), active: i === index })),
    layout: necks.length > 1 ? 'dual' : 'single',
    necks,
    neck: first.neck,
    view: first.view,
    viewIndex: indices.length > 1 ? group : indices[0],
    viewCount: indices.length > 1 ? groupCount : views.length,
    viewCaption: first.caption,
    noteLabel: deps.noteLabel,
    info: { key: meta.keyLabel, bpm: meta.tempo },
    labels: { ...labels, style: meta.styleName },
  }
}

function neckCaption(neck, labels, deps) {
  const scaleLabel = neck.scaleId
    ? `${deps.noteLabel(neck.scaleRoot)} ${deps.scaleName(neck.scaleId)}`
    : labels.chordTones
  const ids = neck.shapeIds || []
  let shapeLabel = null
  if (ids.length === 1) shapeLabel = deps.shapeName ? deps.shapeName(ids[0]) : ids[0]
  else if (ids.length > 1) {
    const group = ids[0].split('_')[0]
    const prefix = deps.groupName ? deps.groupName(group) : group
    shapeLabel = `${prefix} ${ids.map(shapeShortLabel).join(' · ')}`
  }
  const emphasis = neck.emphasis && labels.pentatonicEmphasis ? `  ·  ${labels.pentatonicEmphasis}` : ''
  return shapeLabel
    ? `${shapeLabel}  ·  ${scaleLabel}${emphasis}`
    : `${scaleLabel}${emphasis}  ·  ${labels.frets} ${neck.fretStart}–${neck.fretEnd}`
}

/** 0..1 progress through the requested repetitions. */
export function progressFraction({ live, repetitions }) {
  if (live.playbackPhase === 'intro') return 0
  const chords = live.chords || []
  const bpb = live.beatsPerBar || 4
  const total = chords.reduce((s, c) => s + (c.beats ?? bpb), 0) || bpb
  const pos = (live.currentBar || 0) * bpb + (live.currentBeat || 0)
  const done = (live.loopCount || 0) * total + (live.loopCount >= repetitions ? 0 : pos)
  return Math.min(1, Math.max(0, done / (repetitions * total)))
}
