import React, { useCallback } from 'react';
import MultipleChoiceShell from '../shared/MultipleChoiceShell';
import audioPlayer from '../../../utils/AudioPlayer';

const PC = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const LEVELS = [
  { number: 1, label: 'שלב 1 — שני תווים (עולה / יורד)' },
  { number: 2, label: 'שלב 2 — שני תווים (עולה / יורד / שווה)' },
  { number: 3, label: 'שלב 3 — שלושה תווים (עולה / יורד / מעורב)' },
  { number: 4, label: 'שלב 4 — קונטור של 4 תווים' },
  { number: 5, label: 'שלב 5 — קונטור עם קפיצות' }
];

function randomNote(min = 48, max = 72) {
  const midi = min + Math.floor(Math.random() * (max - min));
  const oct = Math.floor(midi / 12) - 1;
  return PC[midi % 12] + oct;
}

const ExerciseM2 = () => {
  const generateQuestion = useCallback((level) => {
    const count = level <= 2 ? 2 : level === 3 ? 3 : 4;
    const notes = [];
    notes.push(randomNote());
    let baseMidi = noteToMidi(notes[0]);
    for (let i = 1; i < count; i++) {
      const step = level >= 5 ? (Math.random() > 0.5 ? 1 : -1) * (2 + Math.floor(Math.random() * 5))
                              : (Math.random() > 0.5 ? 1 : -1) * (1 + Math.floor(Math.random() * 3));
      baseMidi = Math.max(40, Math.min(80, baseMidi + step));
      notes.push(midiToNote(baseMidi));
    }

    let direction;
    const first = noteToMidi(notes[0]);
    const last = noteToMidi(notes[notes.length - 1]);
    if (level === 2 && first === last) direction = 'same';
    else if (last > first) direction = 'up';
    else if (last < first) direction = 'down';
    else direction = 'same';

    if (level >= 3) {
      const allUp = notes.every((n, i) => i === 0 || noteToMidi(n) > noteToMidi(notes[i-1]));
      const allDn = notes.every((n, i) => i === 0 || noteToMidi(n) < noteToMidi(notes[i-1]));
      if (allUp) direction = 'up';
      else if (allDn) direction = 'down';
      else direction = 'mixed';
    }

    const options = level === 2
      ? [{ id: 'up', label: '⬆ עולה' }, { id: 'down', label: '⬇ יורד' }, { id: 'same', label: '= שווה' }]
      : level >= 3
        ? [{ id: 'up', label: '⬆ עולה' }, { id: 'down', label: '⬇ יורד' }, { id: 'mixed', label: '↕ מעורב' }]
        : [{ id: 'up', label: '⬆ עולה' }, { id: 'down', label: '⬇ יורד' }];

    return { id: Date.now(), notes, options, correctId: direction };
  }, []);

  const onPlay = useCallback(async (q) => {
    await audioPlayer.playSequence(q.notes, 110);
  }, []);

  return (
    <MultipleChoiceShell
      id="M2"
      titleHebrew="כיוון תנועה מלודית"
      backTo="/category/ear-training/melodic"
      levels={LEVELS}
      generateQuestion={generateQuestion}
      onPlay={onPlay}
    />
  );
};

function noteToMidi(noteWithOct) {
  const m = noteWithOct.match(/^([A-G][#b]?)(\d+)$/);
  if (!m) return 60;
  const pc = PC.indexOf(m[1]);
  return pc + (parseInt(m[2], 10) + 1) * 12;
}
function midiToNote(midi) {
  return PC[midi % 12] + (Math.floor(midi / 12) - 1);
}

export default ExerciseM2;
