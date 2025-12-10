import { melodyLibrary, noteEntities, guitarPositions } from '../constants/melodyLibrary';
import { noteToMidi, calculateFretboardPosition, getNoteAtFret } from './fretboardCalculations';

/**
 * Gets a melody from library or generates random
 * @param {String} source - 'library' or 'random'
 * @param {Object} settings - Current settings
 * @param {Number} melodyIndex - Current melody number in session
 * @returns {Object} Melody object with notes array
 */
export function getMelody(source, settings, melodyIndex) {
  if (source === 'library') {
    // Get melody template from library
    const melodyTemplate = melodyLibrary[melodyIndex % melodyLibrary.length];

    // Convert noteSequence to full note objects with guitar positions
    const notes = melodyTemplate.noteSequence.map(noteId => {
      const noteEntity = noteEntities.find(n => n.id === noteId);

      // Get all possible guitar positions for this note
      const possiblePositions = guitarPositions.filter(p => p.noteId === noteId);

      // For now, use the first position (later can be randomized or user-selected)
      const position = possiblePositions[0];

      return {
        note: noteEntity.note,
        octave: noteEntity.octave,
        fullNote: noteEntity.fullNote,
        string: position.string,
        fret: position.fret
      };
    });

    return {
      ...melodyTemplate,
      notes
    };
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

      // NEW APPROACH: Pick random string and fret first, then check if note is available
      string = availableStrings[Math.floor(Math.random() * availableStrings.length)];
      fret = frets.from + Math.floor(Math.random() * (frets.to - frets.from + 1));

      // Calculate what note this string+fret combination produces
      const noteInfo = getNoteAtFret(string, fret);
      note = noteInfo.note;
      octave = noteInfo.octave;

      // Check if this note is in the available notes
      if (!availableNotes[note]) {
        continue;
      }

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
