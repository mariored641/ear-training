/**
 * Reactive Ear Training — Constants
 * Tiers, sounds, durations, and Yamaha quality → display-suffix map.
 */

import { GM } from '../../../lib/soundfont/SoundFontPlayer';

// ---- Tiers — R1 (diatonic mode): 6 levels ----
export const R1_TIERS = [
  { number: 1, id: 'r1-triads',     label: 'שלב 1 — טריאדות דיאטוניות' },
  { number: 2, id: 'r1-sevenths',   label: 'שלב 2 — + מרובעים דיאטוניים' },
  { number: 3, id: 'r1-extensions', label: 'שלב 3 — + אקסטנציות דיאטוניות (6 / sus / add9-11-13)' },
  { number: 4, id: 'r1-chromatic',  label: 'שלב 4 — + טנשנים כרומטיים (♭9 / ♯11 / alt)' },
  { number: 5, id: 'r1-mixture-q',  label: 'שלב 5 — + מיקסטורות אופי (i, iv, v…)' },
  { number: 6, id: 'r1-mixture-m',  label: 'שלב 6 — + מיקסטורות מודליות (♭II, ♭III, ♭VI, ♭VII, ♯IV)' },
];

// ---- Tiers — R2 (random mode): 6 levels (parallel to R1) ----
export const R2_TIERS = [
  { number: 1, id: 'r2-triads',        label: 'שלב 1 — טריאדות בסיסיות (Maj / min / dim)' },
  { number: 2, id: 'r2-7-common',      label: 'שלב 2 — + 7-chords יומיומיים (Maj7 / m7 / 7)' },
  { number: 3, id: 'r2-7-exotic',      label: 'שלב 3 — + 7-chords אקזוטיים (m7♭5 / °7 / sus / sus2)' },
  { number: 4, id: 'r2-melodic-minor', label: 'שלב 4 — + הרמוניית מלודי מינור (aug / mMaj7 / 7♯11 / 7♯5)' },
  { number: 5, id: 'r2-extensions',    label: 'שלב 5 — + הרחבות דיאטוניות (6 / 6/9 / 9 / 13)' },
  { number: 6, id: 'r2-altered',       label: 'שלב 6 — + טנשנים אלטרים (♭9 / ♯9 / ♭13 / 7♭5)' },
];

// Helper — find tier id by number, given mode
export const tiersForMode = (mode) => mode === 'diatonic' ? R1_TIERS : R2_TIERS;
export const tierIdByNumber = (n, mode = 'random') => {
  const list = tiersForMode(mode);
  return list.find(t => t.number === n)?.id || list[0].id;
};

// ---- R2 (random mode) — Yamaha qualities included in each tier (cumulative) ----
// Keys must exist in YamChordMap.CHORD_DATA
const _T1 = ['Maj', 'min', 'dim'];
const _T2 = [..._T1, 'Maj7', 'min7', '7th'];
const _T3 = [..._T2, 'm7b5', 'dim7', 'sus4', '7sus4', '1+2+5'];
const _T4 = [..._T3, 'aug', 'minMaj7', 'minMaj7(9)', '7#11', '7aug', 'Maj7aug'];
const _T5 = [..._T4, 'Maj6', 'min6', 'Maj6(9)', 'Maj(9)', 'min(9)',
             'Maj7(9)', 'min7(9)', '7(9)', '7(13)', 'Maj7#11', 'min7(11)'];
const _T6 = [..._T5, '7(b9)', '7(#9)', '7(b13)', '7b5'];

export const TIER_QUALITIES = {
  'r2-triads':        _T1,
  'r2-7-common':      _T2,
  'r2-7-exotic':      _T3,
  'r2-melodic-minor': _T4,
  'r2-extensions':    _T5,
  'r2-altered':       _T6,
};

// ---- Sounds (all sustained patches — NO decay over 45s) ----
// Use channel >= 5 to avoid clashing with PIANO/BASS/GUITAR/PAD defaults.
export const SOUNDS = [
  { id: 'strings',     label: 'Strings (כריות חמות)', gm: GM.STRINGS, channel: 3 }, // GM 48 — pre-init'd on PAD channel
  { id: 'warm-pad',    label: 'Warm Pad',              gm: 89,          channel: 7 }, // GM 89 = Pad 2 (Warm)
  { id: 'choir',       label: 'Choir (מקהלה)',         gm: 52,          channel: 5 }, // GM 52 = Choir Aahs
  { id: 'synth-strings', label: 'Synth Strings',       gm: 50,          channel: 6 }, // GM 50 = Synth Strings 1
];

// ---- Duration choices ----
export const CHORD_DURATIONS = [5, 10, 15, 20, 30, 45]; // seconds
export const DEFAULT_CHORD_DURATION = 15;

export const SESSION_DURATIONS = [
  { value: 5,  label: '5 דקות' },
  { value: 10, label: '10 דקות' },
  { value: 15, label: '15 דקות' },
  { value: 20, label: '20 דקות' },
  { value: 30, label: '30 דקות' },
  { value: 0,  label: 'ללא הגבלה' },
];
export const DEFAULT_SESSION_MINUTES = 10;

// ---- Reveal window (last N seconds of each chord) ----
export const REVEAL_WINDOW_SEC = 5;

// ---- Diatonic key choices for R1 ----
export const DIATONIC_KEYS = [
  { value: 'random', label: 'אקראי (פעם בסשן)' },
  { value: 'C', label: 'C מז\'ור' },
  { value: 'G', label: 'G מז\'ור' },
  { value: 'D', label: 'D מז\'ור' },
  { value: 'A', label: 'A מז\'ור' },
  { value: 'E', label: 'E מז\'ור' },
  { value: 'F', label: 'F מז\'ור' },
  { value: 'Bb', label: 'Bb מז\'ור' },
  { value: 'Eb', label: 'Eb מז\'ור' },
  { value: 'Ab', label: 'Ab מז\'ור' },
];

// ---- Display-suffix map: Yamaha quality → reader-friendly suffix ----
// Used only when chord is revealed.
export const QUALITY_DISPLAY = {
  'Maj':         '',
  'min':         'm',
  'dim':         '°',
  'aug':         '+',
  '1+2+5':       'sus2',
  'Maj7':        'Maj7',
  'min7':        'm7',
  '7th':         '7',
  'm7b5':        'm7♭5',
  'dim7':        '°7',
  'Maj6':        '6',
  'min6':        'm6',
  'Maj(9)':      'add9',
  'min(9)':      'm(add9)',
  '7(9)':        '9',
  'Maj7(9)':     'Maj9',
  'min7(9)':     'm9',
  'sus4':        'sus4',
  '7sus4':       '7sus4',
  '7(b9)':       '7♭9',
  '7(#9)':       '7♯9',
  '7#11':        '7♯11',
  '7(13)':       '13',
  '7b5':         '7♭5',
  '7aug':        '7♯5',
  '7(b13)':      '7♭13',
  'Maj7#11':     'Maj7♯11',
  'Maj7aug':     'Maj7♯5',
  'minMaj7':     'mMaj7',
  'minMaj7(9)':  'mMaj9',
};
