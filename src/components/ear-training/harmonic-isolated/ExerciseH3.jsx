import React, { useCallback, useState, useEffect, useMemo } from 'react';
import MultipleChoiceShell from '../shared/MultipleChoiceShell';
import { useStoredState } from '../shared/useStoredState';
import harmonicAudioPlayer from '../../../utils/HarmonicAudioPlayer';
import { EXTENDED_CHORDS } from '../../../constants/harmonicDefaults';
import { loadStoredLevel } from '../shared/LevelNavigator';

const LEVELS = [
  { number: 1, label: 'טריאדה / שביעי' },
  { number: 2, label: 'sus2 / sus4 / טריאדה רגילה' },
  { number: 3, label: 'add9 / Maj9 / טריאדה' },
  { number: 4, label: 'כל אקורדי שביעי' },
  { number: 5, label: 'הרחבות — 9 / 11 / 13' },
  { number: 6, label: 'הכל — בחירה חופשית' }
];

// Each option: { id, label, suffixes: [chord suffixes that match] }
const LEVEL_OPTIONS = {
  1: [
    { id: 'triad',   label: 'טריאדה',  suffixes: ['', 'm'] },
    { id: 'seventh', label: 'שביעי',    suffixes: ['Maj7', 'm7', '7'] }
  ],
  2: [
    { id: 'sus2',  label: 'sus2',           suffixes: ['sus2'] },
    { id: 'sus4',  label: 'sus4',           suffixes: ['sus4'] },
    { id: 'triad', label: 'טריאדה רגילה',  suffixes: ['', 'm'] }
  ],
  3: [
    { id: 'add9',  label: 'add9',     suffixes: ['add9'] },
    { id: 'maj9',  label: 'Maj9',     suffixes: ['Maj9'] },
    { id: 'triad', label: 'טריאדה',   suffixes: ['', 'm'] }
  ],
  4: [
    { id: 'maj7',     label: 'Maj7',  suffixes: ['Maj7'] },
    { id: 'm7',       label: 'm7',    suffixes: ['m7'] },
    { id: 'dom7',     label: '7',     suffixes: ['7'] },
    { id: 'half-dim', label: 'm7♭5',  suffixes: ['m7b5'] },
    { id: 'dim7',     label: 'dim7',  suffixes: ['dim7'] }
  ],
  5: [
    { id: '9',  label: '9',  suffixes: ['9', 'm9', 'Maj9'] },
    { id: '11', label: '11', suffixes: ['11'] },
    { id: '13', label: '13', suffixes: ['13'] }
  ],
  6: [
    { id: 'm7',    label: 'm7',    suffixes: ['m7'] },
    { id: 'maj7',  label: 'Maj7',  suffixes: ['Maj7'] },
    { id: 'dom7',  label: '7',     suffixes: ['7'] },
    { id: 'sus4',  label: 'sus4',  suffixes: ['sus4'] },
    { id: 'add9',  label: 'add9',  suffixes: ['add9'] }
  ]
};

const ROOTS = ['C','D','E','F','G','A'];

const ExerciseH3 = () => {
  const [instrument, setInstrument] = useStoredState('ear-training:H3:instrument', 'piano');
  const [advancement, setAdvancement] = useStoredState('ear-training:H3:advancement', 'auto');
  const [currentLevel, setCurrentLevel] = useState(() => loadStoredLevel('ear-training:H3:level', 1));
  const [chipsByLevel, setChipsByLevel] = useState({});

  useEffect(() => {
    if (harmonicAudioPlayer.setInstrument) harmonicAudioPlayer.setInstrument(instrument);
  }, [instrument]);

  const generateQuestion = useCallback((level, ctx) => {
    const allOptions = LEVEL_OPTIONS[level] || LEVEL_OPTIONS[1];
    const activeChips = ctx?.activeChips;
    const optionsToUse = level === 6 && activeChips && activeChips.length >= 2
      ? allOptions.filter(o => activeChips.includes(o.id))
      : allOptions;
    const correctOpt = optionsToUse[Math.floor(Math.random() * optionsToUse.length)];
    const root = ROOTS[Math.floor(Math.random() * ROOTS.length)];
    const suffix = correctOpt.suffixes[Math.floor(Math.random() * correctOpt.suffixes.length)];
    const chordName = root + suffix;
    return {
      id: Date.now(),
      chord: chordName,
      options: allOptions.map(o => ({ id: o.id, label: o.label })),
      correctId: correctOpt.id
    };
  }, []);

  const onPlay = useCallback(async (q, level, ctx) => {
    const def = EXTENDED_CHORDS[q.chord];
    if (!def) return;
    if (!harmonicAudioPlayer.initialized) await harmonicAudioPlayer.init();
    const voicing = (ctx?.instrument === 'guitar') ? 'strummed' : 'arpeggiated';
    harmonicAudioPlayer.playChord(def.notes, 1.5, voicing);
  }, []);

  const showChips = currentLevel === 6;
  const chipPool = LEVEL_OPTIONS[6].map(o => ({ id: o.id, label: o.label }));
  const activeChips = chipsByLevel[6] ?? chipPool.map(c => c.id);

  const chipsConfig = useMemo(() => {
    if (!showChips) return undefined;
    return {
      items: chipPool,
      activeIds: activeChips,
      onToggle: (id) => {
        setChipsByLevel(prev => {
          const cur = prev[6] ?? chipPool.map(c => c.id);
          const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id];
          return { ...prev, 6: next };
        });
      },
      minActive: 2
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showChips, JSON.stringify(activeChips)]);

  return (
    <MultipleChoiceShell
      id="H3"
      titleHebrew="זיהוי סוג אקורד"
      backTo="/category/ear-training/harmonic-isolated"
      levels={LEVELS}
      generateQuestion={generateQuestion}
      onPlay={onPlay}
      instrument={{ value: instrument, onChange: setInstrument }}
      advancement={{ value: advancement, onChange: setAdvancement }}
      chips={chipsConfig}
      onLevelChange={setCurrentLevel}
    />
  );
};

export default ExerciseH3;
