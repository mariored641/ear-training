// Jazz - Medium Swing pattern
// Grid: 12 steps per bar ('8t') — Triplet 8ths (swing feel)
// beat = Math.floor(step / 3), pos = step % 3
// Substyle A: Hi-hat + side stick | Substyle B: Ride + pedal hi-hat
// Default tempo: ~120 BPM

import * as Tone from 'tone'
import { shellVoicing, getBassNote, getFifthNote, getApproachNote } from '../chords.js'

export const JAZZ_DEFAULTS = {
  tempo: 120,
  defaultChord: { root: 'C', quality: 'major', extensions: ['maj7'] },
  presetBarCount: 8,
  preset: [
    { root: 'D', quality: 'minor', extensions: ['7'] },
    { root: 'G', quality: 'major', extensions: ['7'] },
    { root: 'C', quality: 'major', extensions: ['maj7'] },
    { root: 'A', quality: 'minor', extensions: ['7'] },
    { root: 'D', quality: 'minor', extensions: ['7'] },
    { root: 'G', quality: 'major', extensions: ['7'] },
    { root: 'C', quality: 'major', extensions: ['maj7'] },
    { root: 'C', quality: 'major', extensions: ['maj7'] },
  ],
}

const humanize = (v) => v * (0.95 + Math.random() * 0.10)

export function jazzPattern(step, beat, pos, chord, nextChord, time, instruments, volumes, substyle = 'A', isTransition = false) {
  const { piano, bass, drums } = instruments
  const { piano: pianoVol, bass: bassVol, drums: drumsVol } = volumes
  const dur8n = Tone.Time('8n').toSeconds()

  // ── Piano: shell comping at steps 6, 9, 11 ──
  if (step === 6 || step === 9 || step === 11) {
    const notes = shellVoicing(chord, 4)
    notes.forEach(note => {
      piano.triggerAttackRelease(note, dur8n, time, humanize(0.7 * pianoVol))
    })
  }

  // ── Bass: root on 1, fifth on 3, approach on "and of 4" ──
  if (step === 0) {
    bass.triggerAttackRelease(getBassNote(chord, 2), '4n', time, humanize(0.8 * bassVol))
  } else if (step === 6) {
    bass.triggerAttackRelease(getFifthNote(chord, 2), '8n', time, humanize(0.65 * bassVol))
  } else if (step === 10) {
    bass.triggerAttackRelease(getApproachNote(nextChord, 2), '8n', time, humanize(0.6 * bassVol))
  }

  // ── Drums ──

  // Crash 2 (C#3) marks substyle transitions
  if (isTransition) {
    drums.triggerAttackRelease('C#3', '8n', time, humanize(0.63 * drumsVol))
  }

  if (substyle === 'A') {
    //                    1     +  2     +  3     +  4     +
    // Open HH  (A#2)     X  .  .  .  .  X  X  .  .  .  .  X
    // Pedal HH (G#2)     .  .  .  X  .  .  .  .  .  .  .  .
    // Snare    (D2)      .  .  .  X  .  .  .  .  X  .  .  .
    // Kick     (C2)      X  .  .  .  .  .  X  .  .  .  .  .
    switch (step) {
      case  0: // beat 1 pos0
        drums.triggerAttackRelease('A#2', '16n', time, humanize(0.72 * drumsVol)) // Open HH
        drums.triggerAttackRelease('C2',  '16n', time, humanize(0.87 * drumsVol)) // Kick
        break
      case  3: // beat 2 pos0
        drums.triggerAttackRelease('G#2', '16n', time, humanize(0.65 * drumsVol)) // Pedal HH
        drums.triggerAttackRelease('D2',  '16n', time, humanize(0.88 * drumsVol)) // Snare
        break
      case  5: // beat 2 pos2
        drums.triggerAttackRelease('A#2', '16n', time, humanize(0.72 * drumsVol)) // Open HH
        break
      case  6: // beat 3 pos0
        drums.triggerAttackRelease('A#2', '16n', time, humanize(0.72 * drumsVol)) // Open HH
        drums.triggerAttackRelease('C2',  '16n', time, humanize(0.87 * drumsVol)) // Kick
        break
      case  8: // beat 3 pos2
        drums.triggerAttackRelease('D2',  '16n', time, humanize(0.88 * drumsVol)) // Snare
        break
      case 11: // beat 4 pos2
        drums.triggerAttackRelease('A#2', '16n', time, humanize(0.72 * drumsVol)) // Open HH
        break
    }

  } else {
    //                    1     +  2     +  3     +  4     +
    // Open HH  (A#2)     X  .  .  X  .  X  .  .  .  .  .  .
    // Closed HH(F#2)     .  .  X  .  .  .  .  .  .  .  .  .
    // Pedal HH (G#2)     .  .  .  .  .  .  X  .  .  X  .  .
    // Snare    (D2)      .  .  .  X  .  .  .  .  .  X  .  .
    // Kick     (C2)      X  .  .  .  .  .  X  .  .  .  .  .
    switch (step) {
      case  0: // beat 1 pos0
        drums.triggerAttackRelease('A#2', '16n', time, humanize(0.72 * drumsVol)) // Open HH
        drums.triggerAttackRelease('C2',  '16n', time, humanize(0.87 * drumsVol)) // Kick
        break
      case  2: // beat 1 pos2
        drums.triggerAttackRelease('F#2', '16n', time, humanize(0.70 * drumsVol)) // Closed HH
        break
      case  3: // beat 2 pos0
        drums.triggerAttackRelease('A#2', '16n', time, humanize(0.72 * drumsVol)) // Open HH
        drums.triggerAttackRelease('D2',  '16n', time, humanize(0.88 * drumsVol)) // Snare
        break
      case  5: // beat 2 pos2
        drums.triggerAttackRelease('A#2', '16n', time, humanize(0.72 * drumsVol)) // Open HH
        break
      case  6: // beat 3 pos0
        drums.triggerAttackRelease('G#2', '16n', time, humanize(0.65 * drumsVol)) // Pedal HH
        drums.triggerAttackRelease('C2',  '16n', time, humanize(0.87 * drumsVol)) // Kick
        break
      case  9: // beat 4 pos0
        drums.triggerAttackRelease('G#2', '16n', time, humanize(0.65 * drumsVol)) // Pedal HH
        drums.triggerAttackRelease('D2',  '16n', time, humanize(0.88 * drumsVol)) // Snare
        break
    }
  }
}
