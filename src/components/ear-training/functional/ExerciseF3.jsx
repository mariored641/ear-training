import React, { useCallback } from 'react';
import MultipleChoiceShell from '../shared/MultipleChoiceShell';
import harmonicAudioPlayer from '../../../utils/HarmonicAudioPlayer';
import { chordAtDegree } from '../../../constants/cadenceDefinitions';
import { EXTENDED_CHORDS, CHORD_DEFINITIONS } from '../../../constants/harmonicDefaults';

const LEVELS = [
  { number: 1, label: 'שלב 1 — אקורד אחד לטקט (4 טקטים)' },
  { number: 2, label: 'שלב 2 — חצי-טקט / טקט שלם' },
  { number: 3, label: 'שלב 3 — מעורב 1 / 2 לטקט' },
  { number: 4, label: 'שלב 4 — 4 טקטים, חצאים בתוכם' },
  { number: 5, label: 'שלב 5 — 8 טקטים' },
  { number: 6, label: 'שלב 6 — מעורב מורכב' }
];

function resolveChord(name) {
  if (CHORD_DEFINITIONS[name]) return CHORD_DEFINITIONS[name];
  if (EXTENDED_CHORDS[name]) return EXTENDED_CHORDS[name].notes;
  return null;
}

const ExerciseF3 = () => {
  const generateQuestion = useCallback((level) => {
    // Generate a 4-bar progression with random chord-changes-per-bar pattern.
    const bars = level >= 5 ? 8 : 4;
    const tonic = 'C';
    const pattern = []; // each entry: number of chords in this bar (1 or 2)
    let totalChords = 0;
    for (let i = 0; i < bars; i++) {
      const choice = level === 1 ? 1
        : level === 2 ? (Math.random() > 0.5 ? 1 : 2)
        : (Math.random() > 0.4 ? 1 : 2);
      pattern.push(choice);
      totalChords += choice;
    }
    const degrees = Array.from({ length: totalChords }, () => 1 + Math.floor(Math.random() * 7));
    const chords = degrees.map(d => chordAtDegree(tonic, 'major', d));

    const options = [
      { id: 'all1', label: 'אקורד אחד לטקט' },
      { id: 'mix', label: 'מעורב' },
      { id: 'all2', label: 'שני אקורדים לטקט' }
    ];
    const allOnes = pattern.every(p => p === 1);
    const allTwos = pattern.every(p => p === 2);
    const correct = allOnes ? 'all1' : allTwos ? 'all2' : 'mix';

    return { id: Date.now(), chords, pattern, options, correctId: correct };
  }, []);

  const onPlay = useCallback(async (q) => {
    if (!harmonicAudioPlayer.initialized) await harmonicAudioPlayer.init();
    let i = 0;
    for (const bar of q.pattern) {
      const dur = 1.6 / bar;
      for (let j = 0; j < bar; j++) {
        const notes = resolveChord(q.chords[i++]);
        if (notes) harmonicAudioPlayer.playChord(notes, dur, 'strummed');
        await new Promise(r => setTimeout(r, dur * 1000));
      }
    }
  }, []);

  return (
    <MultipleChoiceShell
      id="F3"
      titleHebrew="ריתמוס הרמוני"
      backTo="/category/ear-training/functional"
      levels={LEVELS}
      generateQuestion={generateQuestion}
      onPlay={onPlay}
    />
  );
};

export default ExerciseF3;
