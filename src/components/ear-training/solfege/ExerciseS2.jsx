import React, { useCallback } from 'react';
import MultipleChoiceShell from '../shared/MultipleChoiceShell';
import NotationCard from '../shared/NotationCard';
import audioPlayer from '../../../utils/AudioPlayer';

const LEVELS = [
  { number: 1, label: 'שלב 1 — הבדל ברור (4 תווים)' },
  { number: 2, label: 'שלב 2 — הבדל תו אחד (4 תווים)' },
  { number: 3, label: "שלב 3 — מז'ור (6 תווים)" },
  { number: 4, label: 'שלב 4 — קפיצות (6-8 תווים)' },
  { number: 5, label: 'שלב 5 — מינור (8 תווים)' },
  { number: 6, label: 'שלב 6 — כרומטי (8 תווים)' },
];

const PC = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const MAJOR_DEG = [0, 2, 4, 5, 7, 9, 11];
const MINOR_DEG = [0, 2, 3, 5, 7, 8, 10];

function scaleForLevel(level) {
  if (level === 5) return MINOR_DEG;
  if (level === 6) return [0,1,2,3,4,5,6,7,8,9,10,11];
  return MAJOR_DEG;
}

function lenForLevel(level) {
  if (level <= 2) return 4;
  if (level === 3) return 6;
  if (level === 4) return 5 + Math.floor(Math.random() * 3);
  return 8;
}

function makeMelody(level) {
  const scale = scaleForLevel(level);
  const len = lenForLevel(level);
  const useLeaps = level >= 4;
  const out = [];
  let idx = Math.floor(scale.length / 2);
  for (let i = 0; i < len; i++) {
    const maxJump = useLeaps ? 3 : 1;
    const delta = Math.floor(Math.random() * (maxJump * 2 + 1)) - maxJump;
    idx = Math.max(0, Math.min(scale.length - 1, idx + delta));
    out.push(scale[idx]);
  }
  return out;
}

function makeDistractor(correct, level) {
  if (level === 2) {
    const scale = scaleForLevel(level);
    const d = [...correct];
    const pos = Math.floor(Math.random() * d.length);
    let newVal;
    do { newVal = scale[Math.floor(Math.random() * scale.length)]; } while (newVal === d[pos]);
    d[pos] = newVal;
    return d;
  }
  return makeMelody(level);
}

function degreesToNotes(degrees) {
  return degrees.map(d => PC[d % 12] + '4');
}

const ExerciseS2 = () => {
  const generateQuestion = useCallback((level) => {
    const correct = makeMelody(level);
    const distractors = [
      makeDistractor(correct, level),
      makeDistractor(correct, level),
      makeDistractor(correct, level),
    ];
    const all = [correct, ...distractors].sort(() => Math.random() - 0.5);
    const correctIdx = all.findIndex(m => m === correct);
    return {
      id: Date.now(),
      melody: correct,
      options: all.map((m, i) => ({
        id: String(i),
        label: <NotationCard notes={degreesToNotes(m)} />,
      })),
      correctId: String(correctIdx),
    };
  }, []);

  const onPlay = useCallback(async (q) => {
    const notes = degreesToNotes(q.melody);
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
