/**
 * BackingTrackClock.js — Web Audio API beat scheduler (Stage 5)
 *
 * Implements the "two clocks" pattern by Chris Wilson:
 *   https://www.html5rocks.com/en/tutorials/audio/scheduling/
 *
 * Architecture:
 *   - Uses audioContext.currentTime as the precise time reference
 *   - Runs setInterval every SCHEDULE_INTERVAL ms
 *   - Schedules beats LOOKAHEAD_SECS ahead of real time
 *   - Fires two kinds of callbacks:
 *
 *     onScheduleBeat({ beat, bar, audioTime, beatDuration })
 *       → Called AHEAD of the beat (for noteOn/noteOff scheduling).
 *         audioTime is the exact AudioContext time of this beat.
 *
 *     onBeat({ beat, bar })
 *       → Fires approximately at the actual beat time (setTimeout-based).
 *         Use for UI updates only — not for audio scheduling.
 *
 * beat   = 0-indexed position within a bar (0 to beatsPerBar-1)
 * bar    = 0-indexed absolute bar count since start()
 */

const LOOKAHEAD_SECS    = 0.15   // seconds ahead to schedule
const SCHEDULE_INTERVAL = 25     // scheduler fires every N ms

// ─────────────────────────────────────────────────────────────────────────────

export class BackingTrackClock {
  /**
   * @param {AudioContext} audioContext
   */
  constructor(audioContext) {
    this._ctx          = audioContext
    this._tempo        = 120
    this._beatsPerBar  = 4
    this._running      = false
    this._intervalId   = null

    // Scheduling state
    this._nextBeatTime = 0    // audioCtx time of the next beat to schedule
    this._nextBeat     = 0    // beat within bar
    this._nextBar      = 0    // absolute bar index

    // UI timer IDs (setTimeout)
    this._uiTimers = []

    // Public callbacks
    this.onScheduleBeat = null   // ({ beat, bar, audioTime, beatDuration }) → void
    this.onBeat         = null   // ({ beat, bar }) → void
  }

  // ── Getters ────────────────────────────────────────────────────────────────

  get tempo()        { return this._tempo }
  get beatsPerBar()  { return this._beatsPerBar }
  get isRunning()    { return this._running }

  /** Duration of one beat in seconds at the current tempo. */
  get beatDuration() { return 60 / this._tempo }

  // ── Configuration (safe to call while playing) ─────────────────────────────

  setTempo(bpm) {
    this._tempo = Math.max(20, Math.min(300, bpm))
  }

  setTimeSignature(beatsPerBar) {
    this._beatsPerBar = Math.max(1, beatsPerBar)
  }

  // ── Transport ──────────────────────────────────────────────────────────────

  start() {
    if (this._running) return
    this._running      = true
    this._nextBeat     = 0
    this._nextBar      = 0
    // Start 50 ms in the future so the first scheduler pass can pre-fill the buffer
    this._nextBeatTime = this._ctx.currentTime + 0.05

    this._schedule()  // immediate first pass
    this._intervalId = setInterval(() => this._schedule(), SCHEDULE_INTERVAL)
  }

  stop() {
    if (!this._running) return
    this._running = false

    clearInterval(this._intervalId)
    this._intervalId = null

    this._uiTimers.forEach(clearTimeout)
    this._uiTimers = []
  }

  // ── Internal scheduler ─────────────────────────────────────────────────────

  _schedule() {
    const now     = this._ctx.currentTime
    const horizon = now + LOOKAHEAD_SECS

    while (this._nextBeatTime < horizon) {
      const beat      = this._nextBeat
      const bar       = this._nextBar
      const audioTime = this._nextBeatTime
      const bd        = this.beatDuration   // snapshot (tempo may change)

      // 1. Notify engine — happens synchronously, ahead of actual beat
      this.onScheduleBeat?.({ beat, bar, audioTime, beatDuration: bd })

      // 2. Schedule a UI callback to fire at the actual beat moment
      const delay = Math.max(0, (audioTime - now) * 1000)
      const tid   = setTimeout(() => this.onBeat?.({ beat, bar }), delay)
      this._uiTimers.push(tid)

      // Prune old IDs periodically to avoid unbounded growth
      if (this._uiTimers.length > 200) {
        this._uiTimers = this._uiTimers.slice(-100)
      }

      // 3. Advance scheduling pointer
      this._nextBeatTime += bd
      this._nextBeat = (beat + 1) % this._beatsPerBar
      if (this._nextBeat === 0) this._nextBar++
    }
  }
}
