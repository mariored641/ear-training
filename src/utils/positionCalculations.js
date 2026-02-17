import {
  CHROMATIC_SCALE,
  STRING_TUNING,
  MAJOR_SCALE_INTERVALS,
  MINOR_SCALE_INTERVALS,
  RELATIVE_MINOR_OFFSET,
  C_AM_POSITION_RANGES,
} from '../constants/positionData';

/**
 * Get the notes of a scale given a root and type
 */
export function getScaleNotes(root, scaleType) {
  const rootIndex = CHROMATIC_SCALE.indexOf(root);
  const intervals = scaleType === 'major' ? MAJOR_SCALE_INTERVALS : MINOR_SCALE_INTERVALS;

  return intervals.map(interval => {
    const noteIndex = (rootIndex + interval) % 12;
    return CHROMATIC_SCALE[noteIndex];
  });
}

/**
 * Get the note at a specific string and fret
 */
export function getNoteAtFret(stringNum, fret) {
  const openNote = STRING_TUNING[stringNum - 1];
  const openIndex = CHROMATIC_SCALE.indexOf(openNote);
  const noteIndex = (openIndex + fret) % 12;
  return CHROMATIC_SCALE[noteIndex];
}

/**
 * Get the relative key (major->minor or minor->major)
 */
export function getRelativeKey(root, currentType) {
  const rootIndex = CHROMATIC_SCALE.indexOf(root);

  if (currentType === 'major') {
    // Major -> relative minor: 3 semitones down
    const minorIndex = (rootIndex - RELATIVE_MINOR_OFFSET + 12) % 12;
    return CHROMATIC_SCALE[minorIndex];
  } else {
    // Minor -> relative major: 3 semitones up
    const majorIndex = (rootIndex + RELATIVE_MINOR_OFFSET) % 12;
    return CHROMATIC_SCALE[majorIndex];
  }
}

/**
 * Get the scale degree (1-7) of a note within a scale, or 0 if not in scale
 */
export function getScaleDegree(note, root, scaleType) {
  const scaleNotes = getScaleNotes(root, scaleType);
  const index = scaleNotes.indexOf(note);
  return index !== -1 ? index + 1 : 0;
}

/**
 * Calculate ALL scale notes on the entire fretboard (0-15 frets, 6 strings).
 * This is the core function - computes every occurrence of each scale tone.
 */
export function getAllScaleNotesOnFretboard(root, scaleType) {
  const scaleNotes = getScaleNotes(root, scaleType);
  const relativeRoot = getRelativeKey(root, scaleType);
  const majorRoot = scaleType === 'major' ? root : relativeRoot;
  const minorRoot = scaleType === 'minor' ? root : relativeRoot;

  const notes = [];

  for (let string = 1; string <= 6; string++) {
    for (let fret = 0; fret <= 24; fret++) {
      const note = getNoteAtFret(string, fret);

      if (scaleNotes.includes(note)) {
        notes.push({
          string,
          fret,
          note,
          scaleDegree: getScaleDegree(note, root, scaleType),
          isRoot: note === root,
          isMajorRoot: note === majorRoot,
          isMinorRoot: note === minorRoot,
        });
      }
    }
  }

  return notes;
}

/**
 * Calculate the semitone offset from C for any key.
 * All positions are derived from C major / A minor base ranges,
 * shifted by the number of semitones between C and the major root.
 */
function getSemitoneOffsetFromC(selectedRoot, selectedType) {
  const majorRoot = selectedType === 'major'
    ? selectedRoot
    : getRelativeKey(selectedRoot, 'minor');

  const cIndex = CHROMATIC_SCALE.indexOf('C');
  const rootIndex = CHROMATIC_SCALE.indexOf(majorRoot);
  return (rootIndex - cIndex + 12) % 12;
}

/**
 * Calculate all fret ranges for a CAGED position, including octave mirrors.
 * Takes the hardcoded C/Am base ranges, shifts by semitone offset,
 * then adds +12 and -12 octave copies if they fall within 0-24.
 * Returns an array of ranges.
 */
export function getPositionRanges(position, selectedRoot, selectedType) {
  const base = C_AM_POSITION_RANGES[position];
  const offset = getSemitoneOffsetFromC(selectedRoot, selectedType);

  const primaryStart = base.fretStart + offset;
  const primaryEnd = base.fretEnd + offset;

  const candidates = [
    { fretStart: primaryStart - 12, fretEnd: primaryEnd - 12 },
    { fretStart: primaryStart, fretEnd: primaryEnd },
    { fretStart: primaryStart + 12, fretEnd: primaryEnd + 12 },
  ];

  // Keep only ranges that overlap with the playable fretboard (0-24)
  return candidates
    .filter(r => r.fretEnd >= 0 && r.fretStart <= 24)
    .map(r => ({
      name: position,
      fretStart: Math.max(0, r.fretStart),
      fretEnd: Math.min(24, r.fretEnd),
    }));
}

/**
 * Backward-compatible: returns the primary (first) range.
 */
export function getPositionRange(position, selectedRoot, selectedType) {
  return getPositionRanges(position, selectedRoot, selectedType)[0];
}

/**
 * Filter fretboard notes to those within any of the position's fret ranges
 * (including octave mirrors).
 */
export function filterByPosition(allNotes, position, selectedRoot, selectedType) {
  const ranges = getPositionRanges(position, selectedRoot, selectedType);
  return allNotes.filter(n =>
    ranges.some(r => n.fret >= r.fretStart && n.fret <= r.fretEnd)
  );
}

/**
 * Filter fretboard notes by multiple positions (union, no duplicates)
 */
export function filterByPositions(allNotes, positions, selectedRoot, selectedType) {
  if (positions.length === 0) return [];

  const filtered = [];
  const seen = new Set();

  for (const position of positions) {
    const positionNotes = filterByPosition(allNotes, position, selectedRoot, selectedType);

    for (const note of positionNotes) {
      const key = `${note.string}-${note.fret}`;
      if (!seen.has(key)) {
        seen.add(key);
        filtered.push(note);
      }
    }
  }

  return filtered;
}

/**
 * Arpeggio degree map — expressed as 1-indexed degrees of the MAJOR scale.
 * Each arpeggio lists 3 scale degrees from the major scale.
 *
 * I   = 1,3,5
 * IV  = 4,6,1
 * V   = 5,7,2
 * i   = 6,1,3  (relative minor tonic)
 * iv  = 2,4,6  (relative minor subdominant)
 * v   = 3,5,7  (relative minor dominant)
 * dim = 7,2,4  (leading-tone diminished)
 */
const ARPEGGIO_MAJOR_DEGREES = {
  'I':   [1, 3, 5],
  'IV':  [4, 6, 1],
  'V':   [5, 7, 2],
  'i':   [6, 1, 3],
  'iv':  [2, 4, 6],
  'v':   [3, 5, 7],
  'dim': [7, 2, 4],
};

/**
 * Given an arpeggio ID and a scale (root + type), return the Set of note names
 * that belong to that arpeggio.
 *
 * The mapping is always based on the MAJOR scale of the key (relative major
 * if the current scale is minor), so that C major and A minor produce identical
 * highlight sets.
 */
export function getArpeggioNoteSet(arpeggioId, root, scaleType) {
  // Always work from the major root
  const majorRoot = scaleType === 'major' ? root : getRelativeKey(root, 'minor');

  // Get the 7 notes of that major scale
  const majorScaleNotes = getScaleNotes(majorRoot, 'major');

  const degrees = ARPEGGIO_MAJOR_DEGREES[arpeggioId];
  if (!degrees) return new Set();

  // degrees are 1-indexed
  return new Set(degrees.map(d => majorScaleNotes[d - 1]));
}

/**
 * Main entry point: generate notes to display on the fretboard.
 */
export function generateFretboardNotes(selectedRoot, selectedType, selectedPositions, showAll) {
  // Step 1: Calculate all scale notes on the entire fretboard
  const allNotes = getAllScaleNotesOnFretboard(selectedRoot, selectedType);

  // Step 2: If showAll - return everything
  if (showAll) {
    return allNotes;
  }

  // Step 3: If positions are selected - filter by their fret ranges
  if (selectedPositions.length > 0) {
    return filterByPositions(allNotes, selectedPositions, selectedRoot, selectedType);
  }

  // Step 4: Nothing selected - show nothing
  return [];
}
