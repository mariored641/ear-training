/**
 * Rhythm Pattern Generator
 *
 * generatePattern(level, numBars) → array of building-block objects
 *
 * Algorithm:
 *  1. Fill mandatory slots (≥2 current-level blocks per bar, where feasible)
 *  2. Fill remaining beats with weighted-random from full bank
 *     (current-level blocks get 3× weight)
 *  3. Shuffle all blocks so mandatory ones aren't always first
 *  4. Check global constraints; retry up to 10 times
 *  5. Apply optional tie rule (level 3+) post-generation
 */

import { getBankForLevel, getNewBlocksForLevel } from '../constants/rhythmTrainingDefaults';

// ─── Helpers ──────────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Weighted random pick.
 * currentLevel blocks get 3× weight; all others get 1×.
 */
function weightedPick(pool, currentLevel) {
  const weights = pool.map(b => (b.level === currentLevel ? 3 : 1));
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

/**
 * Fill exactly `totalBeats` beats by picking blocks from `bank`.
 * Returns null if no solution is found within 100 iterations.
 */
function fillBeats(totalBeats, bank, currentLevel) {
  const blocks = [];
  let remaining = totalBeats;
  let iters = 0;

  while (remaining > 0 && iters < 200) {
    iters++;
    const eligible = bank.filter(b => b.duration <= remaining);
    if (eligible.length === 0) return null;
    const block = weightedPick(eligible, currentLevel);
    blocks.push(block);
    remaining -= block.duration;
  }

  return remaining === 0 ? blocks : null;
}

// ─── Global constraint checker ────────────────────────────────────────────

/**
 * Returns true if the pattern passes all global constraints.
 */
function checkConstraints(pattern, level) {
  // 1. No more than 3 consecutive all-rest quarter blocks
  let consecRests = 0;
  for (const block of pattern) {
    const hasNote = block.events.some(e => e.isNote);
    if (!hasNote) {
      consecRests++;
      if (consecRests > 3) return false;
    } else {
      consecRests = 0;
    }
  }

  // 2. No more than 4 identical blocks in a row
  let consecSame = 1;
  for (let i = 1; i < pattern.length; i++) {
    if (pattern[i].id === pattern[i - 1].id) {
      consecSame++;
      if (consecSame > 4) return false;
    } else {
      consecSame = 1;
    }
  }

  // 3. Pattern must not begin with 2+ all-rest consecutive blocks (levels 1-3)
  if (level <= 3) {
    let leadRests = 0;
    for (const block of pattern) {
      const hasNote = block.events.some(e => e.isNote);
      if (!hasNote) leadRests++;
      else break;
    }
    if (leadRests >= 2) return false;
  }

  // 4. For triplet / poly blocks: at least 50% must contain a note
  const tupleIds = new Set(['t3', 't3_r', 't3_rnr', 't3_rn', 'ht3', 'ht3_r', 'wt3', 'wt3_r', 'q5', 'q5_r', 'q7', 'q7_r']);
  const tupleBlocks = pattern.filter(b => tupleIds.has(b.id));
  if (tupleBlocks.length > 0) {
    const withNote = tupleBlocks.filter(b => b.events.some(e => e.isNote)).length;
    if (withNote / tupleBlocks.length < 0.5) return false;
  }

  return true;
}

// ─── Tie rule (level 3+) ─────────────────────────────────────────────────

/**
 * Post-process: randomly apply ties at block boundaries where eligible.
 * A tie marks the first event of block[i+1] as tied (no onset produced).
 * Probability: 30% per eligible boundary.
 */
function applyTieRule(pattern, level) {
  if (level < 3) return pattern;

  const result = pattern.map(b => ({
    ...b,
    events: b.events.map(e => ({ ...e })), // deep copy events
  }));

  for (let i = 0; i < result.length - 1; i++) {
    const curr = result[i];
    const next = result[i + 1];

    // Current block must end on the "and" (last event at time 0.5, isNote)
    const lastEvent = curr.events[curr.events.length - 1];
    if (!lastEvent.isNote || Math.abs(lastEvent.time - 0.5) > 0.001) continue;
    if (curr.duration !== 1) continue; // only for quarter-length blocks

    // Next block must start with a note on the beat (time 0)
    const firstEvent = next.events[0];
    if (!firstEvent.isNote || firstEvent.time !== 0) continue;
    if (next.duration !== 1) continue;

    // 30% chance to tie
    if (Math.random() < 0.30) {
      next.events[0] = { ...firstEvent, tied: true }; // mark as tied
    }
  }

  return result;
}

// ─── Main export ──────────────────────────────────────────────────────────

/**
 * Generate a rhythm pattern for the given level and bar count.
 *
 * @param {number} level    1-8
 * @param {number} numBars  1 | 2 | 4
 * @returns {Array}  Array of building-block objects (with possible tied events)
 */
export function generatePattern(level, numBars) {
  const totalBeats = numBars * 4;
  const bank = getBankForLevel(level);
  const newBlocks = getNewBlocksForLevel(level);

  // Blocks usable as mandatory (duration ≤ 2 so we can always fit 2 per bar)
  const mandatoryPool = newBlocks.filter(b => b.duration <= 2);

  const MAX_ATTEMPTS = 10;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let pattern = null;

    if (mandatoryPool.length === 0) {
      // No new blocks with duration ≤ 2 (e.g. level 1 has rests too, fine)
      const result = fillBeats(totalBeats, bank, level);
      if (result) pattern = shuffle(result);
    } else {
      // Step 1: Mandatory slots — 2 per bar, but only if they fit
      const maxMandatory = numBars * 2;
      const mandatory = [];
      let mandatoryBeats = 0;

      for (let i = 0; i < maxMandatory; i++) {
        const eligible = mandatoryPool.filter(b => b.duration <= totalBeats - mandatoryBeats - (maxMandatory - i - 1));
        if (eligible.length === 0) break;
        const block = pickRandom(eligible);
        mandatory.push(block);
        mandatoryBeats += block.duration;
        if (mandatoryBeats >= totalBeats) break;
      }

      // Step 2: Fill remaining with weighted random
      const remainingBeats = totalBeats - mandatoryBeats;
      if (remainingBeats < 0) continue;

      let filler = [];
      if (remainingBeats > 0) {
        filler = fillBeats(remainingBeats, bank, level);
        if (!filler) continue;
      }

      // Step 3: Shuffle mandatory + filler together
      pattern = shuffle([...mandatory, ...filler]);
    }

    if (!pattern) continue;

    // Step 4: Check global constraints
    if (!checkConstraints(pattern, level)) continue;

    // Step 5: Apply tie rule
    const finalPattern = applyTieRule(pattern, level);
    return finalPattern;
  }

  // Fallback: simple quarter notes + quarter rests
  const fallback = [];
  for (let i = 0; i < totalBeats; i++) {
    fallback.push({ ...getBankForLevel(1)[0] }); // Q_NOTE
  }
  return fallback;
}

/**
 * Compute expected onset times (in ms from bar start) for a pattern at given BPM.
 * Tied events are excluded.
 *
 * @param {Array}  pattern  array of building blocks (from generatePattern)
 * @param {number} bpm
 * @returns {number[]}  sorted list of expected onset timestamps in ms
 */
export function computeExpectedOnsets(pattern, bpm) {
  const beatMs = 60000 / bpm;
  const onsets = [];
  let currentBeat = 0;

  for (const block of pattern) {
    for (const event of block.events) {
      if (event.isNote && !event.tied) {
        onsets.push((currentBeat + event.time) * beatMs);
      }
    }
    currentBeat += block.duration;
  }

  return onsets.sort((a, b) => a - b);
}

/**
 * Evaluate detected onsets vs expected onsets.
 *
 * @param {number[]} expected     ms timestamps of expected onsets
 * @param {number[]} detected     ms timestamps of detected onsets
 * @param {number}   toleranceMs  window for matching (default 50ms)
 * @param {number}   minMatchPct  minimum fraction to pass (default 0.80)
 * @returns {{ pass, matchPct, matched, total, extraHits }}
 */
export function evaluateOnsets(expected, detected, toleranceMs = 50, minMatchPct = 0.80) {
  let matched = 0;
  const usedDetected = new Set();

  for (const exp of expected) {
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i < detected.length; i++) {
      if (usedDetected.has(i)) continue;
      const dist = Math.abs(detected[i] - exp);
      if (dist < bestDist && dist <= toleranceMs) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) {
      matched++;
      usedDetected.add(bestIdx);
    }
  }

  const total = expected.length;
  const matchPct = total > 0 ? matched / total : 0;
  const extraHits = detected.length - usedDetected.size;

  return {
    pass: matchPct >= minMatchPct,
    matchPct,
    matched,
    total,
    extraHits,
  };
}
