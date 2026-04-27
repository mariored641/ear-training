/**
 * Short melody library used by S1 (sight-singing), S2 (notation recognition),
 * and G1 (fretboard mapping — library mode).
 *
 * Note: a separate `melodyLibrary.js` exists for legacy Exercise 2 (guitar
 * positions). This file targets the new ear-training module.
 */

export const ET_MELODIES = [
  // ─── 4 notes, stepwise ─────────────────────────────────────────
  { id: 'mary',         name: 'מרי קטנה',        notes: ['E4','D4','C4','D4'], length: 4, level: 1 },
  { id: 'hot_cross',    name: 'Hot Cross Buns',  notes: ['E4','D4','C4'],      length: 3, level: 1 },
  { id: 'three_blind',  name: 'Three Blind Mice',notes: ['E4','D4','C4'],      length: 3, level: 1 },

  // ─── 4–6 notes, small leaps ───────────────────────────────────
  { id: 'twinkle',      name: 'Twinkle Twinkle', notes: ['C4','C4','G4','G4','A4','A4','G4'], length: 7, level: 2 },
  { id: 'jingle',       name: 'Jingle Bells',    notes: ['E4','E4','E4','E4','E4','E4'],      length: 6, level: 2 },

  // ─── Arpeggios I/IV/V ─────────────────────────────────────────
  { id: 'arp_i',  name: 'ארפג\'יו I', notes: ['C4','E4','G4','C5'], length: 4, level: 3 },
  { id: 'arp_iv', name: 'ארפג\'יו IV', notes: ['F4','A4','C5','F5'], length: 4, level: 3 },
  { id: 'arp_v',  name: 'ארפג\'יו V',  notes: ['G4','B4','D5','G5'], length: 4, level: 3 },

  // ─── Phrases up to 5th ────────────────────────────────────────
  { id: 'happy_bday', name: 'Happy Birthday',  notes: ['G4','G4','A4','G4','C5','B4'], length: 6, level: 4 },
  { id: 'frere',      name: 'Frère Jacques',   notes: ['C4','D4','E4','C4'],           length: 4, level: 4 },

  // ─── Full diatonic phrases ────────────────────────────────────
  { id: 'ode',     name: 'Ode to Joy',     notes: ['E4','E4','F4','G4','G4','F4','E4','D4'], length: 8, level: 5 },
  { id: 'amazing', name: 'Amazing Grace',  notes: ['G4','C5','E5','C5','E5','D5','C5'],     length: 7, level: 5 }
];

export const melodiesAtMostLevel = (maxLevel) =>
  ET_MELODIES.filter(m => m.level <= maxLevel);
