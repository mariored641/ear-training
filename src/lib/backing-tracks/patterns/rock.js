// Rock - Even 16ths (Brit Rock / Rock Ballad)
// Grid: 16 steps per bar ('16n') — straight, NOT swing
// beat = Math.floor(step / 4), pos = step % 4
// Substyle A: Closed hi-hat | Substyle B: Ride cymbal
// Default tempo: ~85 BPM

import * as Tone from 'tone'
import { powerChordVoicing, getBassNote } from '../chords.js'

export const ROCK_DEFAULTS = {
  tempo: 128,
  defaultChord: { root: 'C', quality: 'major', extensions: [] },
  presetBarCount: 8,
  preset: [
    { root: 'C', quality: 'major', extensions: [] },
    { root: 'C', quality: 'major', extensions: [] },
    { root: 'G', quality: 'major', extensions: [] },
    { root: 'G', quality: 'major', extensions: [] },
    { root: 'A', quality: 'minor', extensions: [] },
    { root: 'A', quality: 'minor', extensions: [] },
    { root: 'F', quality: 'major', extensions: [] },
    { root: 'F', quality: 'major', extensions: [] },
  ],
}

const humanize = (v) => v * (0.95 + Math.random() * 0.10)

export function rockPattern(step, beat, pos, chord, nextChord, time, instruments, volumes, substyle = 'A', isTransition = false) {
  const { rockGuitar, bass, drums } = instruments
  const { guitar: guitarVol, bass: bassVol, drums: drumsVol } = volumes
  const dur8n = Tone.Time('8n').toSeconds()

  // ── Guitar: power chord (root + fifth) on every beat downbeat ──
  if (pos === 0) {
    const notes = powerChordVoicing(chord, 3)
    notes.forEach(note => {
      rockGuitar.triggerAttackRelease(note, dur8n * 0.9, time, humanize(0.9 * guitarVol))
    })
  }

  // ── Bass: root locked to kick (beats 1 and 3 = steps 0 and 8) ──
  if (step === 0 || step === 8) {
    bass.triggerAttackRelease(getBassNote(chord, 2), '4n', time, humanize(0.85 * bassVol))
  }

  // ── Drums ──

  // Crash cymbal marks every substyle transition
  if (isTransition) {
    drums.triggerAttackRelease('A3', '8n', time, humanize(0.88 * drumsVol))
  }

  if (substyle === 'A') {
    //                    1  e  +  a  2  e  +  a  3  e  +  a  4  e  +  a
    // Open HH  (A#2)     X  .  X  .  X  .  X  .  X  .  X  .  X  .  X  .
    // Snare    (D2)      .  .  .  .  X  .  .  .  .  .  .  .  X  .  .  .
    // Kick     (C2)      X  .  .  .  .  .  .  .  X  .  X  .  .  .  .  .
    switch (step) {
      case  0:
        drums.triggerAttackRelease('A#2', '16n', time, humanize(0.72 * drumsVol)) // Open HH
        drums.triggerAttackRelease('C2',  '16n', time, humanize(0.87 * drumsVol)) // Kick
        break
      case  2:
        drums.triggerAttackRelease('A#2', '16n', time, humanize(0.72 * drumsVol)) // Open HH
        break
      case  4:
        drums.triggerAttackRelease('A#2', '16n', time, humanize(0.72 * drumsVol)) // Open HH
        drums.triggerAttackRelease('D2',  '16n', time, humanize(0.88 * drumsVol)) // Snare
        break
      case  6:
        drums.triggerAttackRelease('A#2', '16n', time, humanize(0.72 * drumsVol)) // Open HH
        break
      case  8:
        drums.triggerAttackRelease('A#2', '16n', time, humanize(0.72 * drumsVol)) // Open HH
        drums.triggerAttackRelease('C2',  '16n', time, humanize(0.87 * drumsVol)) // Kick
        break
      case 10:
        drums.triggerAttackRelease('A#2', '16n', time, humanize(0.72 * drumsVol)) // Open HH
        drums.triggerAttackRelease('C2',  '16n', time, humanize(0.87 * drumsVol)) // Kick
        break
      case 12:
        drums.triggerAttackRelease('A#2', '16n', time, humanize(0.72 * drumsVol)) // Open HH
        drums.triggerAttackRelease('D2',  '16n', time, humanize(0.88 * drumsVol)) // Snare
        break
      case 14:
        drums.triggerAttackRelease('A#2', '16n', time, humanize(0.72 * drumsVol)) // Open HH
        break
    }

  } else {
    //                    1  e  +  a  2  e  +  a  3  e  +  a  4  e  +  a
    // Ride     (D#3)     X  .  .  .  X  .  .  .  X  .  .  .  X  .  .  .
    // Snare    (D2)      .  .  .  .  .  .  .  .  X  .  .  .  .  .  .  .
    // Kick     (C2)      X  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .
    switch (step) {
      case  0:
        drums.triggerAttackRelease('D#3', '16n', time, humanize(0.70 * drumsVol)) // Ride
        drums.triggerAttackRelease('C2',  '16n', time, humanize(0.87 * drumsVol)) // Kick
        break
      case  4:
        drums.triggerAttackRelease('D#3', '16n', time, humanize(0.70 * drumsVol)) // Ride
        break
      case  8:
        drums.triggerAttackRelease('D#3', '16n', time, humanize(0.70 * drumsVol)) // Ride
        drums.triggerAttackRelease('D2',  '16n', time, humanize(0.88 * drumsVol)) // Snare
        break
      case 12:
        drums.triggerAttackRelease('D#3', '16n', time, humanize(0.70 * drumsVol)) // Ride
        break
    }
  }
}
