/**
 * Faster-than-real-time export of a lesson preset (batch tool for the "אלתור בהישג יד" videos).
 *
 * The real-time exporter (VideoExporter.js) records the canvas + the live synth while the track
 * plays. This module produces the same video content without waiting for playback:
 *   1. drives the real BackingTrackEngine state machine beat by beat (same intro / main parts /
 *      fills / ending, same note generation) and collects its note events on a timeline;
 *   2. renders the audio with a second, offline FluidSynth that has the same instrument packs,
 *      presets, reverb, master gain and channel volumes as the live player;
 *   3. renders one frame per beat with the same renderFrame/buildScene as the live export
 *      (the picture only changes on beats), each frame held until the next beat.
 * The caller (scripts/batch-export-lesson-videos.mjs) muxes frames + audio with ffmpeg.
 */
import { BackingTrackEngine } from '../style-engine/BackingTrackEngine.js'
import { loadStyleById } from '../style-engine/StyleLoader.js'
import { PRESETS as HUMAN_PRESETS } from '../style-engine/Humanizer.js'
import * as SFP from '../soundfont/SoundFontPlayer.js'
import {
  GENRE_CATALOG, presetsForGenre, channelProgramsForGenre, oldChordToSymbol, usedChannelsOfStyle,
  CHANNEL_KEY_TO_INDEX, DEFAULT_VOLUMES,
} from '../../components/backing-tracks/useBackingTrackEngine.js'
import { buildScene } from './scene.js'
import { drawFrame, createAssets } from './renderFrame.js'
import { sanitizeSettings, RESOLUTIONS } from './exportPlan.js'

export const TAIL_SEC = 1.5          // let the last notes ring out (live exporter waits ~0.9 s)
const MASTER_GAIN = 1.5              // same as useBackingTrackEngine.play()

/**
 * Drive an engine through `repetitions` loops of the progression plus its intro and ending,
 * beat by beat, without a clock. Mirrors useBackingTrackEngine's loop counting.
 * The ending is requested right before the boundary that would start repetition N+1, so the
 * video holds exactly N repetitions.
 * @returns {{ events: Array<{t, type:'on'|'off', channel, pitch, velocity?}>, beats: Array<{t, phase, loopCount, currentBar, currentBeat}>, endSec: number, beatSec: number }}
 */
export function driveOffline(engine, { tempo, beatsPerBar = 4, repetitions, maxSec = 20 * 60 }) {
  const beatSec = 60 / tempo
  const events = []
  const beats = []
  let phase = 'stopped'
  let loopCount = 0
  let lastLoopBeat = -1
  let currentBar = 0

  engine.onPhaseChange = ({ phase: p }) => { phase = p }
  engine.onChordChange = null
  engine._scheduleBeatNotes = function collect(partBeat) {
    for (const n of this._notesForBeat(partBeat)) {
      events.push({ t: n.onAt, type: 'on', channel: n.channel, pitch: n.pitch, velocity: n.velocity })
      if (n.offAt !== null) events.push({ t: n.offAt, type: 'off', channel: n.channel, pitch: n.pitch })
    }
  }
  let beatInfo = null
  engine.onBeat = ({ beat, loopBeat }) => { beatInfo = { beat, loopBeat } }

  engine._resetForPlay()
  for (let k = 0; ; k++) {
    const t = k * beatSec
    if (t > maxSec) throw new Error(`offline render exceeded ${maxSec}s`)
    if (engine._playbackPhase === 'main' && k - engine._introOffsetBeats === repetitions * engine._totalProgBeats) {
      engine._pendingStop = true
    }
    const beat = k % beatsPerBar
    const bar = Math.floor(k / beatsPerBar)
    engine._onScheduleBeat(beat, bar, t, beatSec)
    if (engine._playbackPhase === 'stopped') return { events, beats, endSec: t, beatSec }
    beatInfo = null
    engine._onBeat(beat, bar)
    if (beatInfo) {
      if (beatInfo.loopBeat >= 0) {
        currentBar = Math.floor(beatInfo.loopBeat / beatsPerBar)
        if (lastLoopBeat >= 0 && beatInfo.loopBeat < lastLoopBeat) loopCount++
        lastLoopBeat = beatInfo.loopBeat
      }
      beats.push({ t, phase, loopCount, currentBar, currentBeat: beatInfo.beat })
    }
  }
}

/** Load style, instruments and progression exactly like the app's Play button does. */
export async function prepareEngine({ genre, tempo, chords }) {
  const style = await loadStyleById(genre)
  const engine = new BackingTrackEngine()
  engine.setStyle(style)
  const human = GENRE_CATALOG.flatMap(c => c.subtypes).find(s => s.id === genre)?.human
  engine.setHumanizerConfig(HUMAN_PRESETS[human] ?? HUMAN_PRESETS.jazz)
  const beatsPerBar = parseInt(style.timeSignature) || 4
  await engine.init(() => {}, presetsForGenre(genre, style))
  const used = usedChannelsOfStyle(style)
  for (const [channel, program] of Object.entries(channelProgramsForGenre(genre))) {
    if (used && !used.has(Number(channel))) continue
    await SFP.programChange(Number(channel), program)
  }
  engine.setTempo(tempo)
  engine.setChordProgression(chords.map(c => ({ symbol: oldChordToSymbol(c), beats: c.beats ?? beatsPerBar })))
  engine.setSkipIntro(false)
  return { engine, style, beatsPerBar }
}

/**
 * Render the timeline's MIDI events to stereo float PCM with the offline synth.
 * Events are applied at their exact sample position.
 */
export async function renderAudio(events, durationSec, sampleRate = 48000) {
  const synth = await SFP.createOfflineSynth(sampleRate)
  synth.setGain(MASTER_GAIN)
  for (const [key, gain] of Object.entries(DEFAULT_VOLUMES)) {
    const channel = CHANNEL_KEY_TO_INDEX[key]
    if (channel !== undefined) synth.midiControl(channel, 7, Math.max(0, Math.min(127, Math.round(gain * 127))))
  }
  const total = Math.ceil(durationSec * sampleRate)
  const left = new Float32Array(total)
  const right = new Float32Array(total)
  // note-offs first at equal times, so a repeated note is re-struck cleanly
  const sorted = [...events].sort((a, b) => a.t - b.t || (a.type === 'off' ? -1 : 1) - (b.type === 'off' ? -1 : 1))
  let pos = 0
  const renderTo = (target) => {
    while (pos < target) {
      const end = Math.min(target, pos + 8192)
      synth.render([left.subarray(pos, end), right.subarray(pos, end)])
      pos = end
    }
  }
  for (const e of sorted) {
    renderTo(Math.min(total, Math.max(0, Math.round(e.t * sampleRate))))
    if (e.type === 'on') synth.midiNoteOn(e.channel, e.pitch, e.velocity)
    else synth.midiNoteOff(e.channel, e.pitch)
  }
  renderTo(total)
  try { synth.close() } catch { /* already closed */ }
  return { left, right, sampleRate }
}

/** 16-bit interleaved PCM (little endian) for WAV output. */
export function toPcm16(left, right) {
  const out = new Int16Array(left.length * 2)
  for (let i = 0; i < left.length; i++) {
    out[2 * i] = Math.max(-1, Math.min(1, left[i])) * 0x7fff
    out[2 * i + 1] = Math.max(-1, Math.min(1, right[i])) * 0x7fff
  }
  return out
}

/**
 * Full offline export of one preset. Frames and audio are handed to `sink` as they are made
 * so the page never holds a whole video in memory.
 * @param {object} preset    lessonPreset() result
 * @param {object} o         { labels, deps, styleName, logo, sink: { frame(i, dataUrl), audio(i, base64) }, sampleRate }
 * @returns {Promise<{ frames: Array<{ index, duration }>, endSec, durationSec, sampleRate, beats: number, events: number }>}
 */
export async function exportPresetOffline(preset, o) {
  const settings = sanitizeSettings({ ...preset.export, resolution: '720p' })
  const { engine, beatsPerBar } = await prepareEngine(preset)
  const { events, beats, endSec } = driveOffline(engine, {
    tempo: preset.tempo, beatsPerBar, repetitions: settings.repetitions,
  })
  const durationSec = endSec + TAIL_SEC

  // ── frames: one per beat (+ a final "stopped" frame for the tail) ──
  const [width, height] = RESOLUTIONS[settings.resolution]
  const makeCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c }
  const canvas = makeCanvas(width, height)
  const ctx = canvas.getContext('2d')
  const assets = createAssets({ logo: o.logo, makeCanvas })
  const meta = { styleName: o.styleName, keyLabel: preset.key.root + (preset.key.type === 'minor' ? 'm' : ''), tempo: preset.tempo, key: preset.key }
  const frames = []
  let lastScene = null
  for (let i = 0; i <= beats.length; i++) {
    const b = beats[i]
    const live = b
      ? { isPlaying: true, playbackPhase: b.phase, loopCount: b.loopCount, currentBar: b.currentBar, currentBeat: b.currentBeat, chords: preset.chords, beatsPerBar }
      : null
    const scene = live ? buildScene({ live, settings, meta, labels: o.labels, deps: o.deps }) : { ...lastScene, beat: null }
    lastScene = scene
    drawFrame(ctx, scene, assets, width, height)
    const start = b ? b.t : endSec
    const end = b ? (beats[i + 1]?.t ?? endSec) : durationSec
    await o.sink.frame(i, canvas.toDataURL('image/png'))
    frames.push({ index: i, duration: Math.max(0, end - start) })
  }

  // ── audio ──
  const { left, right, sampleRate } = await renderAudio(events, durationSec, o.sampleRate ?? 48000)
  const pcm = new Uint8Array(toPcm16(left, right).buffer)
  const CHUNK = 1 << 21
  for (let i = 0, n = 0; i < pcm.length; i += CHUNK, n++) {
    let bin = ''
    const part = pcm.subarray(i, i + CHUNK)
    for (let j = 0; j < part.length; j += 0x8000) bin += String.fromCharCode(...part.subarray(j, j + 0x8000))
    await o.sink.audio(n, btoa(bin))
  }
  engine._hardStop?.()
  return { frames, endSec, durationSec, sampleRate, beats: beats.length, events: events.length }
}
