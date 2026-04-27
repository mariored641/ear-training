import React, { useCallback, useEffect } from 'react';
import MultipleChoiceShell from '../shared/MultipleChoiceShell';
import { useStoredState } from '../shared/useStoredState';
import audioPlayer from '../../../utils/AudioPlayer';

const PC = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

const LEVELS = [
  { number: 1, label: 'עולה / יורד / חוזר — 2 תווים' },
  { number: 2, label: 'כיוון כללי — 3 תווים' },
  { number: 3, label: 'צעד או קפיצה — 2 תווים' },
  { number: 4, label: 'גודל קפיצה — קטנה / בינונית / גדולה' },
  { number: 5, label: 'מיפוי קו — 4-6 תווים' }
];

function noteToMidi(noteWithOct) {
  const m = noteWithOct.match(/^([A-G][#b]?)(\d+)$/);
  if (!m) return 60;
  const pc = PC.indexOf(m[1]);
  return pc + (parseInt(m[2], 10) + 1) * 12;
}
function midiToNote(midi) {
  return PC[midi % 12] + (Math.floor(midi / 12) - 1);
}
function randMidi(min = 56, max = 72) {
  return min + Math.floor(Math.random() * (max - min));
}

function generateForLevel(level) {
  if (level === 1) {
    // 2 notes — up / down / same
    const start = randMidi();
    const choice = Math.floor(Math.random() * 3); // 0=up,1=down,2=same
    let next;
    let id;
    if (choice === 0)      { next = start + 1 + Math.floor(Math.random() * 4); id = 'up'; }
    else if (choice === 1) { next = start - 1 - Math.floor(Math.random() * 4); id = 'down'; }
    else                   { next = start; id = 'same'; }
    return {
      id: Date.now(),
      notes: [midiToNote(start), midiToNote(next)],
      options: [
        { id: 'up',   label: '↑ עולה' },
        { id: 'down', label: '↓ יורד' },
        { id: 'same', label: '→ חוזר' }
      ],
      correctId: id
    };
  }

  if (level === 2) {
    // 3 notes — overall direction up / down / same (returns to start)
    const start = randMidi();
    const choice = Math.floor(Math.random() * 3);
    let n2, n3, id;
    if (choice === 0) {
      n2 = start + 2; n3 = start + 4 + Math.floor(Math.random() * 3);
      id = 'up';
    } else if (choice === 1) {
      n2 = start - 2; n3 = start - 4 - Math.floor(Math.random() * 3);
      id = 'down';
    } else {
      n2 = start + (Math.random() > 0.5 ? 2 : -2);
      n3 = start;
      id = 'same';
    }
    return {
      id: Date.now(),
      notes: [midiToNote(start), midiToNote(n2), midiToNote(n3)],
      options: [
        { id: 'up',   label: '↑ עולה' },
        { id: 'down', label: '↓ יורד' },
        { id: 'same', label: '→ חוזר' }
      ],
      correctId: id
    };
  }

  if (level === 3) {
    // 2 notes — step (1-2 semitones) vs leap (≥3 semitones)
    const start = randMidi();
    const choice = Math.random() > 0.5 ? 'step' : 'leap';
    const dir = Math.random() > 0.5 ? 1 : -1;
    const interval = choice === 'step' ? (1 + Math.floor(Math.random() * 2))
                                       : (3 + Math.floor(Math.random() * 6));
    return {
      id: Date.now(),
      notes: [midiToNote(start), midiToNote(start + dir * interval)],
      options: [
        { id: 'step', label: 'צעד' },
        { id: 'leap', label: 'קפיצה' }
      ],
      correctId: choice
    };
  }

  if (level === 4) {
    // leap size: small (3rd, 3-4 semis), medium (4th-5th, 5-7 semis), large (6th+, 8+ semis)
    const start = randMidi(56, 70);
    const sizes = [
      { id: 'small',  label: 'קטנה (3rd)',         range: [3, 4] },
      { id: 'medium', label: 'בינונית (4-5th)',    range: [5, 7] },
      { id: 'large',  label: 'גדולה (6th+)',       range: [8, 12] }
    ];
    const pick = sizes[Math.floor(Math.random() * 3)];
    const dir = Math.random() > 0.5 ? 1 : -1;
    const semis = pick.range[0] + Math.floor(Math.random() * (pick.range[1] - pick.range[0] + 1));
    return {
      id: Date.now(),
      notes: [midiToNote(start), midiToNote(start + dir * semis)],
      options: sizes.map(s => ({ id: s.id, label: s.label })),
      correctId: pick.id
    };
  }

  // Level 5 — 4-6 notes, contour: rising / falling / arch / wavy
  const len = 4 + Math.floor(Math.random() * 3);
  const start = randMidi(56, 68);
  const choice = ['rising','falling','arch','wavy'][Math.floor(Math.random() * 4)];
  const notes = [start];
  if (choice === 'rising') {
    for (let i = 1; i < len; i++) notes.push(notes[i - 1] + 1 + Math.floor(Math.random() * 3));
  } else if (choice === 'falling') {
    for (let i = 1; i < len; i++) notes.push(notes[i - 1] - 1 - Math.floor(Math.random() * 3));
  } else if (choice === 'arch') {
    const peak = Math.floor(len / 2);
    for (let i = 1; i < len; i++) {
      const goingUp = i <= peak;
      notes.push(notes[i - 1] + (goingUp ? 2 : -2));
    }
  } else {
    for (let i = 1; i < len; i++) {
      const dir = i % 2 === 1 ? 1 : -1;
      notes.push(notes[i - 1] + dir * (1 + Math.floor(Math.random() * 3)));
    }
  }
  return {
    id: Date.now(),
    notes: notes.map(midiToNote),
    options: [
      { id: 'rising',  label: '↑ עולה' },
      { id: 'falling', label: '↓ יורד' },
      { id: 'arch',    label: '⌒ קשת' },
      { id: 'wavy',    label: '〰 גלי' }
    ],
    correctId: choice
  };
}

const ExerciseM2 = () => {
  const [instrument, setInstrument] = useStoredState('ear-training:M2:instrument', 'piano');
  const [advancement, setAdvancement] = useStoredState('ear-training:M2:advancement', 'auto');

  useEffect(() => { audioPlayer.setInstrument(instrument); }, [instrument]);

  const generateQuestion = useCallback((level) => generateForLevel(level), []);

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
      instrument={{ value: instrument, onChange: setInstrument }}
      advancement={{ value: advancement, onChange: setAdvancement }}
    />
  );
};

export default ExerciseM2;
