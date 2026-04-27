/**
 * Cadence library — for F1 (Cadence ID).
 * Each cadence is a sequence of chord roman-numeral degrees ending the phrase.
 *
 * id types:
 *   PAC      — Perfect Authentic (V→I, both root pos, sop on 1)
 *   IAC      — Imperfect Authentic (V→I but not perfect)
 *   HC       — Half Cadence (... → V)
 *   PLAGAL   — IV → I
 *   DECEPT   — V → vi
 */

export const CADENCE_TYPES = {
  PAC:    { id: 'PAC',    label: 'PAC',     hebrew: 'אותנטית מושלמת' },
  IAC:    { id: 'IAC',    label: 'IAC',     hebrew: 'אותנטית לא-מושלמת' },
  HC:     { id: 'HC',     label: 'HC',      hebrew: 'חצי קדנצה' },
  PLAGAL: { id: 'PLAGAL', label: 'Plagal',  hebrew: 'פלגלית' },
  DECEPT: { id: 'DECEPT', label: 'Deceptive', hebrew: 'מטעה' }
};

/** Sequences in C major (caller transposes for other keys). */
export const CADENCE_PATTERNS = {
  PAC:    [['I'], ['IV'], ['V'], ['I']],
  IAC:    [['I'], ['IV'], ['V'], ['I']],     // sop on 3 or 5 — distinction is in voicing
  HC:     [['I'], ['IV'], ['ii'], ['V']],
  PLAGAL: [['I'], ['IV'], ['I']],
  DECEPT: [['I'], ['IV'], ['V'], ['vi']]
};

/** Levels per F1 spec. */
export const F1_LEVEL_TYPES = {
  1: ['PAC', 'HC'],
  2: ['PAC', 'HC', 'IAC'],
  3: ['PAC', 'HC', 'IAC', 'PLAGAL'],
  4: ['PAC', 'HC', 'IAC', 'PLAGAL', 'DECEPT'],
  5: ['PAC', 'HC', 'IAC', 'PLAGAL', 'DECEPT'],   // minor key
  6: ['PAC', 'HC', 'IAC', 'PLAGAL', 'DECEPT']    // inside full phrase
};
