/**
 * ChordEngine.js — Chord→Pattern Engine (main facade for Stage 3)
 *
 * Converts a parsed Yamaha .sty style + a destination chord symbol
 * into adapted MIDI note events for each instrument channel.
 *
 * This is the JS port of JJazzLab's YamJJazzRhythmGenerator core logic.
 *
 * Usage:
 *   import { generatePhrasesForChord, parseChordSymbol } from './ChordEngine'
 *
 *   const chord = parseChordSymbol('Dm7')  // → { rootPitch: 2, typeName: 'min7' }
 *   const phrases = generatePhrasesForChord(style, 'Main_A', chord, barIndex)
 *   // phrases.BASS   = [{ pitch, velocity, position, duration }, ...]
 *   // phrases.RHYTHM = [...]
 *   // etc.
 */

import { fitNotes } from './Transposer.js'
import { pickVariation, isFillOrBreak } from './VariationSelector.js'
import { parseChordSymbol } from './YamChordMap.js'

// Re-export parseChordSymbol for convenience
export { parseChordSymbol }

// ─── ACC_TYPE channel mapping ────────────────────────────────────────────────
// MIDI channels 8-15 → AccType names
const CHANNEL_TO_ACCTYPE = {
  8:  'SUBRHYTHM',
  9:  'RHYTHM',
  10: 'BASS',
  11: 'CHORD1',
  12: 'CHORD2',
  13: 'PAD',
  14: 'PHRASE1',
  15: 'PHRASE2',
}

// ─── Main engine function ────────────────────────────────────────────────────

/**
 * Generate adapted note phrases for all channels, given a target chord symbol.
 *
 * For each channel in the style part:
 *  1. Skip if the chord type is in the channel's mutedChords list.
 *  2. If NTR=ROOT_FIXED + NTT=BYPASS: return source notes unchanged (drums).
 *  3. Otherwise: call fitNotes() to transpose/adapt to the destination chord.
 *
 * @param {Object} style      - Parsed style object from StyleParser.parseSty()
 * @param {string} partName   - StylePart name key, e.g. 'Main_A', 'Fill_In_AA'
 * @param {Object} chord      - { rootPitch: 0-11, typeName: string }
 * @param {number} barIndex   - 0-based bar index in the song (for variation selection)
 * @returns {Object} Map of AccType → note array, e.g.:
 *   {
 *     BASS:    [{ pitch, velocity, position, duration }, ...],
 *     RHYTHM:  [...],
 *     CHORD1:  [...],
 *     CHORD2:  [...],
 *     PAD:     [...],
 *     ...
 *   }
 */
export function generatePhrasesForChord(style, partName, chord, barIndex = 0) {
  const part = style.parts[partName]
  if (!part) {
    console.warn(`ChordEngine: StylePart "${partName}" not found in style "${style.name}"`)
    return {}
  }

  const { rootPitch: destRoot, typeName: destType } = chord
  const fill = isFillOrBreak(partName)
  const result = {}

  for (const [channelStr, channelData] of Object.entries(part.channels)) {
    const { ctab, notes } = channelData
    const accType = ctab.accType  // 'BASS', 'RHYTHM', 'CHORD1', etc.

    if (!notes || notes.length === 0) continue

    // ── 1. Check mutedChords — skip this channel, don't erase others ─────
    if (isChordMuted(ctab, destType)) continue

    // ── 2. Bypass+RootFixed → static (drums) ─────────────────────────────
    const ctb2 = ctab.ctb2Main
    if (ctb2.ntr === 'ROOT_FIXED' && ctb2.ntt === 'BYPASS') {
      if (!result[accType]) result[accType] = []
      result[accType].push(...notes)
      continue
    }

    // ── 3. Fit notes to destination chord ─────────────────────────────────
    const fitted = fitNotes(notes, ctab, destRoot, destType)
    if (!result[accType]) result[accType] = []
    result[accType].push(...fitted)
  }

  return result
}

/**
 * Generate phrases for a sequence of chords that span the whole stylePart.
 *
 * Each chord in the sequence is active from its `startBeat` until the next
 * chord's startBeat (or end of part). The returned notes have positions
 * already offset and trimmed to the correct beat range.
 *
 * @param {Object} style         - Parsed style
 * @param {string} partName      - e.g., 'Main_A'
 * @param {Array}  chordSequence - [{ rootPitch, typeName, startBeat }, ...]
 *                                 Sorted ascending by startBeat.
 *                                 startBeat=0 means start of part.
 * @param {number} barIndex      - For variation selection
 * @returns {Object}  { BASS: [...], RHYTHM: [...], ... } with all notes merged
 */
export function generatePhrasesForChordSequence(style, partName, chordSequence, barIndex = 0) {
  const part = style.parts[partName]
  if (!part || !chordSequence || chordSequence.length === 0) return {}

  const partEnd = part.sizeInBeats
  const result  = {}

  for (let i = 0; i < chordSequence.length; i++) {
    const chord     = chordSequence[i]
    const beatStart = chord.startBeat ?? 0
    const beatEnd   = (i + 1 < chordSequence.length)
      ? chordSequence[i + 1].startBeat
      : partEnd

    // Generate all notes for this chord
    const phrases = generatePhrasesForChord(style, partName, chord, barIndex)

    // Slice and merge notes into result
    for (const [accType, notes] of Object.entries(phrases)) {
      if (!result[accType]) result[accType] = []

      // Keep notes whose position falls within [beatStart, beatEnd)
      const sliced = notes
        .filter(n => n.position >= beatStart && n.position < beatEnd)
        .map(n => ({
          ...n,
          // Trim duration so note doesn't extend past beatEnd
          duration: Math.min(n.duration, beatEnd - n.position),
        }))

      result[accType].push(...sliced)
    }
  }

  return result
}

// ─── Helper functions ────────────────────────────────────────────────────────

/**
 * Check whether a chord type is muted for this channel.
 * mutedChords is an array of YamChord name strings stored by StyleParser.
 */
function isChordMuted(ctab, destTypeName) {
  if (!ctab.mutedChords || ctab.mutedChords.length === 0) return false
  return ctab.mutedChords.includes(destTypeName)
}

// ─── Style metadata helpers ──────────────────────────────────────────────────

/**
 * Return the list of available StylePart keys for a parsed style.
 * e.g., ['Main_A', 'Main_B', 'Fill_In_AA', 'Ending_A', ...]
 */
export function getAvailableParts(style) {
  return Object.keys(style.parts)
}

/**
 * Return how many beats are in a given style part.
 */
export function getPartSizeInBeats(style, partName) {
  return style.parts[partName]?.sizeInBeats ?? 0
}

/**
 * Return the style's time signature as { numerator, denominator }.
 * e.g., '4/4' → { numerator: 4, denominator: 4 }
 */
export function parseTimeSignature(style) {
  const [num, den] = (style.timeSignature || '4/4').split('/').map(Number)
  return { numerator: num, denominator: den }
}
