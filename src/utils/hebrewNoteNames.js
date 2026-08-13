// Hebrew (fixed-do solfège) note names, e.g. C -> דו, D -> רה.
// Accidentals keep the same # / b symbols used elsewhere in the app (F# -> פה#).
const LETTER_TO_HEBREW = {
  C: 'דו',
  D: 'רה',
  E: 'מי',
  F: 'פה',
  G: 'סול',
  A: 'לה',
  B: 'סי',
};

export function toHebrewNoteName(note) {
  if (!note) return '';
  const letter = note[0].toUpperCase();
  const accidental = note.slice(1);
  const heb = LETTER_TO_HEBREW[letter];
  return heb ? heb + accidental : note;
}
