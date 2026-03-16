/**
 * VariationSelector.js — Smart random SourcePhraseSet picker
 *
 * Port of JJazzLab's SpsRandomPicker.java.
 *
 * Yamaha .sty files can have multiple variations of a StylePart
 * (called SourcePhraseSets, mapped to "complexity levels" 1..N).
 * Our StyleParser stores them as an array of phrase sets per channel.
 *
 * Selection strategy:
 *   - For Main parts: "decreasing thresholds" (first variation preferred)
 *   - For Fill/Break parts: "constant thresholds" (uniform distribution)
 *
 * Usage:
 *   const idx = pickVariation(numVariations, barIndex, isFill)
 *   const phrase = channel.phrases[idx]   // if phrases is an array of variations
 *
 * Note: Our current StyleParser stores a single phrase per channel (not an
 * array of variations), so pickVariation always returns 0 for now.
 * This module is forward-compatible: when the parser supports multi-variation,
 * just pass numVariations > 1.
 */

// ─── Threshold tables (from SpsRandomPicker.java) ──────────────────────────

/**
 * Decreasing thresholds — first variation is played more often.
 * Example for 3 variations: thresholds=[50,80] → 50% / 30% / 20%
 */
function computeDecreasingThresholds(size) {
  if (size <= 1) return []
  switch (size) {
    case 2:  return [60]
    case 3:  return [50, 80]
    case 4:  return [40, 65, 85]
    case 5:  return [35, 57, 74, 88]
    default: {
      // 30-20-15 then equal slices
      const res = [30, 50, 65]
      const step = Math.ceil(35 / (size - 3))
      for (let i = 0; i < size - 4; i++) {
        res.push(65 + (i + 1) * step)
      }
      return res
    }
  }
}

/**
 * Constant thresholds — uniform distribution.
 * Example for 3 variations: thresholds=[33,66] → 33% / 33% / 33%
 */
function computeConstantThresholds(size) {
  if (size <= 1) return []
  const step = Math.floor(100 / size)
  const res = []
  for (let i = 1; i < size; i++) {
    res.push(i * step)
  }
  return res
}

// ─── Picker ─────────────────────────────────────────────────────────────────

/**
 * Pick a variation index for a StylePart.
 *
 * @param {number}  numVariations  - Number of available variations (≥1)
 * @param {number}  barIndex       - Bar index in song structure (for future use / determinism)
 * @param {boolean} isFill         - True for Fill_In_XX / Ending parts
 * @returns {number} 0-based variation index
 */
export function pickVariation(numVariations, barIndex, isFill) {
  if (numVariations <= 1) return 0

  const thresholds = isFill
    ? computeConstantThresholds(numVariations)
    : computeDecreasingThresholds(numVariations)

  const x = Math.random() * 100  // 0-100

  let index = 0
  while (index < numVariations - 1 && x > thresholds[index]) {
    index++
  }
  return index
}

// ─── Fill/Break detection ───────────────────────────────────────────────────

/**
 * Return true if the given stylePartName is a Fill or Ending.
 * Mirrors StylePartType.isFillOrBreak() in JJazzLab.
 */
export function isFillOrBreak(partName) {
  return (
    partName.startsWith('Fill_In') ||
    partName.startsWith('Ending') ||
    partName.startsWith('Intro')
  )
}

// ─── Automatic Fill scheduling ──────────────────────────────────────────────

/**
 * Given the current part name and bar index within the part, determine
 * if this bar should use a Fill instead of the main pattern.
 *
 * JJazzLab rule: the LAST bar of any main section gets replaced by Fill_In_XX.
 *   Main_A → Fill_In_AA
 *   Main_B → Fill_In_BB
 *   etc.
 *
 * @param {string} mainPartName    - e.g., 'Main_A'
 * @param {number} barInPart       - 0-based bar index within the part
 * @param {number} partSizeInBars  - Total bars in this style part
 * @param {Object} availableParts  - Set of available part names in the style
 * @param {boolean} fillEnabled    - Whether fill is enabled for this bar
 * @returns {string} The part name to use (may be Fill_In_XX or original)
 */
export function resolveFillPart(mainPartName, barInPart, partSizeInBars, availableParts, fillEnabled) {
  if (!fillEnabled) return mainPartName

  const isLastBar = barInPart === partSizeInBars - 1
  if (!isLastBar) return mainPartName

  // Compute fill name
  const fillName = getFillName(mainPartName)
  if (fillName && availableParts[fillName]) {
    return fillName
  }
  return mainPartName
}

/**
 * Map a Main part name to its Fill_In name.
 * Main_A → Fill_In_AA, Main_B → Fill_In_BB, etc.
 */
export function getFillName(partName) {
  const map = {
    'Main_A': 'Fill_In_AA',
    'Main_B': 'Fill_In_BB',
    'Main_C': 'Fill_In_CC',
    'Main_D': 'Fill_In_DD',
  }
  return map[partName] ?? null
}
