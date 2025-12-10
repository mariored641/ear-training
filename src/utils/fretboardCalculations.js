import { NOTES } from '../constants/notes';

/**
 * Helper function to convert note and octave to MIDI number
 * @param {string} note - Note name (e.g., 'C', 'C#')
 * @param {number} octave - Octave number
 * @returns {number} MIDI number
 */
export function noteToMidi(note, octave) {
  const noteValues = {
    'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
    'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
  };
  return (octave + 1) * 12 + noteValues[note];
}

/**
 * Calculates fret position for a note on a string
 * @param {String} note - Note name (e.g., 'C')
 * @param {Number} octave - Octave number
 * @param {Number} string - String number (0-5)
 * @returns {Number} Fret number (or null if not possible)
 */
export function calculateFretboardPosition(note, octave, string) {
  // Standard tuning
  const stringNotes = [
    { note: 'E', octave: 2 }, // String 0 (low E)
    { note: 'A', octave: 2 }, // String 1
    { note: 'D', octave: 3 }, // String 2
    { note: 'G', octave: 3 }, // String 3
    { note: 'B', octave: 3 }, // String 4
    { note: 'E', octave: 4 }  // String 5 (high e)
  ];

  const targetMidi = noteToMidi(note, octave);
  const openStringMidi = noteToMidi(
    stringNotes[string].note,
    stringNotes[string].octave
  );

  const fret = targetMidi - openStringMidi;

  // Valid fret range: 0-24
  if (fret >= 0 && fret <= 24) {
    return fret;
  }

  return null; // Not playable on this string
}

/**
 * Get the note name at a specific fret on a string
 * @param {Number} string - String number (0-5)
 * @param {Number} fret - Fret number (0-24)
 * @returns {Object} { note, octave, fullNote }
 */
export function getNoteAtFret(string, fret) {
  const stringNotes = [
    { note: 'E', octave: 2 }, // String 0
    { note: 'A', octave: 2 }, // String 1
    { note: 'D', octave: 3 }, // String 2
    { note: 'G', octave: 3 }, // String 3
    { note: 'B', octave: 3 }, // String 4
    { note: 'E', octave: 4 }  // String 5
  ];

  const openStringMidi = noteToMidi(
    stringNotes[string].note,
    stringNotes[string].octave
  );

  const targetMidi = openStringMidi + fret;
  const octave = Math.floor((targetMidi - 12) / 12);
  const noteIndex = targetMidi % 12;
  const note = NOTES[noteIndex];

  return {
    note,
    octave,
    fullNote: `${note}${octave}`
  };
}

/**
 * Checks if selected position matches correct note
 * @param {Number} selectedString - 0-5
 * @param {Number} selectedFret - 0-24
 * @param {Object} correctNote - Note object from melody with {note, octave, fullNote}
 * @returns {Boolean}
 */
export function checkNotePosition(selectedString, selectedFret, correctNote) {
  // Get the note at the selected position
  const selectedNoteInfo = getNoteAtFret(selectedString, selectedFret);

  // Check if it matches the correct note (any valid position is accepted)
  return (
    selectedNoteInfo.note === correctNote.note &&
    selectedNoteInfo.octave === correctNote.octave
  );
}
