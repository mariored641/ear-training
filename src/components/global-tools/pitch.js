/**
 * pitch.js — Hz ↔ MIDI ↔ note-name + cents helpers for the Tuner.
 */

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Standard guitar tuning (EADGBE), as MIDI numbers.
const GUITAR_STRINGS = [
  { name: 'E2', midi: 40 },
  { name: 'A2', midi: 45 },
  { name: 'D3', midi: 50 },
  { name: 'G3', midi: 55 },
  { name: 'B3', midi: 59 },
  { name: 'E4', midi: 64 },
];

export function hzToMidi(hz) {
  return 69 + 12 * Math.log2(hz / 440);
}

export function midiToNoteName(midi) {
  const idx = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return { name: NOTE_NAMES[idx], octave };
}

/**
 * Analyze a detected Hz into chromatic note + cents.
 * Returns { name, octave, cents, midi } or null if hz invalid.
 */
export function analyzeChromatic(hz) {
  if (!hz || !Number.isFinite(hz) || hz <= 0) return null;
  const midi = hzToMidi(hz);
  const rounded = Math.round(midi);
  const cents = (midi - rounded) * 100;
  const { name, octave } = midiToNoteName(rounded);
  return { name, octave, cents, midi: rounded };
}

/**
 * Analyze a detected Hz, snapping to nearest guitar string (EADGBE).
 * Returns { name, octave, cents, midi } where cents = deviation from string.
 */
export function analyzeGuitar(hz) {
  if (!hz || !Number.isFinite(hz) || hz <= 0) return null;
  const midi = hzToMidi(hz);
  let best = GUITAR_STRINGS[0];
  let bestDist = Math.abs(midi - best.midi);
  for (const s of GUITAR_STRINGS) {
    const d = Math.abs(midi - s.midi);
    if (d < bestDist) { best = s; bestDist = d; }
  }
  const cents = (midi - best.midi) * 100;
  const octave = Math.floor(best.midi / 12) - 1;
  return { name: best.name.slice(0, -1), octave, cents, midi: best.midi };
}
