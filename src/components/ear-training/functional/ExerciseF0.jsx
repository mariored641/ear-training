import React, { useCallback } from 'react';
import MultipleChoiceShell from '../shared/MultipleChoiceShell';
import harmonicAudioPlayer from '../../../utils/HarmonicAudioPlayer';
import { chordAtDegree } from '../../../constants/cadenceDefinitions';
import { EXTENDED_CHORDS, CHORD_DEFINITIONS } from '../../../constants/harmonicDefaults';

const LEVELS = [
  { number: 1, label: 'שלב 1 — I / V (מז\'ור)' },
  { number: 2, label: 'שלב 2 — I / IV / V (מז\'ור)' },
  { number: 3, label: 'שלב 3 — I / IV / V / vi (מז\'ור)' },
  { number: 4, label: 'שלב 4 — כל הדרגות הדיאטוניות (מז\'ור)' },
  { number: 5, label: 'שלב 5 — דרגות דיאטוניות (מינור)' },
  { number: 6, label: 'שלב 6 — מעורב מז\'ור / מינור' }
];

const DEGREE_POOL = {
  1: [1, 5],
  2: [1, 4, 5],
  3: [1, 4, 5, 6],
  4: [1, 2, 3, 4, 5, 6, 7],
  5: [1, 2, 3, 4, 5, 6, 7],
  6: [1, 2, 3, 4, 5, 6, 7]
};

const ROMAN = {
  major: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'],
  minor: ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII']
};

function resolveChord(name) {
  if (CHORD_DEFINITIONS[name]) return CHORD_DEFINITIONS[name];
  if (EXTENDED_CHORDS[name]) return EXTENDED_CHORDS[name].notes;
  return null;
}

const ExerciseF0 = () => {
  const generateQuestion = useCallback((level) => {
    const mode = level >= 5 ? (level === 5 ? 'minor' : (Math.random() > 0.5 ? 'major' : 'minor')) : 'major';
    const tonic = 'C';
    const pool = DEGREE_POOL[level] || DEGREE_POOL[1];
    const correctDegree = pool[Math.floor(Math.random() * pool.length)];
    const chord = chordAtDegree(tonic, mode, correctDegree);
    const options = pool.map(d => ({ id: String(d), label: ROMAN[mode][d - 1] }));
    return { id: Date.now(), chord, mode, tonic, options, correctId: String(correctDegree) };
  }, []);

  const onPlay = useCallback(async (q) => {
    if (!harmonicAudioPlayer.initialized) await harmonicAudioPlayer.init();
    await harmonicAudioPlayer.playCadence('PAC', q.tonic, null, q.mode, 0.7);
    setTimeout(() => {
      const notes = resolveChord(q.chord);
      if (notes) harmonicAudioPlayer.playChord(notes, 2.0, 'strummed');
    }, 100);
  }, []);

  return (
    <MultipleChoiceShell
      id="F0"
      titleHebrew="זיהוי דרגת אקורד בודד"
      backTo="/category/ear-training/functional"
      levels={LEVELS}
      generateQuestion={generateQuestion}
      onPlay={onPlay}
    />
  );
};

export default ExerciseF0;
