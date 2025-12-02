import { melodyLibrary } from '../constants/melodyLibrary';
import { noteToMidi, calculateFretboardPosition } from './fretboardCalculations';

/**
 * Gets a melody from library or generates random
 * @param {String} source - 'library' or 'random'
 * @param {Object} settings - Current settings
 * @param {Number} melodyIndex - Current melody number in session
 * @returns {Object} Melody object
 */
export function getMelody(source, settings, melodyIndex) {
  if (source === 'library') {
    // Return melody from library, wrap around if index exceeds library length
    return melodyLibrary[melodyIndex % melodyLibrary.length];
  } else {
    return generateRandomMelody(settings);
  }
}

/**
 * Generates a random melody based on settings
 * @param {Object} settings
 * @returns {Object} Melody object
 */
export function generateRandomMelody(settings) {
  const {
    numNotes,
    availableNotes,
    octaveRange,
    movement,
    frets,
    strings
  } = settings;

  const melody = {
    id: Date.now(),
    name: 'Random melody',
    difficulty: null,
    notes: [],
    tags: ['random']
  };

  // Get available strings as array
  const availableStrings = Object.keys(strings)
    .map((s, i) => strings[s] ? i : null)
    .filter(s => s !== null);

  // Get available notes as array
  const noteNames = Object.keys(availableNotes)
    .filter(n => availableNotes[n]);

  if (availableStrings.length === 0 || noteNames.length === 0) {
    throw new Error('No strings or notes available');
  }

  for (let i = 0; i < numNotes; i++) {
    let note, octave, string, fret;
    let validNote = false;
    let attempts = 0;
    const maxAttempts = 100;

    // Try to generate a valid note
    while (!validNote && attempts < maxAttempts) {
      attempts++;

      // Random note from available
      note = noteNames[Math.floor(Math.random() * noteNames.length)];

      // Random octave within range (starting from octave 2)
      octave = 2 + Math.floor(Math.random() * octaveRange);

      // Random string from available
      string = availableStrings[Math.floor(Math.random() * availableStrings.length)];

      // Calculate fret for this note on this string
      fret = calculateFretboardPosition(note, octave, string);

      // Check if fret is in range
      if (fret !== null && fret >= frets.from && fret <= frets.to) {
        // Check movement constraint if not first note
        if (i > 0 && movement !== 'mixed') {
          const prevNote = melody.notes[i - 1];
          const interval = Math.abs(
            noteToMidi(note, octave) - noteToMidi(prevNote.note, prevNote.octave)
          );

          // Steps: intervals of 1-2 semitones
          if (movement === 'steps' && interval > 2) continue;

          // Leaps: intervals > 2 semitones
          if (movement === 'leaps' && interval <= 2) continue;
        }

        validNote = true;
      }
    }

    if (!validNote) {
      throw new Error('Could not generate valid melody with current settings');
    }

    melody.notes.push({
      note,
      octave,
      string,
      fret,
      fullNote: `${note}${octave}`
    });
  }

  return melody;
}
