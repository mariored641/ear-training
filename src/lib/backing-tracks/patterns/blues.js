// Blues - Heavy Shuffle pattern
// Grid: 12 steps per bar ('8t') — Triplet 8ths (shuffle feel)
// beat = Math.floor(step / 3), pos = step % 3
// Substyle A: Dense ride + strong snare | Substyle B: Fuller, extra kick hit
// Default tempo: ~100 BPM

import * as Tone from 'tone'
import { dyadVoicing, getBassNote, CHROMATIC } from '../chords.js'

export const BLUES_DEFAULTS = {
  tempo: 100,
  defaultChord: { root: 'C', quality: 'major', extensions: ['7'] },
  presetBarCount: 12,
  preset: [
    { root: 'C', quality: 'major', extensions: ['7'] },
    { root: 'F', quality: 'major', extensions: ['7'] },
    { root: 'C', quality: 'major', extensions: ['7'] },
    { root: 'C', quality: 'major', extensions: ['7'] },
    { root: 'F', quality: 'major', extensions: ['7'] },
    { root: 'F', quality: 'major', extensions: ['7'] },
    { root: 'C', quality: 'major', extensions: ['7'] },
    { root: 'C', quality: 'major', extensions: ['7'] },
    { root: 'G', quality: 'major', extensions: ['7'] },
    { root: 'F', quality: 'major', extensions: ['7'] },
    { root: 'C', quality: 'major', extensions: ['7'] },
    { root: 'G', quality: 'major', extensions: ['7'] },
  ],
}

const humanize = (v) => v * (0.95 + Math.random() * 0.10)

export function bluesPattern(step, beat, pos, chord, nextChord, time, instruments, volumes, substyle = 'A', isTransition = false) {
  const { bluesGuitar, bass, drums } = instruments
  const { guitar: guitarVol, bass: bassVol, drums: drumsVol } = volumes
  const dur4n = Tone.Time('4n').toSeconds()
  const dur8n = Tone.Time('8n').toSeconds()

  // Blues lick notes: fifth and b7th of the chord root
  const rootIdx = CHROMATIC.indexOf(chord.root)
  const fifthNote = `${CHROMATIC[(rootIdx + 7)  % 12]}3`
  const b7thNote  = `${CHROMATIC[(rootIdx + 10) % 12]}3`

  // ── Guitar: dyad (root + fifth) on beats 1 and 3 ──
  if (step === 0 || step === 6) {
    const notes = dyadVoicing(chord, 3)
    notes.forEach(note => {
      bluesGuitar.triggerAttackRelease(note, dur4n, time, humanize(0.85 * guitarVol))
    })
  }

  // ── Blues licks: fifth on swung upbeat (pos 2 of beats 1 & 3) ──
  if (step === 2 || step === 8) {
    bluesGuitar.triggerAttackRelease(fifthNote, dur8n * 0.6, time, humanize(0.65 * guitarVol))
  }

  // ── Blues licks: b7th passing note on beat 2 pos 1 and beat 4 pos 1 ──
  if (step === 4 || step === 10) {
    bluesGuitar.triggerAttackRelease(b7thNote, dur8n * 0.6, time, humanize(0.6 * guitarVol))
  }

  // ── Bass: shuffle feel ──
  if (step === 0) {
    bass.triggerAttackRelease(getBassNote(chord, 2), '4n', time, humanize(0.8 * bassVol))
  } else if (step === 3) {
    bass.triggerAttackRelease(getBassNote(chord, 2), '8n', time, humanize(0.65 * bassVol))
  } else if (step === 6) {
    bass.triggerAttackRelease(getBassNote(chord, 2), '4n', time, humanize(0.8 * bassVol))
  } else if (step === 9) {
    bass.triggerAttackRelease(getBassNote(chord, 2), '8n', time, humanize(0.65 * bassVol))
  }

  // ── Drums ──

  // Crash (A3) at maximum velocity marks substyle transitions
  if (isTransition) {
    drums.triggerAttackRelease('A3', '8n', time, 1.0 * drumsVol)
  }

  if (substyle === 'A') {
    //                    1     +  2     +  3     +  4     +
    // Closed HH(F#2)     X  .  X  .  .  X  .  .  X  .  .  X
    // Snare    (D2)      .  .  .  X  .  .  .  .  .  X  .  .
    // Kick     (C2)      X  .  .  .  .  X  X  .  .  .  .  X
    switch (step) {
      case  0: // beat 1 pos0
        drums.triggerAttackRelease('F#2', '16n', time, humanize(0.70 * drumsVol)) // Closed HH
        drums.triggerAttackRelease('C2',  '16n', time, humanize(0.87 * drumsVol)) // Kick
        break
      case  2: // beat 1 pos2
        drums.triggerAttackRelease('F#2', '16n', time, humanize(0.70 * drumsVol)) // Closed HH
        break
      case  3: // beat 2 pos0
        drums.triggerAttackRelease('D2',  '16n', time, humanize(0.88 * drumsVol)) // Snare
        break
      case  5: // beat 2 pos2
        drums.triggerAttackRelease('F#2', '16n', time, humanize(0.70 * drumsVol)) // Closed HH
        drums.triggerAttackRelease('C2',  '16n', time, humanize(0.87 * drumsVol)) // Kick
        break
      case  6: // beat 3 pos0
        drums.triggerAttackRelease('C2',  '16n', time, humanize(0.87 * drumsVol)) // Kick
        break
      case  8: // beat 3 pos2
        drums.triggerAttackRelease('F#2', '16n', time, humanize(0.70 * drumsVol)) // Closed HH
        break
      case  9: // beat 4 pos0
        drums.triggerAttackRelease('D2',  '16n', time, humanize(0.88 * drumsVol)) // Snare
        break
      case 11: // beat 4 pos2
        drums.triggerAttackRelease('F#2', '16n', time, humanize(0.70 * drumsVol)) // Closed HH
        drums.triggerAttackRelease('C2',  '16n', time, humanize(0.87 * drumsVol)) // Kick
        break
    }

  } else {
    //                    1     +  2     +  3     +  4     +
    // Ride     (D#3)     X  .  .  X  .  .  X  .  .  X  .  .
    // Snare    (D2)      .  .  .  X  .  .  .  .  .  X  .  .
    // Rim/Stick(C#2)     .  .  .  .  X  .  .  .  .  .  .  X
    // Kick     (C2)      X  .  .  .  .  X  X  .  .  .  .  X
    switch (step) {
      case  0: // beat 1 pos0
        drums.triggerAttackRelease('D#3', '16n', time, humanize(0.70 * drumsVol)) // Ride
        drums.triggerAttackRelease('C2',  '16n', time, humanize(0.87 * drumsVol)) // Kick
        break
      case  3: // beat 2 pos0
        drums.triggerAttackRelease('D#3', '16n', time, humanize(0.70 * drumsVol)) // Ride
        drums.triggerAttackRelease('D2',  '16n', time, humanize(0.88 * drumsVol)) // Snare
        break
      case  4: // beat 2 pos1
        drums.triggerAttackRelease('C#2', '16n', time, humanize(0.95 * drumsVol)) // Rim/Stick
        break
      case  5: // beat 2 pos2
        drums.triggerAttackRelease('C2',  '16n', time, humanize(0.87 * drumsVol)) // Kick
        break
      case  6: // beat 3 pos0
        drums.triggerAttackRelease('D#3', '16n', time, humanize(0.70 * drumsVol)) // Ride
        drums.triggerAttackRelease('C2',  '16n', time, humanize(0.87 * drumsVol)) // Kick
        break
      case  9: // beat 4 pos0
        drums.triggerAttackRelease('D#3', '16n', time, humanize(0.70 * drumsVol)) // Ride
        drums.triggerAttackRelease('D2',  '16n', time, humanize(0.88 * drumsVol)) // Snare
        break
      case 11: // beat 4 pos2
        drums.triggerAttackRelease('C#2', '16n', time, humanize(0.95 * drumsVol)) // Rim/Stick
        drums.triggerAttackRelease('C2',  '16n', time, humanize(0.87 * drumsVol)) // Kick
        break
    }
  }
}
