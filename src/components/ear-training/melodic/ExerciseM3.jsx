import React, { useCallback } from 'react';
import MultipleChoiceShell from '../shared/MultipleChoiceShell';
import audioPlayer from '../../../utils/AudioPlayer';
import { SCALES_BY_LEVEL, SCALE_HEBREW_NAMES } from '../../../constants/scaleQualities';

const LEVELS = [
  { number: 1, label: 'שלב 1 — מז\'ור / מינור טבעי' },
  { number: 2, label: 'שלב 2 — דיאטוני (מז\'ור + 3 מינורים)' },
  { number: 3, label: 'שלב 3 — פנטטוניים + בלוז' },
  { number: 4, label: 'שלב 4 — מודוסים בסיסיים' },
  { number: 5, label: 'שלב 5 — שבעת המודוסים' },
  { number: 6, label: 'שלב 6 — סולמות ג\'אז' },
  { number: 7, label: 'שלב 7 — סימטריים' }
];

const ExerciseM3 = () => {
  const generateQuestion = useCallback((level) => {
    const pool = SCALES_BY_LEVEL[level] || SCALES_BY_LEVEL[1];
    const correct = pool[Math.floor(Math.random() * pool.length)];
    const wrongs = pool.filter(s => s !== correct).sort(() => Math.random() - 0.5).slice(0, 3);
    const all = [correct, ...wrongs].sort(() => Math.random() - 0.5);
    const tonics = ['C','D','E','F','G','A'];
    const tonic = tonics[Math.floor(Math.random() * tonics.length)];
    return {
      id: Date.now(),
      scaleName: correct,
      tonic,
      options: all.map(s => ({ id: s, label: SCALE_HEBREW_NAMES[s] || s })),
      correctId: correct
    };
  }, []);

  const onPlay = useCallback(async (q) => {
    await audioPlayer.playScaleAscending(q.scaleName, q.tonic, 130);
  }, []);

  return (
    <MultipleChoiceShell
      id="M3"
      titleHebrew="זיהוי סולם"
      backTo="/category/ear-training/melodic"
      levels={LEVELS}
      generateQuestion={generateQuestion}
      onPlay={onPlay}
    />
  );
};

export default ExerciseM3;
