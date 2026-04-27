import React, { useState, useCallback } from 'react';
import MultipleChoiceShell from '../shared/MultipleChoiceShell';
import { useStoredState } from '../shared/useStoredState';
import KeySelector from '../shared/KeySelector';
import BinaryToggle from '../shared/BinaryToggle';
import harmonicAudioPlayer from '../../../utils/HarmonicAudioPlayer';
import { chordAtDegree } from '../../../constants/cadenceDefinitions';
import { EXTENDED_CHORDS, CHORD_DEFINITIONS } from '../../../constants/harmonicDefaults';

// ── Levels — per spec.md lines 423-431 ────────────────────────────────────
const LEVELS = [
  { number: 1, label: 'שלב 1 — I / V' },
  { number: 2, label: 'שלב 2 — I / IV / V' },
  { number: 3, label: 'שלב 3 — + ii' },
  { number: 4, label: 'שלב 4 — כל הדיאטוני מז\'ור' },
  { number: 5, label: 'שלב 5 — כל הדיאטוני מינור' },
  { number: 6, label: 'שלב 6 — כרומטיים (V/V, ♭VII, ♭VI)' },
];

// Degree pools per level
const DEGREE_POOL = {
  1: [1, 5],
  2: [1, 4, 5],
  3: [1, 2, 4, 5],        // spec: +ii (was vi — corrected)
  4: [1, 2, 3, 4, 5, 6, 7],
  5: [1, 2, 3, 4, 5, 6, 7],
  6: [1, 2, 3, 4, 5, 6, 7], // base — chromatic added below
};

const ROMAN_MAJOR = ['I','ii','iii','IV','V','vi','vii°'];
const ROMAN_MINOR = ['i','ii°','♭III','iv','v','♭VI','♭VII'];

// Chromatic degrees for level 6 (secondary dominant, borrowed chords)
const CHROMATIC_L6 = [
  { id:'V/V',  label:'V/V',  chordFn:(tonic) => chordAtDegree(tonic, 'major', 2) + '7' },
  { id:'bVII', label:'♭VII', chordFn:(tonic) => { const PC=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']; return PC[(PC.indexOf(tonic)+10)%12]; }},
  { id:'bVI',  label:'♭VI',  chordFn:(tonic) => { const PC=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']; return PC[(PC.indexOf(tonic)+8)%12]; }},
];

function resolveChord(name) {
  if (CHORD_DEFINITIONS[name]) return CHORD_DEFINITIONS[name];
  if (EXTENDED_CHORDS[name])   return EXTENDED_CHORDS[name].notes;
  return null;
}

const ExerciseF0 = () => {
  const [key, setKey]             = useState('C');
  const [instrument, setInstrument] = useStoredState('ear-training:F0:instrument', 'piano');

  const generateQuestion = useCallback((level) => {
    const mode = level === 5 ? 'minor' : 'major';
    const tonic = key;

    if (level === 6) {
      // Mix diatonic + chromatic
      const diatonic = [1,2,3,4,5,6,7].map(d => ({
        id: String(d),
        label: ROMAN_MAJOR[d - 1],
        chord: chordAtDegree(tonic, 'major', d),
        isChromatic: false,
      }));
      const chromatic = CHROMATIC_L6.map(c => ({
        id: c.id,
        label: c.label,
        chord: c.chordFn(tonic),
        isChromatic: true,
      }));
      const allOptions = [...diatonic, ...chromatic];
      const correct = allOptions[Math.floor(Math.random() * allOptions.length)];
      return {
        id: Date.now(),
        chord: correct.chord,
        mode: 'major',
        tonic,
        options: allOptions.map(o => ({ id: o.id, label: o.label })),
        correctId: correct.id,
      };
    }

    const pool = DEGREE_POOL[level] || [1, 5];
    const correctDegree = pool[Math.floor(Math.random() * pool.length)];
    const chord = chordAtDegree(tonic, mode, correctDegree);
    const roman = mode === 'minor' ? ROMAN_MINOR : ROMAN_MAJOR;
    const options = pool.map(d => ({ id: String(d), label: roman[d - 1] }));
    return { id: Date.now(), chord, mode, tonic, options, correctId: String(correctDegree) };
  }, [key]);

  const onPlay = useCallback(async (q) => {
    if (!harmonicAudioPlayer.initialized) await harmonicAudioPlayer.init();
    await harmonicAudioPlayer.playCadence('PAC', q.tonic, null, q.mode, 0.7);
    setTimeout(() => {
      const notes = resolveChord(q.chord);
      if (notes) harmonicAudioPlayer.playChord(notes, 2.0, 'strummed');
    }, 100);
  }, [key, instrument]);

  return (
    <MultipleChoiceShell
      id="F0"
      titleHebrew="זיהוי דרגת אקורד בודד"
      backTo="/category/ear-training/functional"
      levels={LEVELS}
      generateQuestion={generateQuestion}
      onPlay={onPlay}
      instrument={{ value: instrument, onChange: setInstrument }}
      extraControls={
        <KeySelector value={key} onChange={setKey} />
      }
    />
  );
};

export default ExerciseF0;
