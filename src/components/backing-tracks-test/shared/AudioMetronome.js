/**
 * AudioMetronome.js — pure-Web-Audio metronome reference clock.
 *
 * Used by Test 1 (Rhythm Stability) as the ground-truth tempo.
 * Schedules an OscillatorNode click at every beat using audioContext.currentTime
 * — never setTimeout, setInterval, or Tone.js — so it has no JS-thread jitter.
 *
 * The scheduling pattern is the standard look-ahead loop (Chris Wilson):
 *   - A 25ms setInterval wakes us up
 *   - On each wake we schedule clicks 200ms ahead
 *   - The setInterval is only for the wake-up; the click times are exact
 *
 * Public API:
 *   const metro = new AudioMetronome(audioCtx, 120)
 *   metro.start(audioCtx.currentTime + 0.1)  // start at this audio time
 *   metro.getExpectedBeatTime(beatIndex)     // → audioContext time of beat N
 *   metro.stop()
 */

const SCHEDULE_INTERVAL_MS = 25
const LOOKAHEAD_SEC = 0.2
const CLICK_DURATION = 0.005

export class AudioMetronome {
  constructor(audioCtx, bpm = 120, options = {}) {
    this._ctx = audioCtx
    this._bpm = bpm
    this._silent = options.silent ?? false
    this._frequency = options.frequency ?? 1000
    this._gain = options.gain ?? 0.05
    this._gainNode = null

    this._startAudioTime = 0
    this._nextBeatIndex = 0
    this._intervalId = null
    this._running = false
  }

  setTempo(bpm) {
    this._bpm = bpm
  }

  beatDuration() {
    return 60 / this._bpm
  }

  /**
   * Returns the audioContext time at which beat #beatIndex should fire.
   * Beat 0 = startAudioTime. This is the source of truth for Test 1.
   */
  getExpectedBeatTime(beatIndex) {
    return this._startAudioTime + beatIndex * this.beatDuration()
  }

  start(startAudioTime = null) {
    if (this._running) return
    this._startAudioTime = startAudioTime ?? (this._ctx.currentTime + 0.1)
    this._nextBeatIndex = 0
    this._running = true

    if (!this._silent) {
      this._gainNode = this._ctx.createGain()
      this._gainNode.gain.value = this._gain
      this._gainNode.connect(this._ctx.destination)
    }

    this._intervalId = setInterval(() => this._scheduleAhead(), SCHEDULE_INTERVAL_MS)
    this._scheduleAhead()
  }

  stop() {
    this._running = false
    if (this._intervalId !== null) {
      clearInterval(this._intervalId)
      this._intervalId = null
    }
    if (this._gainNode) {
      try { this._gainNode.disconnect() } catch {}
      this._gainNode = null
    }
  }

  _scheduleAhead() {
    if (!this._running) return
    const horizon = this._ctx.currentTime + LOOKAHEAD_SEC
    while (this.getExpectedBeatTime(this._nextBeatIndex) < horizon) {
      this._scheduleClick(this.getExpectedBeatTime(this._nextBeatIndex), this._nextBeatIndex)
      this._nextBeatIndex++
    }
  }

  _scheduleClick(time, beatIndex) {
    if (this._silent || !this._gainNode) return
    const osc = this._ctx.createOscillator()
    const accent = (beatIndex % 4 === 0) ? 1.4 : 1.0
    osc.frequency.value = this._frequency * (beatIndex % 4 === 0 ? 1.5 : 1)

    const env = this._ctx.createGain()
    env.gain.setValueAtTime(0, time)
    env.gain.linearRampToValueAtTime(accent, time + 0.001)
    env.gain.exponentialRampToValueAtTime(0.0001, time + CLICK_DURATION)

    osc.connect(env).connect(this._gainNode)
    osc.start(time)
    osc.stop(time + CLICK_DURATION + 0.01)
  }
}
