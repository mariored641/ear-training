import React, { useCallback } from 'react';
import MultipleChoiceShell from '../shared/MultipleChoiceShell';
import harmonicAudioPlayer from '../../../utils/HarmonicAudioPlayer';
import { VOICED_BY_DIFFICULTY, VOICED_PROGRESSIONS } from '../../../constants/voicedProgressions';

const LEVELS = [
  { number: 1, label: 'שלב 1 — סופרן סטטי / צעד' },
  { number: 2, label: 'שלב 2 — קפיצות קטנות' },
  { number: 3, label: 'שלב 3 — קונטור גלי' },
  { number: 4, label: 'שלב 4 — קווים מינוריים' },
  { number: 5, label: 'שלב 5 — מעורב' },
  { number: 6, label: 'שלב 6 — קונטור מורכב' }
];

const ExerciseV2 = () => {
  const generateQuestion = useCallback((level) => {
    const pool = VOICED_BY_DIFFICULTY(Math.min(level, 3));
    const list = pool.length ? pool : VOICED_PROGRESSIONS;
    const correct = list[Math.floor(Math.random() * list.length)];
    const distractors = VOICED_PROGRESSIONS.filter(p => p.id !== correct.id).sort(() => Math.random() - 0.5).slice(0, 3);
    const all = [correct, ...distractors].sort(() => Math.random() - 0.5);
    return {
      id: Date.now(),
      progression: correct,
      options: all.map(p => ({ id: p.id, label: 'סופרן: ' + p.sopranoDegrees.join('-') })),
      correctId: correct.id
    };
  }, []);

  const onPlay = useCallback(async (q) => {
    await harmonicAudioPlayer.playWithEmphasis(
      q.progression.voicings,
      'soprano',
      { chordDuration: 1.4 }
    );
  }, []);

  return (
    <MultipleChoiceShell
      id="V2"
      titleHebrew="עקיבת קו סופרן"
      backTo="/category/ear-training/voice-leading"
      levels={LEVELS}
      generateQuestion={generateQuestion}
      onPlay={onPlay}
    />
  );
};

export default ExerciseV2;
