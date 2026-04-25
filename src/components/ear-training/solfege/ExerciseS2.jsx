import React, { useCallback } from 'react';
import MultipleChoiceShell from '../shared/MultipleChoiceShell';
import audioPlayer from '../../../utils/AudioPlayer';

const LEVELS = [
  { number: 1, label: 'שלב 1 — 3 תווים בסיסיים' },
  { number: 2, label: 'שלב 2 — 4 תווים' },
  { number: 3, label: 'שלב 3 — 5 תווים, ללא קפיצות' },
  { number: 4, label: 'שלב 4 — 5 תווים עם קפיצה אחת' },
  { number: 5, label: 'שלב 5 — קונטור בן 6 תווים' },
  { number: 6, label: 'שלב 6 — בלבול בין שני קווים דומים' }
];

const PC = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const MAJOR_DEG = [0, 2, 4, 5, 7, 9, 11];
const TONIC = 'C';
const SOLFEGE = ['דו','דו#','רה','רה#','מי','פה','פה#','סול','סול#','לה','לה#','סי'];

function makeMelody(level) {
  const len = level <= 1 ? 3 : level <= 3 ? 4 : level <= 4 ? 5 : 6;
  const out = [];
  let prev = 0;
  for (let i = 0; i < len; i++) {
    if (level <= 3) {
      const idx = MAJOR_DEG.indexOf(prev);
      const next = MAJOR_DEG[Math.max(0, Math.min(MAJOR_DEG.length - 1, idx + (Math.random() > 0.5 ? 1 : -1)))];
      prev = i === 0 ? 0 : next;
    } else {
      prev = MAJOR_DEG[Math.floor(Math.random() * MAJOR_DEG.length)];
    }
    out.push(prev);
  }
  return out;
}

function melodyToText(degrees) {
  return degrees.map(d => SOLFEGE[d]).join(' - ');
}

const ExerciseS2 = () => {
  const generateQuestion = useCallback((level) => {
    const correct = makeMelody(level);
    const distractors = [makeMelody(level), makeMelody(level), makeMelody(level)];
    const all = [correct, ...distractors].sort(() => Math.random() - 0.5);
    return {
      id: Date.now(),
      melody: correct,
      options: all.map((m, i) => ({ id: String(i), label: melodyToText(m), _melody: m })),
      correctId: String(all.findIndex(m => m === correct))
    };
  }, []);

  const onPlay = useCallback(async (q) => {
    const tonicPc = PC.indexOf(TONIC);
    const notes = q.melody.map(d => PC[(tonicPc + d) % 12] + (4 + Math.floor((tonicPc + d) / 12)));
    await audioPlayer.playSequence(notes, 110);
  }, []);

  return (
    <MultipleChoiceShell
      id="S2"
      titleHebrew="זיהוי תיווי מנגינה"
      backTo="/category/ear-training/solfege"
      levels={LEVELS}
      generateQuestion={generateQuestion}
      onPlay={onPlay}
    />
  );
};

export default ExerciseS2;
