/**
 * Humanizer.js — Note humanization engine (Stage 4)
 *
 * JS port of JJazzLab's Humanizer.java
 * Source: core/Humanizer/src/main/java/org/jjazz/humanizer/api/Humanizer.java
 *
 * Adds timing and velocity randomness to MIDI notes to produce a
 * more natural, "human" feel.
 *
 * Note format (same as ChordEngine output):
 *   { pitch, velocity, position, duration }  — position/duration in beats
 */

// ─── Constants (from Humanizer.java) ─────────────────────────────────────────

const MAX_TIMING_DEVIATION      = 0.2   // ± 0.2 beat
const MAX_TIMING_BIAS_DEVIATION = 0.2   // ± 0.2 beat  (always constant, not tempo-scaled)
const MAX_VELOCITY_DEVIATION    = 30    // ± 30 velocity units

// ─── Configs ─────────────────────────────────────────────────────────────────

/**
 * Default humanization config (timingRandomness=0.2, timingBias=0, velocityRandomness=0.2)
 * Matches Humanizer.DEFAULT_CONFIG in JJazzLab.
 */
export const DEFAULT_CONFIG = Object.freeze({
  timingRandomness:   0.2,
  timingBias:         0.0,
  velocityRandomness: 0.2,
})

/**
 * No humanization — notes pass through unchanged.
 * Matches Humanizer.ZERO_CONFIG in JJazzLab.
 */
export const ZERO_CONFIG = Object.freeze({
  timingRandomness:   0.0,
  timingBias:         0.0,
  velocityRandomness: 0.0,
})

// ─── Genre presets ────────────────────────────────────────────────────────────

/**
 * Genre-specific humanization presets.
 *
 * timingBias > 0 = "behind the beat" (laid back)
 * timingBias < 0 = "ahead of the beat" (rushing)
 */
export const PRESETS = Object.freeze({
  jazz: {
    // Loose, expressive — slight lag feel typical of jazz
    timingRandomness:   0.30,
    timingBias:         0.05,
    velocityRandomness: 0.35,
  },
  bossa: {
    // Subtle and gentle — precise but organic
    timingRandomness:   0.20,
    timingBias:         0.00,
    velocityRandomness: 0.25,
  },
  blues: {
    // Laid back, expressive — significantly behind the beat
    timingRandomness:   0.25,
    timingBias:         0.10,
    velocityRandomness: 0.30,
  },
  funk: {
    // Tight and locked-in — slightly ahead of beat, strong velocity accents
    timingRandomness:   0.15,
    timingBias:        -0.05,
    velocityRandomness: 0.30,
  },
  latin: {
    // Rhythmically precise, medium expressiveness
    timingRandomness:   0.20,
    timingBias:         0.00,
    velocityRandomness: 0.28,
  },
  rock: {
    // Tight, mechanical feel — minimal timing deviation
    timingRandomness:   0.10,
    timingBias:         0.00,
    velocityRandomness: 0.15,
  },
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Compute tempo-adjusted max timing deviation.
 * Formula from JJazzLab Humanizer.java constructor:
 *   impact = max(-0.1, -0.1 + (tempo - 50) * 0.001)
 *   → tempo ≤ 50 → impact = -0.1 → maxDeviation = 0.1
 *   → tempo = 150 → impact = 0.0 → maxDeviation = 0.2
 *   → tempo = 250 → impact = +0.1 → maxDeviation = 0.3
 *
 * @param {number} tempo - BPM
 * @returns {number}
 */
function computeMaxTimingDeviation(tempo) {
  const impact = Math.max(-0.1, -0.1 + (tempo - 50) * 0.001)
  return MAX_TIMING_DEVIATION + impact
}

/**
 * Gaussian random value clamped to [-1, 1].
 * Uses Box-Muller transform, same as Java Random.nextGaussian() + clamp.
 *
 * @returns {number} Value in [-1, 1]
 */
function gaussianRandom() {
  let u, v, s
  do {
    u = Math.random() * 2 - 1
    v = Math.random() * 2 - 1
    s = u * u + v * v
  } while (s >= 1 || s === 0)
  const raw = u * Math.sqrt(-2 * Math.log(s) / s)
  return Math.max(-1, Math.min(1, raw))
}

/**
 * Clamp MIDI velocity to [0, 127].
 */
function clampVelocity(v) {
  return Math.max(0, Math.min(127, Math.round(v)))
}

// ─── Stateless API ───────────────────────────────────────────────────────────

/**
 * Humanize an array of notes (stateless — generates fresh random factors).
 *
 * @param {Array}   notes          - Array of { pitch, velocity, position, duration }
 * @param {Object}  config         - Humanization config (DEFAULT_CONFIG or PRESETS.jazz etc.)
 * @param {number}  tempo          - BPM, used to scale timing deviation
 * @param {number}  phraseDuration - Phrase length in beats (for boundary clamping). Default: Infinity
 * @returns {Array} New array of humanized notes (originals not mutated)
 */
export function humanizeNotes(notes, config = DEFAULT_CONFIG, tempo = 130, phraseDuration = Infinity) {
  const maxTimingDev = computeMaxTimingDeviation(tempo)

  return notes.map(note => {
    const timingFactor   = gaussianRandom()
    const velocityFactor = gaussianRandom()

    // Position shift (JJazzLab formula, line 362-363)
    const posShift = timingFactor * maxTimingDev * config.timingRandomness
                   + MAX_TIMING_BIAS_DEVIATION    * config.timingBias
    let newPos = note.position + posShift

    // Clamp to phrase boundaries (JJazzLab lines 367-368)
    newPos = Math.max(0, Math.min(phraseDuration - 0.1, newPos))

    // Shorten duration if note would overflow phrase end (JJazzLab lines 369-373)
    let newDuration = note.duration
    if (Number.isFinite(phraseDuration) && newPos + newDuration > phraseDuration) {
      newDuration = phraseDuration - 0.05 - newPos
    }

    // Velocity shift (JJazzLab line 377)
    const velShift    = Math.round(velocityFactor * MAX_VELOCITY_DEVIATION * config.velocityRandomness)
    const newVelocity = clampVelocity(note.velocity + velShift)

    return { ...note, position: newPos, duration: newDuration, velocity: newVelocity }
  })
}

// ─── Stateful API ─────────────────────────────────────────────────────────────

/**
 * Stateful Humanizer — pre-computes random factors once, then re-applies
 * them with different configs. Use this when you want consistent "feel"
 * while live-adjusting humanization parameters (e.g. UI sliders).
 *
 * Mirrors the register/humanize pattern from JJazzLab Humanizer.java.
 */
export class Humanizer {
  /**
   * @param {number} tempo - BPM (10-400)
   */
  constructor(tempo = 130) {
    this.tempo         = tempo
    this._maxTimingDev = computeMaxTimingDeviation(tempo)
    this._factors      = []   // Array of { timingFactor, velocityFactor } per note index
  }

  /**
   * Pre-compute random factors for N notes.
   * Call this once when you get a new set of notes.
   * Equivalent to registerNotes() + computeRandomFactors() in JJazzLab.
   *
   * @param {number} noteCount
   */
  seed(noteCount) {
    this._factors = Array.from({ length: noteCount }, () => ({
      timingFactor:   gaussianRandom(),
      velocityFactor: gaussianRandom(),
    }))
  }

  /**
   * Re-compute random factors with a fresh seed (same count).
   * Equivalent to newSeed() in JJazzLab.
   */
  newSeed() {
    this.seed(this._factors.length)
  }

  /**
   * Humanize notes using pre-computed random factors.
   * If note count differs from seeded count, re-seeds automatically.
   *
   * @param {Array}  notes          - Array of { pitch, velocity, position, duration }
   * @param {Object} config         - Humanization config
   * @param {number} phraseDuration - Phrase length in beats for boundary clamping
   * @returns {Array} New array of humanized notes (originals not mutated)
   */
  humanize(notes, config = DEFAULT_CONFIG, phraseDuration = Infinity) {
    if (this._factors.length !== notes.length) {
      this.seed(notes.length)
    }

    return notes.map((note, i) => {
      const { timingFactor, velocityFactor } = this._factors[i]

      const posShift = timingFactor * this._maxTimingDev * config.timingRandomness
                     + MAX_TIMING_BIAS_DEVIATION          * config.timingBias
      let newPos = Math.max(0, Math.min(phraseDuration - 0.1, note.position + posShift))

      let newDuration = note.duration
      if (Number.isFinite(phraseDuration) && newPos + newDuration > phraseDuration) {
        newDuration = phraseDuration - 0.05 - newPos
      }

      const velShift    = Math.round(velocityFactor * MAX_VELOCITY_DEVIATION * config.velocityRandomness)
      const newVelocity = clampVelocity(note.velocity + velShift)

      return { ...note, position: newPos, duration: newDuration, velocity: newVelocity }
    })
  }
}

// ─── Exports summary ─────────────────────────────────────────────────────────
//
//  Stateless:
//    humanizeNotes(notes, config, tempo, phraseDuration) → notes[]
//
//  Stateful:
//    const h = new Humanizer(tempo)
//    h.seed(noteCount)        — pre-compute random factors
//    h.humanize(notes, config, phraseDuration) → notes[]
//    h.newSeed()              — reshuffle
//
//  Configs / Presets:
//    DEFAULT_CONFIG           — { tr:0.2, tb:0, vr:0.2 }
//    ZERO_CONFIG              — no humanization
//    PRESETS.jazz / .bossa / .blues / .funk / .latin / .rock
