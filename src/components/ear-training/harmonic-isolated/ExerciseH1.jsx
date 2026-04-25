import React, { useCallback } from 'react';
import MultipleChoiceShell from '../shared/MultipleChoiceShell';
import harmonicAudioPlayer from '../../../utils/HarmonicAudioPlayer';
import { EXTENDED_CHORDS } from '../../../constants/harmonicDefaults';

const LEVELS = [
  { number: 1, label: 'שלב 1 — מז\'ור / מינור (12 שורשים)' },
  { number: 2, label: 'שלב 2 — + dim (מוקטן)' },
  { number: 3, label: 'שלב 3 — + aug (מוגדל)' },
  { number: 4, label: 'שלב 4 — ניואנסי קול (סטרום / ארפג\'יו)' },
  { number: 5, label: 'שלב 5 — רצף 2-3 אקורדים' },
  { number: 6, label: 'שלב 6 — רצף 4 אקורדים' },
];

const LEVEL_KINDS = {
  1: ['major','minor'],
  2: ['major','minor','diminished'],
  3: ['major','minor','diminished','augmented'],
  4: ['major','minor','diminished','augmented'],
  5: ['major','minor','diminished','augmented'],
  6: ['major','minor','diminished','augmented'],
};
const KIND_LABELS = {
  major: "מז'ור", minor: 'מינור', diminished: 'מוקטן (dim)', augmented: 'מוגדל (aug)'
};
const ROOTS = ['C','D','E','F','G','A','Bb'];

const ExerciseH1 = () => {
  const generateQuestion = useCallback((level) => {
    const kinds = LEVEL_KINDS[level] || LEVEL_KINDS[1];
    const correctKind = kinds[Math.floor(Math.random() * kinds.length)];
    const root = ROOTS[Math.floor(Math.random() * ROOTS.length)];
    const suffixMap = { major: '', minor: 'm', diminished: 'dim', augmented: 'aug' };
    const chordName = root + suffixMap[correctKind];
    const def = EXTENDED_CHORDS[chordName];
    const voicing = level === 4 && Math.random() > 0.5 ? 'arpeggiated' : 'strummed';

    const seqCount = level >= 5 ? (level === 5 ? 3 : 4) : 1;
    const seqKinds = Array.from({ length: seqCount }, () => kinds[Math.floor(Math.random() * kinds.length)]);
    const seqKinds0 = [correctKind, ...seqKinds.slice(1)];
    const seqChords = seqKinds0.map(k => {
      const r = ROOTS[Math.floor(Math.random() * ROOTS.length)];
      return EXTENDED_CHORDS[r + suffixMap[k]];
    });

    return {
      id: Date.now(),
      chordName, def, seqChords, voicing, seqKinds0,
      options: kinds.map(k => ({ id: k, label: KIND_LABELS[k] })),
      correctId: correctKind
    };
  }, []);

  const onPlay = useCallback(async (q) => {
    if (!harmonicAudioPlayer.initialized) await harmonicAudioPlayer.init();
    for (const cd of q.seqChords) {
      if (cd?.notes) harmonicAudioPlayer.playChord(cd.notes, 1.2, q.voicing);
      await new Promise(r => setTimeout(r, 1400));
    }
  }, []);

  return (
    <MultipleChoiceShell
      id="H1"
      titleHebrew="זיהוי אופי אקורד"
      backTo="/category/ear-training/harmonic-isolated"
      levels={LEVELS}
      generateQuestion={generateQuestion}
      onPlay={onPlay}
    />
  );
};

export default ExerciseH1;
