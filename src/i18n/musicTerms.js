const HEBREW_NOTE_NAMES = {
  C: 'דו',
  D: 'רה',
  E: 'מי',
  F: 'פה',
  G: 'סול',
  A: 'לה',
  B: 'סי',
};

const ACCIDENTAL_NAMES = {
  '#': 'דיאז',
  '♯': 'דיאז',
  b: 'במול',
  '♭': 'במול',
};

export function normalizeDisplayAccidentals(note) {
  return String(note || '').replaceAll('#', '♯').replaceAll('b', '♭');
}

export function formatNoteName(note, language = 'en') {
  const raw = String(note || '');
  if (!raw || language !== 'he') return normalizeDisplayAccidentals(raw);

  const match = /^([A-Ga-g])([#♯b♭]{0,2})(.*)$/.exec(raw);
  if (!match) return raw;

  const [, letterRaw, accidentals, suffix] = match;
  const letter = letterRaw.toUpperCase();
  const accidentalWords = [...accidentals]
    .map((accidental) => ACCIDENTAL_NAMES[accidental])
    .filter(Boolean)
    .join(' ');
  const hebrew = [HEBREW_NOTE_NAMES[letter], accidentalWords].filter(Boolean).join(' ');
  const latin = normalizeDisplayAccidentals(`${letter}${accidentals}${suffix}`);
  return `${latin} — ${hebrew}`;
}

export function formatNoteList(notes, language = 'en') {
  return notes.map((note) => formatNoteName(note, language));
}
