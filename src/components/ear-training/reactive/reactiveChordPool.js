/**
 * Reactive Ear Training — Chord Pool Generator
 *
 * Two modes:
 *   - 'random'   : 12 roots × all qualities in current tier (R2, 4 tiers)
 *   - 'diatonic' : 7 diatonic chords from a chosen key, by degree (R1, 6 tiers)
 *
 * Each chord = {
 *   rootPitch, rootName, quality,
 *   midiNotes, displaySymbol,
 *   mixtureLevel: 0|1
 * }
 *
 * mixtureLevel:
 *   0 = diatonic-rooted (tiers 1-4 of R1, ALL of R2)
 *   1 = mixture chord (tier 5/6 of R1) — triggers "no consecutive mixtures" rule
 */

import { CHORD_DATA, NOTE_PITCHES, PITCH_NAMES } from '../../../lib/style-engine/YamChordMap';
import { TIER_QUALITIES, QUALITY_DISPLAY } from './reactiveConstants';

const BASE_MIDI_OCTAVE = 4; // C4 = 60

function midiForChord(rootPitch, quality) {
  const data = CHORD_DATA[quality];
  if (!data) return [];
  const baseMidi = 12 * (BASE_MIDI_OCTAVE + 1) + rootPitch;
  return data.intervals.map(iv => baseMidi + iv);
}

function displaySymbol(rootName, quality) {
  const suffix = QUALITY_DISPLAY[quality] ?? quality;
  return `${rootName}${suffix}`;
}

function makeChord(rootPitch, quality, mixtureLevel = 0) {
  const rootName = PITCH_NAMES[rootPitch];
  return {
    rootPitch,
    rootName,
    quality,
    mixtureLevel,
    midiNotes: midiForChord(rootPitch, quality),
    displaySymbol: displaySymbol(rootName, quality),
  };
}

// ─── R2 — Random pool (4 tiers, all mixtureLevel=0) ──────────────────────────
export function buildRandomPool(tierId) {
  const qualities = TIER_QUALITIES[tierId] || TIER_QUALITIES.triads;
  const uniqueQualities = [...new Set(qualities)];
  const pool = [];
  for (let root = 0; root < 12; root++) {
    for (const q of uniqueQualities) {
      pool.push(makeChord(root, q, 0));
    }
  }
  return pool;
}

// ─── R1 — Diatonic pool (6 tiers, cumulative) ────────────────────────────────

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];

// Quality at each diatonic degree (1-7, index 0-6)
const TIER1_DEGREE = ['Maj', 'min', 'min', 'Maj', 'Maj', 'min', 'dim'];
const TIER2_DEGREE = ['Maj7', 'min7', 'min7', 'Maj7', '7th', 'min7', 'm7b5'];

// Helpers ───────────────────────────────────────────────────────────────────
function pushAtDegree(pool, keyRootPitch, degree, quality, mixtureLevel = 0) {
  const cr = (keyRootPitch + MAJOR_SCALE[degree]) % 12;
  pool.push(makeChord(cr, quality, mixtureLevel));
}

function pushChromaticDegree(pool, keyRootPitch, semitonesAbove, quality, mixtureLevel = 1) {
  const cr = (keyRootPitch + semitonesAbove) % 12;
  pool.push(makeChord(cr, quality, mixtureLevel));
}

/**
 * Build R1 diatonic pool for the given key + tier (cumulative).
 *
 * @param {string} keyName  e.g. 'C', 'F', 'Bb'
 * @param {string} tierId   one of: r1-triads, r1-sevenths, r1-extensions,
 *                                  r1-chromatic, r1-mixture-q, r1-mixture-m
 */
export function buildDiatonicPool(keyName, tierId) {
  const keyRoot = NOTE_PITCHES[keyName] ?? 0;
  const pool = [];

  // ── Tier 1: Diatonic triads ───────────────────────────────────────────
  // I, ii, iii, IV, V, vi, vii°
  for (let d = 0; d < 7; d++) {
    pushAtDegree(pool, keyRoot, d, TIER1_DEGREE[d], 0);
  }
  if (tierId === 'r1-triads') return pool;

  // ── Tier 2: + Diatonic sevenths ───────────────────────────────────────
  // Imaj7, ii7, iii7, IVmaj7, V7, vi7, viim7b5
  for (let d = 0; d < 7; d++) {
    pushAtDegree(pool, keyRoot, d, TIER2_DEGREE[d], 0);
  }
  if (tierId === 'r1-sevenths') return pool;

  // ── Tier 3: + Diatonic extensions (6, sus, add9/11/13 within scale) ──
  // 6 chords — I6, IV6, ii6, vi6 (m6 - the 6 is diatonic)
  pushAtDegree(pool, keyRoot, 0, 'Maj6', 0);              // I6
  pushAtDegree(pool, keyRoot, 3, 'Maj6', 0);              // IV6
  // ii m6: Dm6 in C major = D-F-A-B. B is 7th of C → diatonic ✓
  pushAtDegree(pool, keyRoot, 1, 'min6', 0);
  // (vi m6 skipped: Am6 = A-C-E-F♯ — the 6 of vi is chromatic in major)

  // sus chords — only where the suspended note is diatonic
  // sus4 raises the 3rd to the 4th (semitones from root). For a chord on degree D
  // built diatonically, the 4th from D must equal a scale note.
  // V sus4: G to C — C is in C major scale ✓
  pushAtDegree(pool, keyRoot, 4, 'sus4', 0);              // Vsus4
  pushAtDegree(pool, keyRoot, 4, '7sus4', 0);             // V7sus4
  // I sus4: C to F — F is in scale ✓
  pushAtDegree(pool, keyRoot, 0, 'sus4', 0);              // Isus4
  // ii sus4: D to G — G is in scale ✓
  pushAtDegree(pool, keyRoot, 1, 'sus4', 0);              // iisus4

  // add9 / Maj(9), min(9), 7(9), Maj7(9), min7(9) — diatonic ninths
  // The 9 from degree d is the (d+2)-th scale note. Always diatonic.
  pushAtDegree(pool, keyRoot, 0, 'Maj(9)', 0);            // I add9
  pushAtDegree(pool, keyRoot, 3, 'Maj(9)', 0);            // IV add9
  pushAtDegree(pool, keyRoot, 1, 'min(9)', 0);            // ii(9)
  pushAtDegree(pool, keyRoot, 5, 'min(9)', 0);            // vi(9)
  pushAtDegree(pool, keyRoot, 0, 'Maj7(9)', 0);           // Imaj9
  pushAtDegree(pool, keyRoot, 3, 'Maj7(9)', 0);           // IVmaj9
  pushAtDegree(pool, keyRoot, 1, 'min7(9)', 0);           // ii9
  pushAtDegree(pool, keyRoot, 5, 'min7(9)', 0);           // vi9
  pushAtDegree(pool, keyRoot, 4, '7(9)', 0);              // V9
  if (tierId === 'r1-extensions') return pool;

  // ── Tier 4: + Chromatic tensions on diatonic roots ───────────────────
  // The root is in the scale, but tensions add chromatic color notes.
  // mixtureLevel=0 — chord is still "anchored" diatonically, recovery not needed.
  pushAtDegree(pool, keyRoot, 4, '7(b9)', 0);             // V7♭9
  pushAtDegree(pool, keyRoot, 4, '7(#9)', 0);             // V7♯9
  pushAtDegree(pool, keyRoot, 4, '7#11', 0);              // V7♯11
  pushAtDegree(pool, keyRoot, 4, '7(b13)', 0);            // V7♭13
  pushAtDegree(pool, keyRoot, 4, '7aug', 0);              // V7♯5 (alt)
  pushAtDegree(pool, keyRoot, 0, 'Maj7#11', 0);           // Imaj7♯11 (Lydian color)
  pushAtDegree(pool, keyRoot, 3, 'Maj7#11', 0);           // IVmaj7♯11
  pushAtDegree(pool, keyRoot, 1, 'min7(11)', 0);          // ii m7(11) — 11 is the 4th of key → diatonic actually, but feel-wise belongs here
  if (tierId === 'r1-chromatic') return pool;

  // ── Tier 5: + Quality mixtures (same root, opposite quality) ─────────
  // mixtureLevel=1 — must be followed by a diatonic chord.
  // In major key: borrow from parallel minor and flip qualities
  pushAtDegree(pool, keyRoot, 0, 'min', 1);               // i (parallel minor)
  pushAtDegree(pool, keyRoot, 0, 'min7', 1);              // i m7
  pushAtDegree(pool, keyRoot, 0, 'minMaj7', 1);           // i minMaj7
  pushAtDegree(pool, keyRoot, 3, 'min', 1);               // iv (minor IV)
  pushAtDegree(pool, keyRoot, 3, 'min7', 1);              // iv m7
  pushAtDegree(pool, keyRoot, 4, 'min', 1);               // v (minor V)
  pushAtDegree(pool, keyRoot, 4, 'min7', 1);              // v m7
  pushAtDegree(pool, keyRoot, 1, 'Maj', 1);               // II (major ii = V/V)
  pushAtDegree(pool, keyRoot, 1, '7th', 1);               // II7 (V/V)
  pushAtDegree(pool, keyRoot, 2, 'Maj', 1);               // III (major iii = V/vi)
  pushAtDegree(pool, keyRoot, 2, '7th', 1);               // III7 (V/vi)
  pushAtDegree(pool, keyRoot, 5, 'Maj', 1);               // VI (major vi = V/ii)
  pushAtDegree(pool, keyRoot, 5, '7th', 1);               // VI7 (V/ii)
  if (tierId === 'r1-mixture-q') return pool;

  // ── Tier 6: + Modal mixtures (DIFFERENT root degrees from other modes) ─
  // mixtureLevel=1 — must be followed by a diatonic chord.
  // bII (Phrygian) — 1 semitone above tonic, major
  pushChromaticDegree(pool, keyRoot, 1, 'Maj', 1);        // ♭II
  pushChromaticDegree(pool, keyRoot, 1, 'Maj7', 1);       // ♭IImaj7
  // bIII (Aeolian) — 3 semitones above tonic, major
  pushChromaticDegree(pool, keyRoot, 3, 'Maj', 1);        // ♭III
  pushChromaticDegree(pool, keyRoot, 3, 'Maj7', 1);       // ♭IIImaj7
  // bVI (Aeolian/Phrygian) — 8 semitones above tonic, major
  pushChromaticDegree(pool, keyRoot, 8, 'Maj', 1);        // ♭VI
  pushChromaticDegree(pool, keyRoot, 8, 'Maj7', 1);       // ♭VImaj7
  // bVII (Mixolydian/Aeolian) — 10 semitones above tonic, major
  pushChromaticDegree(pool, keyRoot, 10, 'Maj', 1);       // ♭VII
  pushChromaticDegree(pool, keyRoot, 10, '7th', 1);       // ♭VII7
  // #IV (Lydian) — 6 semitones above tonic, typically m7♭5 (half-dim)
  pushChromaticDegree(pool, keyRoot, 6, 'm7b5', 1);       // ♯IV m7♭5
  pushChromaticDegree(pool, keyRoot, 6, 'dim7', 1);       // ♯IV°7
  return pool;
}

/**
 * Pick a random chord from pool.
 * - Avoid same root as previous (when possible)
 * - If lastWasMixture, filter pool to mixtureLevel=0 only (no consecutive mixtures)
 */
export function pickNextChord(pool, prevChord = null, lastWasMixture = false) {
  if (!pool.length) return null;
  const candidates = lastWasMixture
    ? pool.filter(c => c.mixtureLevel === 0)
    : pool;
  const source = candidates.length ? candidates : pool;
  if (source.length === 1 || !prevChord) {
    return source[Math.floor(Math.random() * source.length)];
  }
  // Try up to 8 times to find a different root than the previous one
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = source[Math.floor(Math.random() * source.length)];
    if (candidate.rootPitch !== prevChord.rootPitch) return candidate;
  }
  return source[Math.floor(Math.random() * source.length)];
}

/**
 * Pick a random diatonic key (for R1's "random per session" option)
 */
export function pickRandomKey() {
  const keys = ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb', 'Ab'];
  return keys[Math.floor(Math.random() * keys.length)];
}
