/**
 * AudioMetronome.js — pure-Web-Audio metronome reference clock.
 *
 * Schedules an OscillatorNode click at every beat using audioContext.currentTime
 * — never setTimeout/setInterval for sound — so it has no JS-thread jitter.
 *
 * Public API:
 *   const metro = new AudioMetronome(audioCtx, 120, { beatsPerBar: 4, onBeat })
 *   metro.start(audioCtx.currentTime + 0.1)
 *   metro.setTempo(bpm)
 *   metro.setBeatsPerBar(n)         // 2..8 — accent fires on beat % beatsPerBar === 0
 *   metro.getExpectedBeatTime(idx)  // → audioContext time
 *   metro.stop()
 *
 * onBeat(beatInBar, audioTime) is fired (via requestAnimationFrame-friendly
 * scheduling) just before each click so the UI can pulse the right dot.
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
    this._beatsPerBar = options.beatsPerBar ?? 4
    this._onBeat = options.onBeat ?? null
    this._gainNode = null

    this._startAudioTime = 0
    this._nextBeatIndex = 0
    this._intervalId = null
    this._running = false
    this._scheduledBeats = []
    this._uiTimer = null
  }

  setTempo(bpm) {
    this._bpm = bpm
  }

  setBeatsPerBar(n) {
    this._beatsPerBar = Math.max(2, Math.min(8, n | 0))
  }

  setVolume(v) {
    this._gain = v
    if (this._gainNode) this._gainNode.gain.value = v
  }

  beatDuration() {
    return 60 / this._bpm
  }

  getExpectedBeatTime(beatIndex) {
    return this._startAudioTime + beatIndex * this.beatDuration()
  }

  start(startAudioTime = null) {
    if (this._running) return
    this._startAudioTime = startAudioTime ?? (this._ctx.currentTime + 0.1)
    this._nextBeatIndex = 0
    this._scheduledBeats = []
    this._running = true

    if (!this._silent) {
      this._gainNode = this._ctx.createGain()
      this._gainNode.gain.value = this._gain
      this._gainNode.connect(this._ctx.destination)
    }

    this._intervalId = setInterval(() => this._scheduleAhead(), SCHEDULE_INTERVAL_MS)
    this._scheduleAhead()

    if (this._onBeat) {
      this._uiTimer = setInterval(() => this._drainScheduledBeats(), 16)
    }
  }

  stop() {
    this._running = false
    if (this._intervalId !== null) {
      clearInterval(this._intervalId)
      this._intervalId = null
    }
    if (this._uiTimer !== null) {
      clearInterval(this._uiTimer)
      this._uiTimer = null
    }
    if (this._gainNode) {
      try { this._gainNode.disconnect() } catch {}
      this._gainNode = null
    }
    this._scheduledBeats = []
  }

  _scheduleAhead() {
    if (!this._running) return
    const horizon = this._ctx.currentTime + LOOKAHEAD_SEC
    while (this.getExpectedBeatTime(this._nextBeatIndex) < horizon) {
      const t = this.getExpectedBeatTime(this._nextBeatIndex)
      this._scheduleClick(t, this._nextBeatIndex)
      if (this._onBeat) {
        this._scheduledBeats.push({ time: t, beatInBar: this._nextBeatIndex % this._beatsPerBar })
      }
      this._nextBeatIndex++
    }
  }

  _drainScheduledBeats() {
    if (!this._onBeat) return
    const now = this._ctx.currentTime
    while (this._scheduledBeats.length && this._scheduledBeats[0].time <= now) {
      const beat = this._scheduledBeats.shift()
      try { this._onBeat(beat.beatInBar, beat.time) } catch {}
    }
  }

  _scheduleClick(time, beatIndex) {
    if (this._silent || !this._gainNode) return
    const osc = this._ctx.createOscillator()
    const isAccent = (beatIndex % this._beatsPerBar === 0)
    const accent = isAccent ? 1.4 : 1.0
    osc.frequency.value = this._frequency * (isAccent ? 1.5 : 1)

    const env = this._ctx.createGain()
    env.gain.setValueAtTime(0, time)
    env.gain.linearRampToValueAtTime(accent, time + 0.001)
    env.gain.exponentialRampToValueAtTime(0.0001, time + CLICK_DURATION)

    osc.connect(env).connect(this._gainNode)
    osc.start(time)
    osc.stop(time + CLICK_DURATION + 0.01)
  }
}
