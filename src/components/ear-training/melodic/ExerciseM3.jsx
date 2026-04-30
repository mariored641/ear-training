import React, { useCallback, useState, useEffect, useMemo } from 'react';
import MultipleChoiceShell from '../shared/MultipleChoiceShell';
import { useStoredState } from '../shared/useStoredState';
import audioPlayer from '../../../utils/AudioPlayer';
import harmonicAudioPlayer from '../../../utils/HarmonicAudioPlayer';
import { SCALE_HEBREW_NAMES } from '../../../constants/scaleQualities';
import { loadStoredLevel } from '../shared/LevelNavigator';

const LEVELS = [
  { number: 1, label: 'מז\'ור / מינור טבעי' },
  { number: 2, label: '3 מינורים — טבעי / הרמוני / מלודי' },
  { number: 3, label: 'דיאטוני — מז\'ור + 3 מינורים' },
  { number: 4, label: '4 מודוסים בסיסיים' },
  { number: 5, label: 'שבעת המודוסים' },
  { number: 6, label: 'סולמות ג\'אז' },
  { number: 7, label: 'פנטטוניים + בלוז' },
  { number: 8, label: 'סולמות סימטריים' },
  { number: 9, label: 'הכל — בחירה חופשית' }
];

const POOL_BY_LEVEL = {
  1: ['major', 'naturalMinor'],
  2: ['naturalMinor', 'harmonicMinor', 'melodicMinor'],
  3: ['major', 'naturalMinor', 'harmonicMinor', 'melodicMinor'],
  4: ['dorian', 'phrygian', 'lydian', 'mixolydian'],
  5: ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'],
  6: ['lydianDominant', 'altered', 'bebopDominant'],
  7: ['majorPentatonic', 'minorPentatonic', 'blues'],
  8: ['wholeTone', 'diminishedHW', 'diminishedWH'],
  9: [
    'major', 'naturalMinor', 'harmonicMinor', 'melodicMinor',
    'dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian',
    'lydianDominant', 'altered', 'bebopDominant',
    'majorPentatonic', 'minorPentatonic', 'blues',
    'wholeTone', 'diminishedHW', 'diminishedWH'
  ]
};

const TONICS = ['C', 'D', 'E', 'F', 'G', 'A'];

const ExerciseM3 = () => {
  const [instrument, setInstrument] = useStoredState('ear-training:M3:instrument', 'piano');
  const [advancement, setAdvancement] = useStoredState('ear-training:M3:advancement', 'auto');
  const [reference, setReference] = useStoredState('ear-training:M3:reference', 'note');
  const [currentLevel, setCurrentLevel] = useState(() => loadStoredLevel('ear-training:M3:level', 1));
  const [chipsByLevel, setChipsByLevel] = useState({});

  useEffect(() => { audioPlayer.setInstrument(instrument); }, [instrument]);

  const generateQuestion = useCallback((level, ctx) => {
    const basePool = POOL_BY_LEVEL[level] || POOL_BY_LEVEL[1];
    const active = ctx?.activeChips && ctx.activeChips.length >= 2 ? ctx.activeChips : basePool;
    const pool = active.filter(s => basePool.includes(s));
    const usePool = pool.length >= 2 ? pool : basePool;
    const correct = usePool[Math.floor(Math.random() * usePool.length)];
    const wrongs = basePool.filter(s => s !== correct).sort(() => Math.random() - 0.5).slice(0, 3);
    const all = [correct, ...wrongs].sort(() => Math.random() - 0.5);
    const tonic = TONICS[Math.floor(Math.random() * TONICS.length)];
    return {
      id: Date.now(),
      scaleName: correct,
      tonic,
      options: all.map(s => ({ id: s, label: SCALE_HEBREW_NAMES[s] || s })),
      correctId: correct
    };
  }, []);

  const onPlay = useCallback(async (q, _level, ctx) => {
    const ref = ctx?.reference ?? reference;
    if (!audioPlayer.initialized) await audioPlayer.init();
    if (ref === 'cadence') {
      if (!harmonicAudioPlayer.initialized) await harmonicAudioPlayer.init();
      await harmonicAudioPlayer.playCadence('PAC', q.tonic, null, 'major', 0.7);
      await new Promise(r => setTimeout(r, 200));
    } else if (ref === 'chord') {
      if (!harmonicAudioPlayer.initialized) await harmonicAudioPlayer.init();
      const { CHORD_DEFINITIONS } = await import('../../../constants/harmonicDefaults');
      const tonicNotes = CHORD_DEFINITIONS[q.tonic];
      if (tonicNotes) harmonicAudioPlayer.playChord(tonicNotes, 0.8, 'strummed');
      await new Promise(r => setTimeout(r, 1000));
    } else if (ref === 'note') {
      await audioPlayer.playNote(q.tonic + '4', 1.0);
      await new Promise(r => setTimeout(r, 1100));
    }
    await audioPlayer.playScaleAscending(q.scaleName, q.tonic, 130);
  }, [reference]);

  const showChips = currentLevel >= 4;
  const chipPool = POOL_BY_LEVEL[currentLevel] || [];
  const activeChips = chipsByLevel[currentLevel] ?? chipPool;

  const chipsConfig = useMemo(() => {
    if (!showChips) return undefined;
    return {
      items: chipPool.map(s => ({ id: s, label: SCALE_HEBREW_NAMES[s] || s })),
      activeIds: activeChips,
      onToggle: (id) => {
        setChipsByLevel(prev => {
          const cur = prev[currentLevel] ?? chipPool;
          const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id];
          return { ...prev, [currentLevel]: next };
        });
      },
      minActive: currentLevel === 9 ? 3 : 2
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showChips, currentLevel, JSON.stringify(activeChips), JSON.stringify(chipPool)]);

  return (
    <MultipleChoiceShell
      id="M3"
      titleHebrew="זיהוי סולם"
      backTo="/category/ear-training/melodic"
      levels={LEVELS}
      generateQuestion={generateQuestion}
      onPlay={onPlay}
      instrument={{ value: instrument, onChange: setInstrument }}
      advancement={{ value: advancement, onChange: setAdvancement }}
      reference={{ value: reference, onChange: setReference }}
      chips={chipsConfig}
      onLevelChange={setCurrentLevel}
    />
  );
};

export default ExerciseM3;
