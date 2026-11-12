/**
 * Turns the live playback state into the data renderFrame.drawFrame needs.
 * Pure: formatting helpers are injected so this runs under node:test.
 */
import { buildNeckModel } from './neckModel.js'
import { locateChord, viewIndexForRepetition, sanitizeView } from './exportPlan.js'

const FALLBACK_VIEW = sanitizeView({ displayMode: 'notes' })

/**
 * @param {object} p
 * @param {object} p.live      { isPlaying, currentBar, currentBeat, loopCount, playbackPhase, chords, beatsPerBar }
 * @param {object} p.settings  sanitized export settings (repetitions, rotateEvery, views)
 * @param {object} p.meta      { styleName, keyLabel, tempo }
 * @param {object} p.labels    translated strings
 * @param {object} p.deps      { chordSymbol(chord) → ascii symbol, pretty(symbol) → display, noteLabel(note), scaleName(id) }
 */
export function buildScene({ live, settings, meta, labels, deps }) {
  const chords = live.chords || []
  const bpb = live.beatsPerBar || 4
  const views = settings.views.length ? settings.views : [FALLBACK_VIEW]
  const phase = live.playbackPhase === 'intro' ? 'intro' : live.playbackPhase === 'ending' ? 'ending' : 'main'
  const repIndex = Math.min(Math.max(0, live.loopCount || 0), settings.repetitions - 1)
  const viewIndex = viewIndexForRepetition(repIndex, settings.rotateEvery, views.length)
  const view = views[viewIndex]

  const bar = phase === 'intro' ? 0 : live.currentBar || 0
  const beat = live.currentBeat ?? null
  const { index, next } = phase === 'intro'
    ? { index: 0, next: chords.length > 1 ? 1 : 0 }
    : locateChord(chords, bpb, bar, beat ?? 0)
  const current = chords[index]
  const currentSymbol = current ? deps.chordSymbol(current) : null
  const neck = buildNeckModel(view, currentSymbol)

  const scaleLabel = neck.scaleId
    ? `${deps.noteLabel(neck.scaleRoot)} ${deps.scaleName(neck.scaleId)}`
    : labels.chordTones
  const viewCaption = `${scaleLabel}  ·  ${labels.frets} ${neck.fretStart}–${neck.fretEnd}`

  return {
    phase,
    repIndex,
    repetitions: settings.repetitions,
    chordLabel: current ? deps.pretty(currentSymbol) : '',
    nextLabel: chords[next] ? deps.pretty(deps.chordSymbol(chords[next])) : '',
    beat,
    beatsPerBar: bpb,
    chips: chords.map((c, i) => ({ label: deps.pretty(deps.chordSymbol(c)), active: i === index })),
    neck,
    view,
    viewIndex,
    viewCount: views.length,
    viewCaption,
    noteLabel: deps.noteLabel,
    info: { key: meta.keyLabel, bpm: meta.tempo },
    labels: { ...labels, style: meta.styleName },
  }
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
