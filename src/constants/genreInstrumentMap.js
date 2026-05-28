/**
 * genreInstrumentMap.js
 *
 * Maps each backing-track genre to the GM (General MIDI) program numbers
 * that should be loaded on the drums / bass / piano / guitar channels.
 *
 * The .sty files ship with their own program assignments, but they're not
 * always idiomatic for the target style — e.g. a rock .sty might still use
 * Jazz Guitar. This map lets us override per-channel to get the right tone.
 *
 * Channel ↔ instrument mapping (matches SoundFontPlayer.CHANNELS):
 *   drums  → channel 9
 *   bass   → channel 1
 *   piano  → channel 0
 *   guitar → channel 2
 *
 * Lookup strategy in getInstrumentMap(genreId):
 *   1. exact override under OVERRIDES_BY_ID[genreId]
 *   2. category default under DEFAULTS_BY_CATEGORY[category]
 *   3. fallback: jazz defaults
 *
 * The category is derived from the genreId prefix (jazz_*, latin_*, …).
 * BIAB ids preserve the .sty's own program assignments (returns null), since
 * those custom BIAB JSON files already specify idiomatic instruments.
 */

// ─── GM Program numbers (0-indexed) ──────────────────────────────────────────
// Common picks per family — see https://en.wikipedia.org/wiki/General_MIDI

export const GM = {
  // Pianos
  ACOUSTIC_GRAND: 0,
  ELECTRIC_GRAND: 2,
  HONKY_TONK: 3,
  RHODES: 4,
  WURLITZER: 5,
  // Organs
  DRAWBAR_ORGAN: 16,
  ROCK_ORGAN: 18,
  // Guitars
  NYLON_GUITAR: 24,
  STEEL_GUITAR: 25,
  JAZZ_GUITAR: 26,
  CLEAN_GUITAR: 27,
  MUTED_GUITAR: 28,
  OVERDRIVEN_GUITAR: 29,
  DISTORTION_GUITAR: 30,
  // Basses
  ACOUSTIC_BASS: 32,
  ELECTRIC_BASS_FINGER: 33,
  ELECTRIC_BASS_PICK: 34,
  FRETLESS_BASS: 35,
  SLAP_BASS_1: 36,
  // Drum kits (live on drum channel; FluidSynth uses program # to pick kit)
  DRUMS_STANDARD: 0,
  DRUMS_ROOM: 8,
  DRUMS_JAZZ: 32,
  DRUMS_BRUSH: 40,
  DRUMS_POWER: 16,
  DRUMS_ELECTRONIC: 24,
}

// ─── Default per category ────────────────────────────────────────────────────

const DEFAULTS_BY_CATEGORY = {
  jazz: {
    drums:  { program: GM.DRUMS_JAZZ,           volume: 85 },
    bass:   { program: GM.ACOUSTIC_BASS,        volume: 95 },
    piano:  { program: GM.ACOUSTIC_GRAND,       volume: 90 },
    guitar: { program: GM.JAZZ_GUITAR,          volume: 80 },
  },
  latin: {
    drums:  { program: GM.DRUMS_STANDARD,       volume: 90 },
    bass:   { program: GM.ACOUSTIC_BASS,        volume: 95 },
    piano:  { program: GM.ACOUSTIC_GRAND,       volume: 85 },
    guitar: { program: GM.NYLON_GUITAR,         volume: 85 },
  },
  blues: {
    drums:  { program: GM.DRUMS_STANDARD,       volume: 90 },
    bass:   { program: GM.ELECTRIC_BASS_FINGER, volume: 95 },
    piano:  { program: GM.RHODES,               volume: 85 },
    guitar: { program: GM.CLEAN_GUITAR,         volume: 85 },
  },
  rock: {
    drums:  { program: GM.DRUMS_POWER,          volume: 100 },
    bass:   { program: GM.ELECTRIC_BASS_PICK,   volume: 95 },
    piano:  { program: GM.ELECTRIC_GRAND,       volume: 70 },
    guitar: { program: GM.OVERDRIVEN_GUITAR,    volume: 95 },
  },
  country: {
    drums:  { program: GM.DRUMS_STANDARD,       volume: 90 },
    bass:   { program: GM.ACOUSTIC_BASS,        volume: 95 },
    piano:  { program: GM.ACOUSTIC_GRAND,       volume: 80 },
    guitar: { program: GM.STEEL_GUITAR,         volume: 90 },
  },
  // biab styles already encode their own instruments inside the JSON pattern.
  // Returning null from getInstrumentMap means "don't override".
  biab: null,
}

// ─── Per-id overrides — only where the category default isn't right ──────────

const OVERRIDES_BY_ID = {
  // ── Jazz refinements ──
  jazz_gypsy:   { guitar: { program: GM.NYLON_GUITAR,   volume: 90 } },  // gypsy → nylon string
  jazz_ballad:  { piano:  { program: GM.ACOUSTIC_GRAND, volume: 95 } },  // piano-led ballad
  jazz_bigband: { guitar: { program: GM.JAZZ_GUITAR,    volume: 65 } },  // brass-led, guitar quieter
  jazz_gospel:  { piano:  { program: GM.RHODES,         volume: 90 },
                  guitar: { program: GM.CLEAN_GUITAR,   volume: 80 } },

  // ── Blues refinements ──
  blues_funk:     { bass:   { program: GM.SLAP_BASS_1,        volume: 95 },
                    guitar: { program: GM.MUTED_GUITAR,       volume: 85 } },
  blues_koolfunk: { bass:   { program: GM.SLAP_BASS_1,        volume: 95 },
                    guitar: { program: GM.MUTED_GUITAR,       volume: 85 } },
  blues_rock60s:  { guitar: { program: GM.CLEAN_GUITAR,       volume: 90 } },

  // ── Rock / Pop refinements ──
  pop_chart:  { guitar: { program: GM.CLEAN_GUITAR, volume: 80 },
                piano:  { program: GM.RHODES,       volume: 75 } },
  pop_retro:  { guitar: { program: GM.CLEAN_GUITAR, volume: 80 } },
  pop_80s:    { guitar: { program: GM.CLEAN_GUITAR, volume: 80 } },
  pop_uk:     { guitar: { program: GM.CLEAN_GUITAR, volume: 80 } },
  pop_hiphop: { guitar: { program: GM.MUTED_GUITAR, volume: 75 } },

  // ── Country refinements ──
  country_brothers: { guitar: { program: GM.NYLON_GUITAR, volume: 90 } },
  country_ballad:   { guitar: { program: GM.NYLON_GUITAR, volume: 85 } },
}

// ─── Public API ──────────────────────────────────────────────────────────────

const CHANNELS = Object.freeze(['drums', 'bass', 'piano', 'guitar'])

function getCategory(genreId) {
  if (!genreId || typeof genreId !== 'string') return null
  const underscore = genreId.indexOf('_')
  return underscore === -1 ? genreId : genreId.slice(0, underscore)
}

/**
 * Resolve the final instrument map for a given genre id.
 * Merges category defaults with per-id overrides.
 *
 * @param {string} genreId   e.g. 'jazz_swing', 'rock_8beat', 'biab_texas_blues'
 * @returns {object|null}    { drums, bass, piano, guitar } or null when the
 *                           caller should not override (biab category).
 */
export function getInstrumentMap(genreId) {
  const category = getCategory(genreId)
  const base = DEFAULTS_BY_CATEGORY[category]
  if (base === null) return null              // explicit "don't override" (biab)
  if (base === undefined) {
    // Unknown category — fall back to jazz so playback still works.
    const fallback = DEFAULTS_BY_CATEGORY.jazz
    return mergeOverrides(fallback, OVERRIDES_BY_ID[genreId])
  }
  return mergeOverrides(base, OVERRIDES_BY_ID[genreId])
}

function mergeOverrides(base, override) {
  if (!override) return base
  const merged = {}
  for (const ch of CHANNELS) {
    merged[ch] = override[ch] ? { ...base[ch], ...override[ch] } : base[ch]
  }
  return merged
}

// Re-export for callers that want to inspect category coverage in dev tools.
export const GENRE_INSTRUMENT_DEFAULTS = DEFAULTS_BY_CATEGORY
export const GENRE_INSTRUMENT_OVERRIDES = OVERRIDES_BY_ID
