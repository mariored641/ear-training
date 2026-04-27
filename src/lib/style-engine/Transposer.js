/**
 * Transposer.js — Chord→Phrase fitting algorithms
 *
 * Implements the NTR/NTT logic from JJazzLab's YamJJazzRhythmGenerator.java
 * and PhraseUtilities.java (fitMelodyPhrase2ChordSymbol, fitChordPhrase2ChordSymbol).
 *
 * Source notes are written for srcRoot+srcType (almost always C+Maj in .sty files).
 * We adapt them to play over destRoot+destType.
 *
 * Note format: { pitch, velocity, position, duration }
 *   pitch    = MIDI pitch 0-127
 *   velocity = 0-127
 *   position = beats from start of stylePart (float)
 *   duration = beats (float)
 */

import { CHORD_DATA, SCALES, getChordData } from './YamChordMap.js'

// ─── Public entry point ─────────────────────────────────────────────────────

/**
 * Adapt source notes (written for ctab.sourceChordNote + ctab.sourceChordType)
 * to play over a destination chord, using the ctab's NTR/NTT settings.
 *
 * @param {Array}  notes          - Source notes [{ pitch, velocity, position, duration }]
 * @param {Object} ctab           - CTAB channel settings from StyleParser
 * @param {number} destRootPitch  - Destination chord root (0-11, C=0)
 * @param {string} destTypeName   - Destination chord type (YamChord name, e.g. 'min7')
 * @returns {Array} New notes array adapted to destination chord
 */
export function fitNotes(notes, ctab, destRootPitch, destTypeName) {
  if (!notes || notes.length === 0) return []

  const ctb2 = ctab.ctb2Main
  const { ntr, ntt, bassOn, noteLowLimit, noteHighLimit, chordRootUpperLimit } = ctb2

  const srcRootPitch = ctab.sourceChordNote ?? 0   // usually C = 0
  const srcTypeName  = ctab.sourceChordType  ?? 'Maj'

  // ── Special case: BYPASS + ROOT_FIXED → drums / static channels ─────────
  // Handled upstream by the engine (no call here), but safety net:
  if (ntr === 'ROOT_FIXED' && ntt === 'BYPASS') {
    return clampAll(notes, noteLowLimit, noteHighLimit)
  }

  let result

  // ── BYPASS + ROOT_TRANSPOSITION → simple pitch shift (intros/endings) ───
  if (ntt === 'BYPASS') {
    const delta = normalizeRootDelta(destRootPitch, srcRootPitch)
    result = notes.map(n => ({ ...n, pitch: n.pitch + delta }))

  // ── ROOT_FIXED → chord-oriented fitting (piano/guitar comping) ──────────
  } else if (ntr === 'ROOT_FIXED' || ntr === 'GUITAR') {
    result = fitChordPhrase(notes, srcRootPitch, srcTypeName, destRootPitch, destTypeName)

  // ── ROOT_TRANSPOSITION → melody/bass fitting ────────────────────────────
  } else {
    // ntr === 'ROOT_TRANSPOSITION'
    if (bassOn) {
      result = fitBassPhrase(notes, srcRootPitch, srcTypeName, destRootPitch, destTypeName)
    } else {
      const useChordMode = (ntt === 'CHORD')
      const scale = nttToScale(ntt)
      result = fitMelodyPhrase(notes, srcRootPitch, srcTypeName, destRootPitch, destTypeName, scale, useChordMode)
    }

    // Apply chordRootUpperLimit: if destRoot's relative pitch > limit → shift all -12
    // chordRootUpperLimit is stored as a raw MIDI pitch (0-127); convert to relative (0-11)
    if (chordRootUpperLimit !== undefined && chordRootUpperLimit !== null) {
      const limitRelPitch = chordRootUpperLimit % 12
      if (destRootPitch > limitRelPitch) {
        result = result.map(n => ({ ...n, pitch: n.pitch - 12 }))
      }
    }
  }

  // Apply pitch range limits
  return clampAll(result, noteLowLimit, noteHighLimit)
}

// ─── NTT → scale mapping ───────────────────────────────────────────────────

function nttToScale(ntt) {
  switch (ntt) {
    case 'HARMONIC_MINOR':
    case 'HARMONIC_MINOR_5': return 'HARMONIC_MINOR'
    case 'MELODIC_MINOR':
    case 'MELODIC_MINOR_5':  return 'MELODIC_MINOR'
    case 'NATURAL_MINOR':
    case 'NATURAL_MINOR_5':  return 'AEOLIAN'
    case 'DORIAN':
    case 'DORIAN_5':         return 'DORIAN'
    default:                 return null  // use chord's default scale
  }
}

// ─── Core fitting algorithms ────────────────────────────────────────────────

/**
 * fitMelodyPhrase — for ROOT_TRANSPOSITION channels (bass, phrase1/2).
 *
 * For each source note:
 *  1. Find its scale degree in the source (C major) context.
 *  2. Map that degree to the destination chord's scale.
 *  3. Find the closest pitch of the destination note to the transposed anchor.
 *
 * This is a practical approximation of JJazzLab's fitMelodyPhrase2ChordSymbol().
 */
function fitMelodyPhrase(notes, srcRoot, srcType, destRoot, destType, forceScale, useChordMode) {
  const srcData    = getChordData(srcType)
  const destData   = getChordData(destType)
  const srcScale   = SCALES[srcData.scale]  ?? SCALES.IONIAN
  const destScale  = SCALES[forceScale ?? destData.scale] ?? SCALES.IONIAN

  // rootDelta in [0..11] — used as anchor shift, closestPitch handles octave
  const rootDelta = normalizeRootDelta(destRoot, srcRoot)

  return notes.map(note => {
    const srcRelToSrcRoot = posmod(note.pitch - srcRoot, 12)

    // Find the scale degree index in the source scale
    const degreeIdx = findClosestScaleDegree(srcRelToSrcRoot, srcScale)

    // Get the corresponding interval in the destination scale
    const destInterval  = destScale[degreeIdx]
    const destRelPitch  = posmod(destRoot + destInterval, 12)

    // Anchor = pitch shifted by rootDelta; closestPitch snaps to correct octave
    const anchor   = note.pitch + rootDelta
    const destPitch = closestPitch(anchor, destRelPitch)

    return { ...note, pitch: destPitch }
  })
}

/**
 * fitBassPhrase — for bassOn channels.
 *
 * Same as fitMelodyPhrase but the source root always maps to the dest root
 * (handles slash chords gracefully by mapping the root degree to destRoot).
 */
function fitBassPhrase(notes, srcRoot, srcType, destRoot, destType) {
  const srcData   = getChordData(srcType)
  const destData  = getChordData(destType)
  const srcIntervals  = srcData.intervals
  const destIntervals = destData.intervals
  const rootDelta = normalizeRootDelta(destRoot, srcRoot)

  return notes.map(note => {
    const srcRelToSrcRoot = posmod(note.pitch - srcRoot, 12)

    // Find the chord tone degree index in the source chord
    const degreeIdx = findClosestChordDegree(srcRelToSrcRoot, srcIntervals)

    // Map to dest chord interval (same index, clamped)
    const destInterval = destIntervals[Math.min(degreeIdx, destIntervals.length - 1)]
    const destRelPitch  = posmod(destRoot + destInterval, 12)

    const anchor   = note.pitch + rootDelta
    const destPitch = closestPitch(anchor, destRelPitch)

    return { ...note, pitch: destPitch }
  })
}

/**
 * fitChordPhrase — for ROOT_FIXED channels (piano/guitar comping).
 *
 * Each source note is snapped to the nearest chord tone of the destination chord,
 * minimizing voice movement. This is a simplified version of JJazzLab's
 * fitChordPhrase2ChordSymbol() (no permutation search, but works well in practice).
 */
function fitChordPhrase(notes, srcRoot, srcType, destRoot, destType) {
  const srcData   = getChordData(srcType)
  const destData  = getChordData(destType)
  const srcIntervals  = srcData.intervals
  const destIntervals = destData.intervals
  const rootDelta = normalizeRootDelta(destRoot, srcRoot)

  return notes.map(note => {
    const srcRelToSrcRoot = posmod(note.pitch - srcRoot, 12)

    // Find chord degree index in source chord
    const degreeIdx = findClosestChordDegree(srcRelToSrcRoot, srcIntervals)

    // Map to corresponding dest chord degree (wrap if dest has fewer tones)
    const destInterval = destIntervals[degreeIdx % destIntervals.length]
    const destRelPitch  = posmod(destRoot + destInterval, 12)

    // Find the dest pitch closest to the transposed anchor
    const anchor   = note.pitch + rootDelta
    const destPitch = closestPitch(anchor, destRelPitch)

    return { ...note, pitch: destPitch }
  })
}

// ─── Pitch utility functions ────────────────────────────────────────────────

/**
 * Find the closest MIDI pitch that has the given relative pitch (0-11).
 * Searches the octave below, at, and above the anchor.
 */
function closestPitch(anchor, relPitch) {
  const anchorRel = posmod(anchor, 12)
  const base      = anchor - anchorRel    // lowest C at or below anchor

  const candidates = [
    base - 12 + relPitch,
    base       + relPitch,
    base + 12  + relPitch,
  ]

  let best = candidates[0]
  let bestDist = Math.abs(candidates[0] - anchor)
  for (let i = 1; i < candidates.length; i++) {
    const d = Math.abs(candidates[i] - anchor)
    if (d < bestDist) { bestDist = d; best = candidates[i] }
  }
  return clamp(best, 0, 127)
}

/**
 * Compute normalized root delta in [0..11].
 * JJazzLab's Note.getNormalizedRelPitch() semantics.
 */
function normalizeRootDelta(destRoot, srcRoot) {
  return posmod(destRoot - srcRoot, 12)
}

/**
 * Find the index of the scale degree closest to srcRelPitch.
 * @param {number} srcRelPitch - 0-11, relative to source root
 * @param {number[]} scale     - 7-element array of semitones from root
 * @returns {number} index 0-6
 */
function findClosestScaleDegree(srcRelPitch, scale) {
  let bestIdx  = 0
  let bestDist = 999
  for (let i = 0; i < scale.length; i++) {
    const d = circularDistance(srcRelPitch, scale[i])
    if (d < bestDist) { bestDist = d; bestIdx = i }
  }
  return bestIdx
}

/**
 * Find the index of the chord tone closest to srcRelPitch.
 * @param {number} srcRelPitch - 0-11, relative to source root
 * @param {number[]} intervals - chord tone semitones from root
 * @returns {number} index 0-(n-1)
 */
function findClosestChordDegree(srcRelPitch, intervals) {
  let bestIdx  = 0
  let bestDist = 999
  for (let i = 0; i < intervals.length; i++) {
    const d = circularDistance(srcRelPitch, posmod(intervals[i], 12))
    if (d < bestDist) { bestDist = d; bestIdx = i }
  }
  return bestIdx
}

/** Circular (chromatic) distance between two relative pitches 0-11 */
function circularDistance(a, b) {
  const d = Math.abs(a - b)
  return Math.min(d, 12 - d)
}

/** Positive modulo */
function posmod(a, b) {
  return ((a % b) + b) % b
}

/** Clamp value to [min, max] */
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

/**
 * Fold pitches into the [noteLowLimit, noteHighLimit] range by shifting in
 * octaves. Preserves pitch class — a transposed D stays a D, just at a
 * different octave. A naive clamp (replacing pitch with the limit value)
 * destroys harmonic content and produces the "bass stuck on E" bug
 * reported for Jazz Vocal and similar styles.
 *
 * Drums never reach this function (BackingTrackEngine returns drum patterns
 * raw before calling fitNotes), so octave-folding is always desired here.
 */
function clampAll(notes, low, high) {
  if (!notes) return []
  const lo = low  ?? 0
  const hi = high ?? 127
  if (lo === 0 && hi === 127) return notes

  // Range narrower than an octave can't be octave-folded safely
  // (very rare in real .sty files) — fall back to hard clamp.
  if (hi - lo < 11) {
    return notes.map(n => ({ ...n, pitch: clamp(n.pitch, lo, hi) }))
  }

  return notes.map(n => {
    let p = n.pitch
    while (p < lo) p += 12
    while (p > hi) p -= 12
    return { ...n, pitch: p }
  })
}
