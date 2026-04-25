import React, { useCallback } from 'react';
import MultipleChoiceShell from '../shared/MultipleChoiceShell';
import harmonicAudioPlayer from '../../../utils/HarmonicAudioPlayer';
import { CHORD_GROUPS, EXTENDED_CHORDS } from '../../../constants/harmonicDefaults';

const LEVELS = [
  { number: 1, label: 'שלב 1 — מז\'ור / מינור' },
  { number: 2, label: 'שלב 2 — + dim / aug' },
  { number: 3, label: 'שלב 3 — + sus2 / sus4' },
  { number: 4, label: 'שלב 4 — אקורדי שביעי' },
  { number: 5, label: 'שלב 5 — מעורב טריאדות + שביעי' },
  { number: 6, label: 'שלב 6 — הכל כולל אלטרציות' }
];

const QUALITY_LABELS = {
  major: 'מז\'ור',
  minor: 'מינור',
  diminished: 'מוקטן',
  augmented: 'מוגדל',
  sus: 'sus',
  maj7: 'Maj7',
  min7: 'm7',
  dom7: '7 (דומיננטי)',
  'half-dim': 'm7♭5',
  dim7: 'dim7',
  altered: 'altered'
};

const POOLS = {
  1: ['major', 'minor'],
  2: ['major', 'minor', 'diminished', 'augmented'],
  3: ['major', 'minor', 'diminished', 'augmented', 'sus'],
  4: ['maj7', 'min7', 'dom7', 'half-dim', 'dim7'],
  5: ['major', 'minor', 'maj7', 'min7', 'dom7'],
  6: ['major', 'minor', 'diminished', 'augmented', 'maj7', 'min7', 'dom7', 'half-dim', 'altered']
};

const ROOTS = ['C','D','E','F','G','A'];

const ExerciseH3 = () => {
  const generateQuestion = useCallback((level) => {
    const kinds = POOLS[level] || POOLS[1];
    const correctKind = kinds[Math.floor(Math.random() * kinds.length)];
    // Find a chord with that kind
    const matching = Object.entries(EXTENDED_CHORDS).filter(([n, def]) =>
      def.kind === correctKind && ROOTS.includes(def.rootName)
    );
    const [chordName] = matching[Math.floor(Math.random() * matching.length)];
    const options = kinds.map(k => ({ id: k, label: QUALITY_LABELS[k] || k }));
    return { id: Date.now(), chord: chordName, options, correctId: correctKind };
  }, []);

  const onPlay = useCallback(async (q) => {
    const def = EXTENDED_CHORDS[q.chord];
    if (!def) return;
    if (!harmonicAudioPlayer.initialized) await harmonicAudioPlayer.init();
    harmonicAudioPlayer.playChord(def.notes, 1.5, 'strummed');
  }, []);

  return (
    <MultipleChoiceShell
      id="H3"
      titleHebrew="זיהוי סוג אקורד"
      backTo="/category/ear-training/harmonic-isolated"
      levels={LEVELS}
      generateQuestion={generateQuestion}
      onPlay={onPlay}
    />
  );
};

export default ExerciseH3;
