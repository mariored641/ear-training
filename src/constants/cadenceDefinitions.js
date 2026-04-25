/**
 * Cadence definitions — generates 5 cadence types in any of 12 keys, major or minor.
 * Used by F1 (cadence ID), F0 (single chord-with-cadence reference), and ReferencePlayer.
 */

const PC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const noteToPc = (n) => {
  const m = n.match(/^([A-G])([#b]?)/);
  if (!m) return 0;
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]];
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return (base + acc + 12) % 12;
};
const pcToNote = (pc) => PC[((pc % 12) + 12) % 12];

// Build the chord name at scale degree (1-7) of a key.
// degree: 1..7, key: e.g. 'C', mode: 'major'|'minor'
// Returns chord-symbol matching extended-chord vocabulary keys.
export function chordAtDegree(key, mode, degree, quality = 'auto') {
  const rootPc = noteToPc(key);
  const major = [0, 2, 4, 5, 7, 9, 11]; // I-VII
  const minor = [0, 2, 3, 5, 7, 8, 10]; // i-VII (natural)
  const scale = mode === 'minor' ? minor : major;
  const noteName = pcToNote(rootPc + scale[degree - 1]);
  if (quality !== 'auto') return noteName + quality;

  // Default qualities per scale degree.
  if (mode === 'major') {
    return [
      noteName,            // I
      noteName + 'm',      // ii
      noteName + 'm',      // iii
      noteName,            // IV
      noteName,            // V
      noteName + 'm',      // vi
      noteName + 'dim'     // vii°
    ][degree - 1];
  } else {
    return [
      noteName + 'm',      // i
      noteName + 'dim',    // ii°
      noteName,            // III
      noteName + 'm',      // iv
      noteName + 'm',      // v (natural minor) — or major V for harmonic minor
      noteName,            // VI
      noteName             // VII
    ][degree - 1];
  }
}

// V (dominant) chord — always major in cadential context (raises 7 in minor).
function dominantOf(key, mode) {
  const rootPc = noteToPc(key);
  const fifth = pcToNote((rootPc + 7) % 12);
  return fifth; // major triad
}

// Cadence definitions — return array of chord names.
export const CADENCE_TYPES = ['PAC', 'IAC', 'HC', 'Plagal', 'Deceptive'];

export const CADENCE_LABELS = {
  PAC: 'PAC — קדנצה אותנטית מושלמת (V→I)',
  IAC: 'IAC — קדנצה אותנטית לא מושלמת',
  HC: 'HC — קדנצה חצי (→V)',
  Plagal: 'Plagal — קדנצה פלאגלית (IV→I)',
  Deceptive: 'Deceptive — קדנצה מטעה (V→vi)'
};

export function getCadence(type, key = 'C', mode = 'major') {
  const I = chordAtDegree(key, mode, 1);
  const ii = chordAtDegree(key, mode, 2);
  const IV = chordAtDegree(key, mode, 4);
  const V = dominantOf(key, mode);
  const vi = chordAtDegree(key, mode, 6);

  switch (type) {
    case 'PAC':
      return [ii, V, I];
    case 'IAC':
      return [IV, V, I];
    case 'HC':
      return [I, IV, V];
    case 'Plagal':
      return [I, IV, I];
    case 'Deceptive':
      return [ii, V, vi];
    default:
      return [I, IV, V, I];
  }
}

// Standard tonic-establishing cadence used as a reference before any question.
export function getReferenceCadence(key = 'C', mode = 'major') {
  return getCadence('PAC', key, mode);
}
