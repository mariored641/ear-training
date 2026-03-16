/**
 * BackingTrackEngine.js — Main backing track engine facade (Stage 5)
 *
 * Connects all Stage 1-4 components into a single playback engine:
 *   SoundFontPlayer  ← audio output (FluidSynth WASM)
 *   BackingTrackClock ← Web Audio beat scheduler
 *   ChordEngine      ← Yamaha .sty pattern → adapted MIDI notes
 *   Humanizer        ← timing / velocity randomness
 *
 * Usage:
 *   import { BackingTrackEngine } from './BackingTrackEngine'
 *
 *   const engine = new BackingTrackEngine()
 *   await engine.init(onProgress)
 *
 *   engine.setStyle(parsedStyle)      // from StyleParser.parseSty()
 *   engine.setChordProgression([
 *     { symbol: 'Dm7', beats: 4 },
 *     { symbol: 'G7',  beats: 4 },
 *     { symbol: 'Cmaj7', beats: 8 },
 *   ])
 *
 *   engine.play()
 *   engine.stop()
 *
 * Callbacks:
 *   engine.onBeat        = ({ beat, bar, chord, loopBeat }) => ...
 *   engine.onChordChange = ({ from, to, bar, beat }) => ...
 */

import * as SFP from '../soundfont/SoundFontPlayer.js'
import { BackingTrackClock } from './BackingTrackClock.js'
import {
  generatePhrasesForChord,
  generatePhrasesForChordSequence,
  parseChordSymbol,
} from './ChordEngine.js'
import { humanizeNotes, DEFAULT_CONFIG } from './Humanizer.js'

// ─── AccType → SoundFontPlayer MIDI channel ───────────────────────────────────
// AccType names come from ChordEngine (BASS, CHORD1, RHYTHM, …)
// MIDI channel numbers match SFP.CHANNELS constants
const ACCTYPE_TO_CHANNEL = {
  RHYTHM:    9,   // SFP.CHANNELS.DRUMS  — channel 10 in 1-indexed MIDI
  SUBRHYTHM: 9,   // merged to drums
  BASS:      1,   // SFP.CHANNELS.BASS
  CHORD1:    0,   // SFP.CHANNELS.PIANO
  CHORD2:    2,   // SFP.CHANNELS.GUITAR
  PAD:       3,   // SFP.CHANNELS.PAD
  PHRASE1:   4,   // SFP.CHANNELS.MELODY
  PHRASE2:   4,   // merged to same melody channel
}

const DRUM_CHANNEL = 9

// ─────────────────────────────────────────────────────────────────────────────

export class BackingTrackEngine {
  constructor() {
    // State
    this._style          = null
    this._chordItems     = []    // [{ chord, startBeat, endBeat }, ...]
    this._totalProgBeats = 0
    this._partName       = 'Main_A'
    this._partSize       = 0
    this._beatsPerBar    = 4
    this._humanConfig    = DEFAULT_CONFIG

    // Runtime
    this._clock          = null
    this._noteTimers     = []
    this._partLoopCount  = 0
    this._lastChord      = null

    // Public callbacks
    this.onBeat        = null   // ({ beat, bar, chord, loopBeat }) → void
    this.onChordChange = null   // ({ from, to, bar, beat }) → void
  }

  // ── Initialization ─────────────────────────────────────────────────────────

  /**
   * Load the SoundFont. Call once before play().
   * @param {Function} onProgress (message: string, percent: number) => void
   */
  async init(onProgress) {
    await SFP.init(onProgress)
  }

  isReady() {
    return SFP.isReady()
  }

  // ── Configuration ──────────────────────────────────────────────────────────

  /**
   * Set the parsed Yamaha style (from StyleParser.parseSty()).
   * Reads tempo, time signature, and the active part size.
   */
  setStyle(style) {
    this._style = style

    const [num] = (style.timeSignature || '4/4').split('/').map(Number)
    this._beatsPerBar = num

    const part = style.parts[this._partName]
    if (part) this._partSize = part.sizeInBeats

    if (this._clock) this._clock.setTempo(style.tempo || 120)
  }

  /**
   * Choose which style part to loop (e.g. 'Main_A', 'Main_B').
   * Safe to call while playing — takes effect on next part boundary.
   */
  setActivePart(partName) {
    this._partName = partName
    const part = this._style?.parts[partName]
    if (part) this._partSize = part.sizeInBeats
  }

  /**
   * Set the chord progression to loop over.
   * @param {Array} progression  [{ symbol: 'Dm7', beats: 4 }, ...]
   */
  setChordProgression(progression) {
    let cursor = 0
    this._chordItems = progression.map(item => {
      const chord     = parseChordSymbol(item.symbol)
      const startBeat = cursor
      cursor += item.beats
      return { chord, startBeat, endBeat: cursor }
    })
    this._totalProgBeats = cursor
  }

  /** Override humanization config (use PRESETS.jazz etc. from Humanizer.js). */
  setHumanizerConfig(config) {
    this._humanConfig = config
  }

  /** Override tempo (updates live if playing). */
  setTempo(bpm) {
    if (this._clock) this._clock.setTempo(bpm)
    if (this._style) this._style.tempo = bpm
  }

  /** Set master output gain (0.0 – 10.0). */
  setGain(gain) {
    SFP.setGain(gain)
  }

  // ── Transport ──────────────────────────────────────────────────────────────

  async play() {
    if (!this._style) {
      console.warn('BackingTrackEngine.play(): no style set')
      return
    }
    if (this._chordItems.length === 0) {
      console.warn('BackingTrackEngine.play(): no chord progression set')
      return
    }
    if (!SFP.isReady()) {
      console.warn('BackingTrackEngine.play(): SoundFont not loaded')
      return
    }

    // Ensure AudioContext is running (browsers require a user gesture first)
    await SFP.resumeAudio()

    // Reset runtime state
    this._noteTimers    = []
    this._partLoopCount = 0
    this._lastChord     = null

    // Create clock
    const audioCtx = SFP.getAudioContext()
    this._clock = new BackingTrackClock(audioCtx)
    this._clock.setTempo(this._style.tempo || 120)
    this._clock.setTimeSignature(this._beatsPerBar)

    this._clock.onScheduleBeat = ({ beat, bar, audioTime, beatDuration }) => {
      this._onScheduleBeat(beat, bar, audioTime, beatDuration)
    }
    this._clock.onBeat = ({ beat, bar }) => {
      this._onBeat(beat, bar)
    }

    this._clock.start()
  }

  stop() {
    this._clock?.stop()
    this._clock = null

    // Cancel all pending note timers
    this._noteTimers.forEach(clearTimeout)
    this._noteTimers = []

    // Silence all channels
    SFP.allNotesOff()

    this._lastChord = null
  }

  get isPlaying() {
    return this._clock?.isRunning ?? false
  }

  // ── Internal — beat dispatch ───────────────────────────────────────────────

  _onScheduleBeat(beat, bar, audioTime, beatDuration) {
    if (!this._style || this._partSize === 0 || this._totalProgBeats === 0) return

    const progBeat = bar * this._beatsPerBar + beat
    const loopBeat = progBeat % this._totalProgBeats
    const partBeat = progBeat % this._partSize

    // Only generate notes at the start of each part window
    if (partBeat !== 0) return

    this._scheduleWindow(loopBeat, audioTime, beatDuration)
  }

  _onBeat(beat, bar) {
    if (this._totalProgBeats === 0) return

    const progBeat = bar * this._beatsPerBar + beat
    const loopBeat = progBeat % this._totalProgBeats
    const chord    = this._getChordAtBeat(loopBeat)

    // Detect chord change
    if (chord !== this._lastChord) {
      if (this._lastChord !== null) {
        this.onChordChange?.({ from: this._lastChord, to: chord, bar, beat })
      }
      this._lastChord = chord
    }

    this.onBeat?.({ beat, bar, chord, loopBeat })
  }

  // ── Internal — note generation and scheduling ──────────────────────────────

  _scheduleWindow(loopBeat, audioTime, beatDuration) {
    const part = this._style?.parts[this._partName]
    if (!part) return

    // Build chord list for this window (handles progression wrapping)
    const chordsInWindow = this._getChordsInWindow(loopBeat, this._partSize)
    if (chordsInWindow.length === 0) return

    // Generate adapted MIDI notes (ChordEngine)
    const loopIdx = this._partLoopCount++
    let phrases

    if (chordsInWindow.length === 1) {
      phrases = generatePhrasesForChord(
        this._style, this._partName, chordsInWindow[0], loopIdx
      )
    } else {
      phrases = generatePhrasesForChordSequence(
        this._style, this._partName, chordsInWindow, loopIdx
      )
    }

    // Apply humanizer
    const tempo     = this._style.tempo || 120
    const partSize  = this._partSize
    const humanConf = this._humanConfig
    // Drums: velocity humanization only (no timing drift)
    const drumsConf = { ...humanConf, timingRandomness: 0 }

    const humanized = {}
    for (const [accType, notes] of Object.entries(phrases)) {
      const conf = (accType === 'RHYTHM' || accType === 'SUBRHYTHM')
        ? drumsConf
        : humanConf
      humanized[accType] = humanizeNotes(notes, conf, tempo, partSize)
    }

    // Schedule noteOn / noteOff via setTimeout against audioContext time
    const now = SFP.getAudioContext().currentTime

    for (const [accType, notes] of Object.entries(humanized)) {
      const channel = ACCTYPE_TO_CHANNEL[accType]
      if (channel === undefined) continue

      for (const note of notes) {
        const noteOnAt  = audioTime + note.position * beatDuration
        const noteOffAt = noteOnAt  + note.duration * beatDuration

        const onDelay  = Math.max(0, (noteOnAt  - now) * 1000)
        const offDelay = Math.max(0, (noteOffAt - now) * 1000)

        const onId = setTimeout(
          () => SFP.noteOn(channel, note.pitch, note.velocity), onDelay
        )
        this._noteTimers.push(onId)

        // Drums don't need noteOff (GM percussion is self-decaying)
        if (channel !== DRUM_CHANNEL) {
          const offId = setTimeout(
            () => SFP.noteOff(channel, note.pitch), offDelay
          )
          this._noteTimers.push(offId)
        }
      }
    }

    // Prevent unbounded timer array growth
    if (this._noteTimers.length > 2000) {
      this._noteTimers = this._noteTimers.slice(-1000)
    }
  }

  // ── Internal — chord lookup ────────────────────────────────────────────────

  /**
   * Return the chord object active at loopBeat (0..totalProgBeats-1).
   */
  _getChordAtBeat(loopBeat) {
    for (const item of this._chordItems) {
      if (loopBeat >= item.startBeat && loopBeat < item.endBeat) {
        return item.chord
      }
    }
    return this._chordItems[0]?.chord ?? { rootPitch: 0, typeName: 'Maj' }
  }

  /**
   * Build a chord-sequence array for a style-part window starting at
   * loopBeat, covering windowSize beats.  Handles progression wrapping.
   *
   * Returns: [{ rootPitch, typeName, startBeat }, ...]
   *   startBeat = beats from the start of the window (0-indexed)
   */
  _getChordsInWindow(loopBeat, windowSize) {
    const total  = this._totalProgBeats
    const result = []
    let lastChord = null

    for (let b = 0; b < windowSize; b++) {
      const lb    = (loopBeat + b) % total
      const chord = this._getChordAtBeat(lb)

      if (chord !== lastChord) {
        result.push({ rootPitch: chord.rootPitch, typeName: chord.typeName, startBeat: b })
        lastChord = chord
      }
    }

    return result
  }
}
