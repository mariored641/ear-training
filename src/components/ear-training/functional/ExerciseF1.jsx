import React, { useCallback } from 'react';
import MultipleChoiceShell from '../shared/MultipleChoiceShell';
import harmonicAudioPlayer from '../../../utils/HarmonicAudioPlayer';
import { CADENCE_TYPES, CADENCE_LABELS } from '../../../constants/cadenceDefinitions';

const LEVELS = [
  { number: 1, label: 'שלב 1 — PAC / HC' },
  { number: 2, label: 'שלב 2 — PAC / HC / Plagal' },
  { number: 3, label: 'שלב 3 — + Deceptive' },
  { number: 4, label: 'שלב 4 — כל החמש (מז\'ור)' },
  { number: 5, label: 'שלב 5 — כל החמש (מינור)' },
  { number: 6, label: 'שלב 6 — מעורב מז\'ור / מינור' }
];

const POOLS = {
  1: ['PAC', 'HC'],
  2: ['PAC', 'HC', 'Plagal'],
  3: ['PAC', 'HC', 'Plagal', 'Deceptive'],
  4: CADENCE_TYPES,
  5: CADENCE_TYPES,
  6: CADENCE_TYPES
};

const ExerciseF1 = () => {
  const generateQuestion = useCallback((level) => {
    const pool = POOLS[level] || POOLS[1];
    const correct = pool[Math.floor(Math.random() * pool.length)];
    const mode = level === 5 ? 'minor' : (level === 6 && Math.random() > 0.5) ? 'minor' : 'major';
    const options = pool.map(t => ({ id: t, label: CADENCE_LABELS[t]?.split(' — ')[0] || t }));
    return { id: Date.now(), cadenceType: correct, mode, tonic: 'C', options, correctId: correct };
  }, []);

  const onPlay = useCallback(async (q) => {
    await harmonicAudioPlayer.playCadence(q.cadenceType, q.tonic, null, q.mode, 1.0);
  }, []);

  return (
    <MultipleChoiceShell
      id="F1"
      titleHebrew="זיהוי קדנצה"
      backTo="/category/ear-training/functional"
      levels={LEVELS}
      generateQuestion={generateQuestion}
      onPlay={onPlay}
    />
  );
};

export default ExerciseF1;
