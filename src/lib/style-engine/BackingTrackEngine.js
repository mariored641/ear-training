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
import {
  pickVariation, isFillOrBreak, getFillName,
  getTransitionFillName, getIntroName, getEndingName,
} from './VariationSelector.js'

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

    // Part cycling — progression-aligned
    this._mainPartIdx             = 0     // index into available main parts
    this._progressionLoopsPerPart = 2     // switch main part every N full progression loops
    this._progressionLoopCount    = 0     // how many complete prog loops on current main part
    this._pendingPartAdvance      = false // true after a fill plays, triggers advance next window
    this._windowStartProgBeat     = 0    // progBeat at which the current window started
    this._prevLoopBeat            = -1   // previous loopBeat, for detecting progression wrap

    // Playback phase state machine: 'stopped' | 'intro' | 'main' | 'fill' | 'ending'
    this._playbackPhase  = 'stopped'
    this._pendingStop    = false  // user pressed stop, waiting for ending
    this._skipIntro      = false  // skip style Intro part (when count-in is disabled)
    this._introOffsetBeats = 0   // progBeat at which the main section starts (after intro)

    // Mid-progression variation for long progressions (>8 bars)
    // Array of { startBeat, partName } segments, or null for short progressions
    this._midProgSegments = null

    // Runtime
    this._clock          = null
    this._noteTimers     = []
    this._partLoopCount  = 0
    this._lastChord      = null

    // Per-beat scheduling: notes are generated once per window,
    // then dispatched one beat at a time (fixes setTimeout jitter at seams).
    this._pendingNotes   = null  // { phrases, windowAudioTime, beatDuration }

    // Public callbacks
    this.onBeat        = null   // ({ beat, bar, chord, loopBeat }) → void
    this.onChordChange = null   // ({ from, to, bar, beat }) → void
    this.onPhaseChange = null   // ({ phase, partName }) → void
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
   * partSize is aligned to a multiple of beatsPerBar to prevent
   * window boundaries from drifting mid-bar.
   */
  setStyle(style) {
    this._style = style

    const [num] = (style.timeSignature || '4/4').split('/').map(Number)
    this._beatsPerBar = num

    // Reset part cycling to first available main part
    this._mainPartIdx = 0
    this._partName    = 'Main_A'
    const part = style.parts[this._partName]
    if (part) this._partSize = this._alignPartSize(part.sizeInBeats, num)

    if (this._clock) this._clock.setTempo(style.tempo || 120)
  }

  /**
   * Choose which style part to loop (e.g. 'Main_A', 'Main_B').
   * Safe to call while playing — takes effect on next part boundary.
   */
  setActivePart(partName) {
    this._partName = partName
    const part = this._style?.parts[partName]
    if (part) this._partSize = this._alignPartSize(part.sizeInBeats, this._beatsPerBar)
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

  /** Skip the style's Intro part on play() (when external count-in is used). */
  setSkipIntro(skip) {
    this._skipIntro = !!skip
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
    this._noteTimers              = []
    this._partLoopCount           = 0
    this._mainPartIdx             = 0
    this._pendingPartAdvance      = false
    this._windowStartProgBeat     = 0
    this._prevLoopBeat            = -1
    this._lastChord               = null
    this._pendingNotes            = null
    this._pendingStop             = false
    this._introOffsetBeats        = 0
    this._progressionLoopCount    = 0

    // Decide starting part: Intro if available (and not skipped), else Main_A
    const introName = this._skipIntro ? null : getIntroName('Main_A', this._style.parts)
    if (introName) {
      this._partName = introName
      this._partSize = this._alignPartSize(
        this._style.parts[introName].sizeInBeats, this._beatsPerBar
      )
      this._playbackPhase = 'intro'
    } else {
      this._partName = 'Main_A'
      const part = this._style.parts['Main_A']
      if (part) this._partSize = this._alignPartSize(part.sizeInBeats, this._beatsPerBar)
      this._playbackPhase = 'main'
      this._computeMidProgSegments('Main_A')
    }

    this._emitPhaseChange()

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

  /**
   * Stop playback.
   * @param {boolean} hard  If true, stop immediately. If false (default),
   *   wait for the current progression loop to end, play an Ending part
   *   (if available), then stop.
   */
  stop(hard = false) {
    if (hard || !this._clock) {
      this._hardStop()
      return
    }
    // Soft stop: flag it — the ending will play at the next progression boundary
    this._pendingStop = true
  }

  _hardStop() {
    this._clock?.stop()
    this._clock = null

    this._noteTimers.forEach(clearTimeout)
    this._noteTimers   = []
    this._pendingNotes = null
    this._playbackPhase = 'stopped'
    this._pendingStop   = false

    SFP.allNotesOff()

    this._lastChord = null
    this._emitPhaseChange()
  }

  get isPlaying() {
    return this._clock?.isRunning ?? false
  }

  // ── Internal — beat dispatch ───────────────────────────────────────────────

  _onScheduleBeat(beat, bar, audioTime, beatDuration) {
    if (!this._style || this._partSize === 0 || this._totalProgBeats === 0) return
    if (this._playbackPhase === 'stopped') return

    const progBeat = bar * this._beatsPerBar + beat

    // During intro, loopBeat is meaningless — use 0 as placeholder
    // After intro, offset by intro length so the progression starts at beat 0
    const effectiveBeat = progBeat - this._introOffsetBeats
    const loopBeat = this._playbackPhase === 'intro'
      ? 0
      : (effectiveBeat % this._totalProgBeats)

    // Detect progression-loop boundary (loopBeat wrapped back to 0)
    const isProgBoundary = (this._prevLoopBeat > loopBeat && effectiveBeat > 0 && this._playbackPhase !== 'intro')
    this._prevLoopBeat = loopBeat

    // partBeat: beats elapsed since the current window started.
    const partBeat = progBeat - this._windowStartProgBeat

    // ── Handle phase transitions at progression boundaries ──────────
    if (isProgBoundary && this._playbackPhase === 'main') {
      this._progressionLoopCount++

      // Soft stop requested → play ending
      if (this._pendingStop) {
        this._startEnding()
        // Fall through to generate the ending window below
      }
      // Time to advance to next Main part
      else if (this._progressionLoopCount >= this._progressionLoopsPerPart) {
        this._advanceMainPart()
        // If a fill was inserted, _playbackPhase is now 'fill'
        // and _pendingNotes will be regenerated below
      }
    }

    // ── Start a new window when the current one is complete ─────────
    if (this._pendingNotes === null || partBeat >= this._partSize) {

      // Intro just finished → transition to Main
      if (this._playbackPhase === 'intro' && this._pendingNotes !== null) {
        this._introOffsetBeats = progBeat  // offset so main starts at loopBeat 0
        this._partName = 'Main_A'
        const part = this._style.parts['Main_A']
        if (part) this._partSize = this._alignPartSize(part.sizeInBeats, this._beatsPerBar)
        this._playbackPhase = 'main'
        this._progressionLoopCount = 0
        this._computeMidProgSegments('Main_A')
        this._emitPhaseChange()
      }

      // Fill just finished → do the actual main-part advance
      if (this._pendingPartAdvance && this._playbackPhase === 'fill') {
        this._pendingPartAdvance = false
        this._doAdvanceMainPart()
      }

      // Ending just finished → hard stop
      if (this._playbackPhase === 'ending' && this._pendingNotes !== null) {
        this._hardStop()
        return
      }

      // Mid-progression variation: check if we need to switch part for this segment
      if (this._playbackPhase === 'main' && this._midProgSegments) {
        const segPart = this._getSegmentPartForBeat(loopBeat)
        if (segPart && segPart !== this._partName) {
          this._partName = segPart
          const part = this._style.parts[segPart]
          if (part) this._partSize = this._alignPartSize(part.sizeInBeats, this._beatsPerBar)
        }
      }

      this._windowStartProgBeat = progBeat
      this._pendingNotes = this._generateWindow(loopBeat, audioTime, beatDuration)
      this._partLoopCount++
    }

    // Schedule only the notes whose onset falls within this beat.
    if (this._pendingNotes) {
      this._scheduleBeatNotes(progBeat - this._windowStartProgBeat)
    }
  }

  _onBeat(beat, bar) {
    if (this._totalProgBeats === 0) return

    // During intro, signal the hook with loopBeat = -1 (no progression data)
    if (this._playbackPhase === 'intro') {
      this.onBeat?.({ beat, bar, chord: null, loopBeat: -1 })
      return
    }

    const progBeat = bar * this._beatsPerBar + beat
    const effectiveBeat = progBeat - this._introOffsetBeats
    const loopBeat = effectiveBeat % this._totalProgBeats
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

  // ── Internal — part cycling ────────────────────────────────────────────────

  /** Return ordered list of Main parts actually present in the current style. */
  _getAvailableMainParts() {
    if (!this._style) return ['Main_A']
    return ['Main_A', 'Main_B', 'Main_C', 'Main_D']
      .filter(p => (this._style.parts[p]?.sizeInBeats ?? 0) > 0)
  }

  /**
   * Advance to the next available main part (A→B→C→A…).
   * Inserts a transition fill before the advance if available.
   * Uses cross-fills (Fill_In_AB) when transitioning between different parts.
   */
  _advanceMainPart() {
    const parts = this._getAvailableMainParts()
    if (parts.length <= 1) {
      // Single main part — still insert a fill for variety, then restart
      const fillName = getFillName(this._partName)
      if (fillName && this._style.parts[fillName]?.sizeInBeats > 0) {
        this._partName = fillName
        this._partSize = this._alignPartSize(
          this._style.parts[fillName].sizeInBeats, this._beatsPerBar
        )
        this._playbackPhase = 'fill'
        this._pendingPartAdvance = true
        this._pendingNotes = null  // force new window
        this._emitPhaseChange()
      }
      this._progressionLoopCount = 0
      return
    }

    const nextIdx  = (this._mainPartIdx + 1) % parts.length
    const nextPart = parts[nextIdx]

    // Try to insert a transition fill
    const fillName = getTransitionFillName(this._partName, nextPart, this._style.parts)
    if (fillName) {
      this._partName = fillName
      this._partSize = this._alignPartSize(
        this._style.parts[fillName].sizeInBeats, this._beatsPerBar
      )
      this._playbackPhase = 'fill'
      this._pendingPartAdvance = true
      this._pendingNotes = null
      this._emitPhaseChange()
    } else {
      // No fill available — advance directly
      this._doAdvanceMainPart(parts)
    }

    this._progressionLoopCount = 0
  }

  _doAdvanceMainPart(parts) {
    parts = parts || this._getAvailableMainParts()
    this._mainPartIdx = (this._mainPartIdx + 1) % parts.length
    const newPart = parts[this._mainPartIdx]
    this.setActivePart(newPart)
    this._playbackPhase = 'main'
    this._computeMidProgSegments(newPart)
    this._emitPhaseChange()
  }

  /**
   * Switch to Ending part for soft stop.
   */
  _startEnding() {
    // Find the current main part (might be on a fill or mid-prog segment)
    const currentMain = this._getAvailableMainParts()[this._mainPartIdx] || 'Main_A'
    const endingName = getEndingName(currentMain, this._style.parts)

    if (endingName) {
      this._partName = endingName
      this._partSize = this._alignPartSize(
        this._style.parts[endingName].sizeInBeats, this._beatsPerBar
      )
      this._playbackPhase = 'ending'
      this._pendingNotes = null
      this._emitPhaseChange()
    } else {
      // No ending available — hard stop
      this._hardStop()
    }
  }

  // ── Internal — mid-progression variation ──────────────────────────────────

  /**
   * Compute segments for mid-progression variation.
   * For progressions > 8 bars: split into 8-bar segments, cycling Main parts.
   * For short progressions: no splitting (null).
   *
   * @param {string} startingPart  The main part that starts this progression loop
   */
  _computeMidProgSegments(startingPart) {
    const totalBars = this._totalProgBeats / this._beatsPerBar
    if (totalBars <= 8) {
      this._midProgSegments = null
      return
    }

    const parts = this._getAvailableMainParts()
    const startIdx = parts.indexOf(startingPart)
    const segmentBars = 8
    const segments = []

    for (let bar = 0; bar < totalBars; bar += segmentBars) {
      const segIdx = Math.floor(bar / segmentBars)
      const partIdx = (startIdx + segIdx) % parts.length
      segments.push({
        startBeat: bar * this._beatsPerBar,
        endBeat: Math.min((bar + segmentBars) * this._beatsPerBar, this._totalProgBeats),
        partName: parts[partIdx],
      })
    }

    this._midProgSegments = segments
  }

  /**
   * Return the Main part name for a given loopBeat based on mid-prog segments.
   */
  _getSegmentPartForBeat(loopBeat) {
    if (!this._midProgSegments) return null
    for (const seg of this._midProgSegments) {
      if (loopBeat >= seg.startBeat && loopBeat < seg.endBeat) {
        return seg.partName
      }
    }
    return this._midProgSegments[0]?.partName ?? null
  }

  /** Emit phase change callback. */
  _emitPhaseChange() {
    this.onPhaseChange?.({ phase: this._playbackPhase, partName: this._partName })
  }

  // ── Internal — window generation (ChordEngine + Humanizer) ────────────────

  /**
   * Generate and humanize all notes for one part-window.
   * Returns { phrases, windowAudioTime, beatDuration } — notes are NOT scheduled yet.
   */
  _generateWindow(loopBeat, audioTime, beatDuration) {
    const part = this._style?.parts[this._partName]
    if (!part) return null

    const chordsInWindow = this._getChordsInWindow(loopBeat, this._partSize)
    if (chordsInWindow.length === 0) return null

    const loopIdx = this._partLoopCount
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
    const drumsConf = { ...humanConf, timingRandomness: 0 }

    const humanized = {}
    for (const [accType, notes] of Object.entries(phrases)) {
      const conf = (accType === 'RHYTHM' || accType === 'SUBRHYTHM')
        ? drumsConf
        : humanConf
      humanized[accType] = humanizeNotes(notes, conf, tempo, partSize)
    }

    return { phrases: humanized, windowAudioTime: audioTime, beatDuration }
  }

  // ── Internal — per-beat note scheduling ───────────────────────────────────

  /**
   * Schedule noteOn/noteOff for notes whose onset is in [partBeat, partBeat+1).
   * Uses the windowAudioTime captured when the window was generated,
   * so timing is consistent regardless of when this callback fires.
   */
  _scheduleBeatNotes(partBeat) {
    const { phrases, windowAudioTime, beatDuration } = this._pendingNotes
    const now = SFP.getAudioContext().currentTime

    for (const [accType, notes] of Object.entries(phrases)) {
      const channel = ACCTYPE_TO_CHANNEL[accType]
      if (channel === undefined) continue

      // Filter to notes whose onset falls in this beat's slice
      const beatNotes = notes.filter(
        n => n.position >= partBeat && n.position < partBeat + 1
      )

      for (const note of beatNotes) {
        const noteOnAt  = windowAudioTime + note.position * beatDuration
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

  // ── Internal — partSize alignment ─────────────────────────────────────────

  /**
   * Round partSize to the nearest multiple of beatsPerBar.
   * Prevents window boundaries from landing mid-bar (which would feel like
   * an extra or missing beat at every loop seam).
   */
  _alignPartSize(rawSize, beatsPerBar) {
    if (!rawSize || !beatsPerBar) return beatsPerBar || 4
    const aligned = Math.round(rawSize / beatsPerBar) * beatsPerBar
    return aligned > 0 ? aligned : beatsPerBar
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
