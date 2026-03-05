// Country - Two-Step pattern
// Grid: 16 steps per bar ('16n') — Even 16ths, NOT swing
// beat = Math.floor(step / 4), pos = step % 4
// Key characteristic: Side stick (C#2) at FULL velocity on beats 2 & 4
// Substyle A: Two-step | Substyle B: with ghost snare + tom fills
// Default tempo: ~100 BPM

import * as Tone from 'tone'
import { buildChordNotes, getBassNote, getFifthNote } from '../chords.js'

export const COUNTRY_DEFAULTS = {
  tempo: 100,
  defaultChord: { root: 'G', quality: 'major', extensions: [] },
  presetBarCount: 8,
  preset: [
    { root: 'C', quality: 'major', extensions: [] },
    { root: 'C', quality: 'major', extensions: [] },
    { root: 'F', quality: 'major', extensions: [] },
    { root: 'F', quality: 'major', extensions: [] },
    { root: 'C', quality: 'major', extensions: [] },
    { root: 'C', quality: 'major', extensions: [] },
    { root: 'G', quality: 'major', extensions: [] },
    { root: 'G', quality: 'major', extensions: ['7'] },
  ],
}

const humanize = (v) => v * (0.95 + Math.random() * 0.10)

export function countryPattern(step, beat, pos, chord, nextChord, time, instruments, volumes, substyle = 'A', isTransition = false) {
  const { countryGuitar, bass, drums } = instruments
  const { guitar: guitarVol, bass: bassVol, drums: drumsVol } = volumes
  const dur4n = Tone.Time('4n').toSeconds()

  // ── Guitar: acoustic strum on beats 2 and 4 (steps 4 and 12) ──
  // Strum simulation: slight note offsets + velocity taper across strings
  if (step === 4 || step === 12) {
    const notes = buildChordNotes(chord, 4)
    notes.forEach((note, i) => {
      countryGuitar.triggerAttackRelease(note, dur4n * 0.8, time + i * 0.028, (0.82 - i * 0.06) * guitarVol)
    })
  }

  // ── Bass: root-fifth alternating (DNA of country) ──
  // Beat 1 = step 0, Beat 2 = step 4, Beat 3 = step 8, Beat 4 = step 12
  if (step === 0) {
    bass.triggerAttackRelease(getBassNote(chord, 2), '4n', time, humanize(0.85 * bassVol))
  } else if (step === 4) {
    bass.triggerAttackRelease(getFifthNote(chord, 2), '4n', time, humanize(0.75 * bassVol))
  } else if (step === 8) {
    bass.triggerAttackRelease(getBassNote(chord, 2), '4n', time, humanize(0.85 * bassVol))
  } else if (step === 12) {
    bass.triggerAttackRelease(getFifthNote(chord, 2), '4n', time, humanize(0.75 * bassVol))
  }

  // ── Drums ──

  // Crash cymbal marks every substyle transition
  if (isTransition) {
    drums.triggerAttackRelease('A3', '8n', time, 1.0 * drumsVol)
  }

  // Closed hi-hat: all 16 steps — more velocity variation than rock (more human feel)
  // Range 0.28–0.61 per spec
  const hhVel = (0.28 + Math.random() * 0.33) * drumsVol
  drums.triggerAttackRelease('F#2', '16n', time, hhVel)

  // Kick: beats 1 and 3 (steps 0 and 8) — strict
  if (step === 0 || step === 8) {
    const kickVel = (substyle === 'B') ? humanize(0.87) : humanize(0.76)
    drums.triggerAttackRelease('C2', '8n', time, kickVel * drumsVol)
  }

  // Side stick: beats 2 and 4 (steps 4 and 12) — FULL VELOCITY (signature sound)
  if (step === 4 || step === 12) {
    drums.triggerAttackRelease('C#2', '8n', time, 1.0 * drumsVol)
  }

  if (substyle === 'B') {
    // Ghost snare (E2) on upbeat 16ths — very soft
    if ((step === 2 || step === 6 || step === 10 || step === 14) && Math.random() < 0.20) {
      drums.triggerAttackRelease('E2', '32n', time, 0.41 * drumsVol)
    }

    // Open hi-hat accent near phrase end
    if (step === 13 && Math.random() < 0.25) {
      drums.triggerAttackRelease('A#2', '8n', time, humanize(0.61 * drumsVol))
    }

    // Tom fill: High Tom → Mid Tom at the very end of the phrase (steps 14–15)
    if (step === 14 && Math.random() < 0.20) {
      drums.triggerAttackRelease('C3', '16n', time, humanize(0.70 * drumsVol))
    }
    if (step === 15 && Math.random() < 0.20) {
      drums.triggerAttackRelease('B2', '16n', time, humanize(0.75 * drumsVol))
    }
  }
}
