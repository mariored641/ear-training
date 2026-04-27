import React, { useCallback } from 'react';
import MultipleChoiceShell from '../shared/MultipleChoiceShell';
import { useStoredState } from '../shared/useStoredState';
import harmonicAudioPlayer from '../../../utils/HarmonicAudioPlayer';
import { EXTENDED_CHORDS, getInversion } from '../../../constants/harmonicDefaults';

const LEVELS = [
  { number: 1, label: 'שלב 1 — שורש / היפוך 1 (טריאדה מז\'ור)' },
  { number: 2, label: 'שלב 2 — שורש / היפוך 1 / היפוך 2 (טריאדה)' },
  { number: 3, label: 'שלב 3 — מינור גם' },
  { number: 4, label: 'שלב 4 — אקורדי שביעי, עד היפוך 2' },
  { number: 5, label: 'שלב 5 — אקורדי שביעי, כל ההיפוכים (0-3)' },
  { number: 6, label: 'שלב 6 — מעורב' }
];

const TRIADS = ['C','D','E','F','G','A'];
const TRIAD_MIN = TRIADS.map(r => r + 'm');
const SEVENTHS = ['CMaj7','Dm7','G7','Am7','FMaj7'];

const ExerciseH2 = () => {
  const [instrument, setInstrument] = useStoredState('ear-training:H2:instrument', 'piano');

  const handleInstrumentChange = async (val) => {
    setInstrument(val);
    if (harmonicAudioPlayer.initialized) await harmonicAudioPlayer.setInstrument(val);
  };

  const generateQuestion = useCallback((level) => {
    let pool, maxInv;
    if (level === 1) { pool = TRIADS; maxInv = 1; }
    else if (level === 2) { pool = TRIADS; maxInv = 2; }
    else if (level === 3) { pool = [...TRIADS, ...TRIAD_MIN]; maxInv = 2; }
    else if (level === 4) { pool = SEVENTHS; maxInv = 2; }
    else if (level === 5) { pool = SEVENTHS; maxInv = 3; }
    else { pool = [...TRIADS, ...TRIAD_MIN, ...SEVENTHS]; maxInv = 3; }

    const chord = pool[Math.floor(Math.random() * pool.length)];
    const inversion = Math.floor(Math.random() * (maxInv + 1));
    const labels = ['שורש', 'היפוך 1', 'היפוך 2', 'היפוך 3'];
    const options = Array.from({ length: maxInv + 1 }, (_, i) => ({ id: String(i), label: labels[i] }));

    return { id: Date.now(), chord, inversion, options, correctId: String(inversion) };
  }, []);

  const onPlay = useCallback(async (q) => {
    await harmonicAudioPlayer.playInversion(q.chord, q.inversion, { voicing: 'arpeggiated', duration: 1.2 });
  }, []);

  return (
    <MultipleChoiceShell
      id="H2"
      titleHebrew="זיהוי היפוך"
      backTo="/category/ear-training/harmonic-isolated"
      levels={LEVELS}
      generateQuestion={generateQuestion}
      onPlay={onPlay}
      instrument={{ value: instrument, onChange: handleInstrumentChange }}
    />
  );
};

export default ExerciseH2;
