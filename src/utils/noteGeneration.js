/**
 * Note generation utilities for Exercise 1
 */

/**
 * Generates a random note based on settings
 * @param {Object} settings - Current settings
 * @param {Array} usedNotes - Previously used notes in this session
 * @returns {Object} { noteName: 'E', fullNote: 'E5' }
 */
export function generateRandomNote(settings, usedNotes = []) {
  const { availableNotes, octaveRange } = settings;

  // Get array of available note names
  const noteNames = Object.keys(availableNotes).filter(note => availableNotes[note]);

  if (noteNames.length === 0) {
    throw new Error('No notes available');
  }

  let noteName, fullNote;
  let attempts = 0;
  const maxAttempts = 100;

  // Get last 3 used notes for checking
  const recentNotes = usedNotes.slice(-3);

  // Generate a random note with the following constraints:
  // 1. Never repeat the exact same note (e.g., B4 -> B4)
  // 2. Don't repeat the same note name (e.g., B) more than twice in a row
  // Center octaves around C4 (middle C)
  do {
    noteName = noteNames[Math.floor(Math.random() * noteNames.length)];
    // For octaveRange=1: octave 4
    // For octaveRange=2: octaves 3-4
    // For octaveRange=3: octaves 3-5
    // For octaveRange=4: octaves 3-6
    const baseOctave = octaveRange === 1 ? 4 : 3;
    const octave = baseOctave + Math.floor(Math.random() * octaveRange);
    fullNote = `${noteName}${octave}`;
    attempts++;

    // Check if this note is acceptable
    if (recentNotes.length === 0) {
      break; // First note is always acceptable
    }

    // Rule 1: Never repeat the exact same full note
    if (fullNote === recentNotes[recentNotes.length - 1]) {
      continue; // Try again
    }

    // Rule 2: Check if the same note name appears in the last 2 notes
    if (recentNotes.length >= 2) {
      const lastNote = recentNotes[recentNotes.length - 1];
      const secondLastNote = recentNotes[recentNotes.length - 2];

      // Extract note names (without octave)
      const lastNoteName = lastNote.replace(/\d+$/, '');
      const secondLastNoteName = secondLastNote.replace(/\d+$/, '');

      // If the last 2 notes were the same note name, don't use that note name again
      if (lastNoteName === secondLastNoteName && noteName === lastNoteName) {
        continue; // Try again
      }
    }

    // All rules passed
    break;

  } while (attempts < maxAttempts);

  return { noteName, fullNote };
}

/**
 * Checks if selected note matches correct note
 * @param {String} selected - Selected note name (e.g., 'E')
 * @param {String} correct - Correct note name (e.g., 'E')
 * @returns {Boolean}
 */
export function checkAnswer(selected, correct) {
  return selected === correct;
}
