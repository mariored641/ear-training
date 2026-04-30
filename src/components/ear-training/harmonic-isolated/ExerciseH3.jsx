import React, { useCallback, useState, useEffect, useMemo } from 'react';
import MultipleChoiceShell from '../shared/MultipleChoiceShell';
import BinaryToggle from '../shared/BinaryToggle';
import { useStoredState } from '../shared/useStoredState';
import harmonicAudioPlayer from '../../../utils/HarmonicAudioPlayer';
import { EXTENDED_CHORDS } from '../../../constants/harmonicDefaults';
import { loadStoredLevel } from '../shared/LevelNavigator';
import { getChordLabel, TERMINOLOGY_TOGGLE_OPTIONS } from '../../../constants/chordTerminology';

const LEVELS = [
  { number: 1, label: "מז'ור-מינור / שביעי" },
  { number: 2, label: "sus2 / sus4 / מז'ור-מינור" },
  { number: 3, label: "add9 / Maj9 / מז'ור-מינור" },
  { number: 4, label: 'כל אקורדי שביעי' },
  { number: 5, label: 'הרחבות — 9 / 11 / 13' },
  { number: 6, label: 'הכל — בחירה חופשית' }
];

// Each option: { id, key, suffixes: [chord suffixes that match] }
// `key` resolves through chordTerminology (Hebrew vs notation).
const LEVEL_OPTIONS = {
  1: [
    { id: 'triad',   key: 'triad',   suffixes: ['', 'm'] },
    { id: 'seventh', key: 'seventh', suffixes: ['Maj7', 'm7', '7'] }
  ],
  2: [
    { id: 'sus2',  key: 'sus2',  suffixes: ['sus2'] },
    { id: 'sus4',  key: 'sus4',  suffixes: ['sus4'] },
    { id: 'triad', key: 'triad', suffixes: ['', 'm'] }
  ],
  3: [
    { id: 'add9',  key: 'add9',  suffixes: ['add9'] },
    { id: 'maj9',  key: 'maj9',  suffixes: ['Maj9'] },
    { id: 'triad', key: 'triad', suffixes: ['', 'm'] }
  ],
  4: [
    { id: 'maj7',     key: 'maj7',    suffixes: ['Maj7'] },
    { id: 'm7',       key: 'm7',      suffixes: ['m7'] },
    { id: 'dom7',     key: 'dom7',    suffixes: ['7'] },
    { id: 'half-dim', key: 'halfDim', suffixes: ['m7b5'] },
    { id: 'dim7',     key: 'dim7',    suffixes: ['dim7'] }
  ],
  5: [
    { id: '9',  key: 'nine',     suffixes: ['9', 'm9', 'Maj9'] },
    { id: '11', key: 'eleven',   suffixes: ['11'] },
    { id: '13', key: 'thirteen', suffixes: ['13'] }
  ],
  6: [
    { id: 'm7',    key: 'm7',    suffixes: ['m7'] },
    { id: 'maj7',  key: 'maj7',  suffixes: ['Maj7'] },
    { id: 'dom7',  key: 'dom7',  suffixes: ['7'] },
    { id: 'sus4',  key: 'sus4',  suffixes: ['sus4'] },
    { id: 'add9',  key: 'add9',  suffixes: ['add9'] }
  ]
};

const ROOTS = ['C','D','E','F','G','A'];

const ExerciseH3 = () => {
  const [instrument, setInstrument] = useStoredState('ear-training:H3:instrument', 'piano');
  const [advancement, setAdvancement] = useStoredState('ear-training:H3:advancement', 'auto');
  const [termMode, setTermMode] = useStoredState('ear-training:H3:termMode', 'hebrew');
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
      options: allOptions.map(o => ({ id: o.id, key: o.key, label: getChordLabel(o.key, termMode) })),
      correctId: correctOpt.id
    };
  }, [termMode]);

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
      questionKey={(q) => q.correctId + '_' + q.chord}
      getOptionLabel={(opt) => getChordLabel(opt.key || opt.id, termMode)}
      extraControls={
        <BinaryToggle
          label="תצוגה"
          options={TERMINOLOGY_TOGGLE_OPTIONS}
          value={termMode}
          onChange={setTermMode}
        />
      }
    />
  );
};

export default ExerciseH3;
