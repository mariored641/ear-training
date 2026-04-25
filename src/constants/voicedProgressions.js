/**
 * Voiced progressions for V1 (bass line) and V2 (soprano line).
 * Each progression has explicit bass + soprano voicing per chord.
 *
 * voicing structure per chord:
 *   { chord: 'C', bass: 'C2', soprano: 'E5', inner?: ['G3','C4'] }
 */

export const VOICED_PROGRESSIONS = [
  {
    id: 'pop_bass_descending',
    name: 'Pop with descending bass',
    mode: 'major',
    key: 'C',
    bassDegrees: ['1', '7', '6', '5'],
    sopranoDegrees: ['3', '2', '1', '7'],
    voicings: [
      { chord: 'C',  bass: 'C2', soprano: 'E5' },
      { chord: 'G',  bass: 'B2', soprano: 'D5' },
      { chord: 'Am', bass: 'A2', soprano: 'C5' },
      { chord: 'Em', bass: 'G2', soprano: 'B4' }
    ],
    difficulty: 2
  },
  {
    id: 'i_v_vi_iv_root',
    name: 'I V vi IV — root position',
    mode: 'major',
    key: 'C',
    bassDegrees: ['1', '5', '6', '4'],
    sopranoDegrees: ['1', '2', '3', '1'],
    voicings: [
      { chord: 'C',  bass: 'C2', soprano: 'C5' },
      { chord: 'G',  bass: 'G2', soprano: 'D5' },
      { chord: 'Am', bass: 'A2', soprano: 'E5' },
      { chord: 'F',  bass: 'F2', soprano: 'C5' }
    ],
    difficulty: 1
  },
  {
    id: 'minor_lament',
    name: 'Minor lament — descending bass',
    mode: 'minor',
    key: 'A',
    bassDegrees: ['1', '7', '6', '5'],
    sopranoDegrees: ['3', '3', '2', '1'],
    voicings: [
      { chord: 'Am', bass: 'A2', soprano: 'C5' },
      { chord: 'G',  bass: 'G2', soprano: 'C5' },
      { chord: 'F',  bass: 'F2', soprano: 'B4' },
      { chord: 'E',  bass: 'E2', soprano: 'A4' }
    ],
    difficulty: 2
  },
  {
    id: 'cadence_PAC',
    name: 'PAC — ii V I with melodic resolve',
    mode: 'major',
    key: 'C',
    bassDegrees: ['2', '5', '1'],
    sopranoDegrees: ['2', '7', '1'],
    voicings: [
      { chord: 'Dm', bass: 'D2', soprano: 'D5' },
      { chord: 'G',  bass: 'G2', soprano: 'B4' },
      { chord: 'C',  bass: 'C2', soprano: 'C5' }
    ],
    difficulty: 1
  }
];

export const VOICED_BY_DIFFICULTY = (level) =>
  VOICED_PROGRESSIONS.filter(p => p.difficulty <= level);
