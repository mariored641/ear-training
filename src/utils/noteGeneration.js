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

  // Generate a random note that's different from the last one
  do {
    noteName = noteNames[Math.floor(Math.random() * noteNames.length)];
    const octave = 4 + Math.floor(Math.random() * octaveRange);
    fullNote = `${noteName}${octave}`;
    attempts++;
  } while (
    usedNotes.length > 0 &&
    fullNote === usedNotes[usedNotes.length - 1] &&
    attempts < maxAttempts
  );

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
