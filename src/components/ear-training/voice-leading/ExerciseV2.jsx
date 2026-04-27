import React, { useCallback, useState, useEffect, useRef } from 'react';
import MultipleChoiceShell from '../shared/MultipleChoiceShell';
import { useStoredState } from '../shared/useStoredState';
import harmonicAudioPlayer from '../../../utils/HarmonicAudioPlayer';
import { VOICED_BY_DIFFICULTY, VOICED_PROGRESSIONS } from '../../../constants/voicedProgressions';

const LEVELS = [
  { number: 1, label: 'כיוון — עולה / יורד / חוזר' },
  { number: 2, label: 'צעד / קפיצה' },
  { number: 3, label: 'דרגות 1, 3, 5' },
  { number: 4, label: 'כל הדיאטוני' },
  { number: 5, label: 'כרומטי — passing / neighbor' },
  { number: 6, label: 'שעתוק קו סופרן' }
];

function classifyContour(degs) {
  const nums = degs.map(d => parseInt(d, 10));
  if (!nums.every(Number.isFinite)) return 'unknown';
  const allSame = nums.every(n => n === nums[0]);
  if (allSame) return 'same';
  let up = 0, down = 0;
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] > nums[i - 1]) up++;
    else if (nums[i] < nums[i - 1]) down++;
  }
  if (up > 0 && down === 0) return 'up';
  if (down > 0 && up === 0) return 'down';
  return 'mixed';
}

function classifyStepLeap(degs) {
  const nums = degs.map(d => parseInt(d, 10));
  let maxJump = 0;
  for (let i = 1; i < nums.length; i++) {
    maxJump = Math.max(maxJump, Math.abs(nums[i] - nums[i - 1]));
  }
  return maxJump <= 1 ? 'step' : 'leap';
}

const ExerciseV2 = () => {
  const [instrument, setInstrument] = useStoredState('ear-training:V2:instrument', 'piano');
  const [advancement, setAdvancement] = useStoredState('ear-training:V2:advancement', 'auto');
  const questionRef = useRef(null);

  useEffect(() => {
    if (harmonicAudioPlayer.setInstrument) harmonicAudioPlayer.setInstrument(instrument);
  }, [instrument]);

  const generateQuestion = useCallback((level) => {
    const list = VOICED_PROGRESSIONS;
    const correct = list[Math.floor(Math.random() * list.length)];
    const sopranoDegs = correct.sopranoDegrees || [];

    if (level === 1) {
      const id = classifyContour(sopranoDegs);
      return {
        id: Date.now(),
        progression: correct,
        options: [
          { id: 'up',   label: '↑ עולה' },
          { id: 'down', label: '↓ יורד' },
          { id: 'same', label: '→ חוזר' },
          { id: 'mixed', label: '↕ מעורב' }
        ],
        correctId: id
      };
    }

    if (level === 2) {
      const id = classifyStepLeap(sopranoDegs);
      return {
        id: Date.now(),
        progression: correct,
        options: [
          { id: 'step', label: 'צעד' },
          { id: 'leap', label: 'קפיצה' }
        ],
        correctId: id
      };
    }

    if (level === 3) {
      // Identify which of degrees 1/3/5 the soprano lands on (last note)
      const last = sopranoDegs[sopranoDegs.length - 1];
      const id = ['1','3','5'].includes(last) ? last : '1';
      return {
        id: Date.now(),
        progression: correct,
        options: [
          { id: '1', label: '1' },
          { id: '3', label: '3' },
          { id: '5', label: '5' }
        ],
        correctId: id
      };
    }

    // L4-L6: identify whole soprano line
    const distractors = list.filter(p => p.id !== correct.id).sort(() => Math.random() - 0.5).slice(0, 3);
    const all = [correct, ...distractors].sort(() => Math.random() - 0.5);
    return {
      id: Date.now(),
      progression: correct,
      options: all.map(p => ({ id: p.id, label: 'סופרן: ' + p.sopranoDegrees.join('-') })),
      correctId: correct.id
    };
  }, []);

  const onPlay = useCallback(async (q) => {
    questionRef.current = q;
    await harmonicAudioPlayer.playWithEmphasis(
      q.progression.voicings,
      'soprano',
      { chordDuration: 1.4 }
    );
  }, []);

  const handleSopranoEmphasis = useCallback(async () => {
    if (!questionRef.current?.progression?.voicings) return;
    await harmonicAudioPlayer.playWithEmphasis(
      questionRef.current.progression.voicings,
      'soprano',
      { chordDuration: 1.4, sopranoBoost: true }
    );
  }, []);

  const extraControls = (
    <button
      onClick={handleSopranoEmphasis}
      style={{
        padding: '6px 14px',
        borderRadius: 8,
        border: '1px solid var(--color-primary, #4a90e2)',
        background: 'transparent',
        color: 'var(--color-primary, #4a90e2)',
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer'
      }}
    >🔊 הבלט סופרן</button>
  );

  return (
    <MultipleChoiceShell
      id="V2"
      titleHebrew="עקיבת קו סופרן"
      backTo="/category/ear-training/voice-leading"
      levels={LEVELS}
      generateQuestion={generateQuestion}
      onPlay={onPlay}
      instrument={{ value: instrument, onChange: setInstrument }}
      advancement={{ value: advancement, onChange: setAdvancement }}
      extraControls={extraControls}
    />
  );
};

export default ExerciseV2;
