/**
 * InstrumentedEngine.js — BackingTrackEngine sub-class with measurement hooks.
 *
 * Wraps the production engine to expose three callbacks used by the test suite:
 *   onSchedEntry({ type, ... })  — fired for every beat slot AND every noteOn.
 *   onBeatEntry({ beat, bar, wallMs, audioMs })
 *                                — fired when the engine's UI-beat callback fires
 *                                  (approximately at the actual beat).
 *   onNoteFired({ time, channel, accType, pitch, velocity, partBeat,
 *                 progBeat, currentChord })
 *                                — fired *inside* the noteOn setTimeout, so
 *                                  `time` is the audioContext.currentTime at
 *                                  the moment FluidSynth got the noteOn.
 *
 * Pattern lifted from TimingTestPage.jsx:54-125 and generalized: that file
 * keeps its own copy for backwards-compat with the existing /timing-test page.
 */

import { BackingTrackEngine } from '../../../lib/style-engine/BackingTrackEngine.js'
import * as SFP from '../../../lib/soundfont/SoundFontPlayer.js'

const ACCTYPE_TO_CHANNEL = {
  RHYTHM:    9,
  SUBRHYTHM: 9,
  BASS:      1,
  CHORD1:    0,
  CHORD2:    2,
  PAD:       3,
  PHRASE1:   4,
  PHRASE2:   4,
}
const DRUM_CHANNEL = 9

export class InstrumentedEngine extends BackingTrackEngine {
  constructor() {
    super()
    this.onSchedEntry = null
    this.onBeatEntry  = null
    this.onNoteFired  = null
  }

  _onBeat(beat, bar) {
    const audioMs = SFP.getAudioContext()?.currentTime * 1000 ?? 0
    this.onBeatEntry?.({ beat, bar, wallMs: performance.now(), audioMs })
    super._onBeat(beat, bar)
  }

  _scheduleBeatNotes(partBeat) {
    if (!this._pendingNotes) return
    const { phrases, windowAudioTime, beatDuration } = this._pendingNotes
    const audioCtx = SFP.getAudioContext()
    const now = audioCtx.currentTime
    const progBeat = this._windowStartProgBeat + partBeat
    const loopBeat = this._totalProgBeats > 0
      ? (progBeat - this._introOffsetBeats) % this._totalProgBeats
      : 0
    const currentChord = this._getChordAtBeat(loopBeat)

    for (const [accType, notes] of Object.entries(phrases)) {
      const channel = ACCTYPE_TO_CHANNEL[accType]
      if (channel === undefined) continue

      const beatNotes = notes.filter(
        n => n.position >= partBeat && n.position < partBeat + 1
      )

      this.onSchedEntry?.({
        type:      'beatSlot',
        partBeat,
        progBeat,
        loopBeat,
        accType,
        channel,
        noteCount: beatNotes.length,
        partSize:  this._partSize,
        partName:  this._partName,
      })

      for (const note of beatNotes) {
        const noteOnAt  = windowAudioTime + note.position * beatDuration
        const noteOffAt = noteOnAt + note.duration * beatDuration
        const onDelay   = Math.max(0, (noteOnAt - now) * 1000)
        const offDelay  = Math.max(0, (noteOffAt - now) * 1000)

        const onId = setTimeout(() => {
          const actualTime  = audioCtx.currentTime
          const deviationMs = parseFloat(((actualTime - noteOnAt) * 1000).toFixed(2))

          this.onSchedEntry?.({
            type:      'noteOn',
            partBeat,
            progBeat,
            loopBeat,
            accType,
            channel,
            position:  parseFloat(note.position.toFixed(3)),
            pitch:     note.pitch,
            velocity:  note.velocity,
            deviationMs,
            scheduledDelayMs: parseFloat(onDelay.toFixed(1)),
            isSeam:    partBeat === 0,
            intendedAudioTime: noteOnAt,
            actualAudioTime:   actualTime,
          })

          this.onNoteFired?.({
            time:        actualTime,
            channel,
            accType,
            pitch:       note.pitch,
            velocity:    note.velocity,
            partBeat,
            progBeat,
            loopBeat,
            currentChord,
          })

          SFP.noteOn(channel, note.pitch, note.velocity)
        }, onDelay)
        this._noteTimers.push(onId)

        if (channel !== DRUM_CHANNEL) {
          const offId = setTimeout(() => SFP.noteOff(channel, note.pitch), offDelay)
          this._noteTimers.push(offId)
        }
      }
    }

    if (this._noteTimers.length > 2000) {
      this._noteTimers = this._noteTimers.slice(-1000)
    }
  }
}

export { ACCTYPE_TO_CHANNEL, DRUM_CHANNEL }

/**
 * Human-readable label for each output channel index.
 * Used by Test 3 to map sliders → instrument names.
 */
export const CHANNEL_LABELS = {
  0: 'Piano',
  1: 'Bass',
  2: 'Guitar',
  3: 'Pad/Strings',
  4: 'Melody',
  9: 'Drums',
}

export const CHANNEL_TO_ACCTYPES = {
  0: ['CHORD1'],
  1: ['BASS'],
  2: ['CHORD2'],
  3: ['PAD'],
  4: ['PHRASE1', 'PHRASE2'],
  9: ['RHYTHM', 'SUBRHYTHM'],
}
