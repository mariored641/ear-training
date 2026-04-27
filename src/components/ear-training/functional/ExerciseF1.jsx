import React, { useCallback, useState, useEffect } from 'react';
import MultipleChoiceShell from '../shared/MultipleChoiceShell';
import { useStoredState } from '../shared/useStoredState';
import harmonicAudioPlayer from '../../../utils/HarmonicAudioPlayer';
import { CADENCE_LABELS } from '../../../constants/cadenceDefinitions';
import { KEYS } from '../shared/KeySelector';
import KeySelector from '../shared/KeySelector';

const LEVELS = [
  { number: 1, label: 'PAC / HC' },
  { number: 2, label: '+ IAC' },
  { number: 3, label: '+ Plagal' },
  { number: 4, label: '+ Deceptive — מז\'ור' },
  { number: 5, label: 'כל הסוגים — מינור' },
  { number: 6, label: 'בתוך פסקה מלאה' }
];

const POOLS = {
  1: ['PAC', 'HC'],
  2: ['PAC', 'HC', 'IAC'],
  3: ['PAC', 'HC', 'IAC', 'Plagal'],
  4: ['PAC', 'HC', 'IAC', 'Plagal', 'Deceptive'],
  5: ['PAC', 'HC', 'IAC', 'Plagal', 'Deceptive'],
  6: ['PAC', 'HC', 'IAC', 'Plagal', 'Deceptive']
};

const ExerciseF1 = () => {
  const [instrument, setInstrument] = useStoredState('ear-training:F1:instrument', 'piano');
  const [advancement, setAdvancement] = useStoredState('ear-training:F1:advancement', 'auto');
  const [keyTonic, setKeyTonic] = useState('C');

  useEffect(() => {
    if (harmonicAudioPlayer.setInstrument) harmonicAudioPlayer.setInstrument(instrument);
  }, [instrument]);

  const generateQuestion = useCallback((level) => {
    const pool = POOLS[level] || POOLS[1];
    const correct = pool[Math.floor(Math.random() * pool.length)];
    const mode = level >= 5 ? 'minor' : 'major';
    const options = pool.map(t => ({ id: t, label: CADENCE_LABELS[t]?.split(' — ')[0] || t }));
    return { id: Date.now(), cadenceType: correct, mode, tonic: keyTonic, options, correctId: correct, level };
  }, [keyTonic]);

  const onPlay = useCallback(async (q) => {
    await harmonicAudioPlayer.playCadence(q.cadenceType, q.tonic, null, q.mode, 1.0);
  }, []);

  return (
    <MultipleChoiceShell
      id="F1"
      titleHebrew="זיהוי קדנצה"
      backTo="/category/ear-training/functional"
      levels={LEVELS}
      generateQuestion={generateQuestion}
      onPlay={onPlay}
      instrument={{ value: instrument, onChange: setInstrument }}
      advancement={{ value: advancement, onChange: setAdvancement }}
      extraControls={<KeySelector value={keyTonic} onChange={setKeyTonic} keys={KEYS} />}
    />
  );
};

export default ExerciseF1;
