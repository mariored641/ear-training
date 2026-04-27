import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EarTrainingHeader from '../shared/EarTrainingHeader';
import SessionSummary from '../shared/SessionSummary';
import QuestionsCounter from '../shared/QuestionsCounter';
import BinaryToggle from '../shared/BinaryToggle';
import NotationCard from '../shared/NotationCard';
import { loadStoredLevel } from '../shared/LevelNavigator';
import { useStoredState } from '../shared/useStoredState';
import harmonicAudioPlayer from '../../../utils/HarmonicAudioPlayer';
import audioPlayer from '../../../utils/AudioPlayer';
import { ET_MELODIES } from '../../../constants/earTrainingMelodies';

// ── Levels — per spec.md lines 720-728 ────────────────────────────────────
const LEVELS = [
  { number: 1, label: 'שלב 1 — מדרגי בלבד' },
  { number: 2, label: 'שלב 2 — קפיצות קטנות' },
  { number: 3, label: 'שלב 3 — ארפג\'יו' },
  { number: 4, label: 'שלב 4 — ביטויים' },
  { number: 5, label: 'שלב 5 — מז\'ור מלא' },
  { number: 6, label: 'שלב 6 — מינור' },
  { number: 7, label: 'שלב 7 — כרומטי' },
];

// A natural minor scale (A4-G5)
const MINOR_SCALE = ['A4','B4','C5','D5','E5','F5','G5','A5'];
// Chromatic pitches in C major context
const CHROMATIC_POOL = ['C4','Db4','D4','Eb4','E4','F4','Gb4','G4','Ab4','A4','Bb4','B4','C5'];

function pickMelody(level) {
  if (level <= 5) {
    const pool = ET_MELODIES.filter(m => m.level <= level && m.level >= Math.max(1, level - 1));
    if (pool.length > 0) {
      const m = pool[Math.floor(Math.random() * pool.length)];
      return { notes: m.notes, name: m.name };
    }
  }

  if (level === 6) {
    const len = 5 + Math.floor(Math.random() * 4);
    const notes = Array.from({ length: len }, () => MINOR_SCALE[Math.floor(Math.random() * MINOR_SCALE.length)]);
    return { notes, name: 'מינור' };
  }

  // Level 7: chromatic
  const len = 5 + Math.floor(Math.random() * 5);
  const notes = Array.from({ length: len }, () => CHROMATIC_POOL[Math.floor(Math.random() * CHROMATIC_POOL.length)]);
  return { notes, name: 'כרומטי' };
}

const ExerciseS1 = () => {
  const navigate = useNavigate();
  const storageKey = 'ear-training:S1:level';

  const [level, setLevel]              = useState(() => loadStoredLevel(storageKey, 1));
  const [instrument, setInstrument]    = useStoredState('ear-training:S1:instrument', 'piano');
  const [numQuestions, setNumQuestions] = useState(10);
  const [melody, setMelody]            = useState(() => pickMelody(1));
  const [questionIndex, setQuestionIndex] = useState(0);
  const [firstTry, setFirstTry]        = useState(0);
  const [done, setDone]                = useState(false);

  useEffect(() => {
    setMelody(pickMelody(level));
    setQuestionIndex(0);
    setFirstTry(0);
    setDone(false);
  }, [level, numQuestions]);

  const handleInstrumentChange = async (val) => {
    setInstrument(val);
    await audioPlayer.setInstrument(val);
  };

  const playCadence = async () => {
    const mode = level === 6 ? 'minor' : 'major';
    const tonic = level === 6 ? 'A' : 'C';
    if (!harmonicAudioPlayer.initialized) await harmonicAudioPlayer.init();
    await harmonicAudioPlayer.playCadence('PAC', tonic, null, mode, 0.8);
  };

  const playMelody = async () => {
    await audioPlayer.playSequence(melody.notes, 90);
  };

  const handleSelfRate = (correct) => {
    if (correct) setFirstTry(p => p + 1);
    if (questionIndex + 1 >= numQuestions) {
      setDone(true);
    } else {
      setQuestionIndex(p => p + 1);
      setMelody(pickMelody(level));
    }
  };

  if (done) {
    return (
      <div>
        <EarTrainingHeader exerciseTitle="S1 — שירה מתוך תווים" levels={LEVELS}
          currentLevel={level} onLevelChange={setLevel} storageKey={storageKey}
          onBack={() => navigate('/category/ear-training/solfege')} />
        <SessionSummary total={numQuestions} firstTry={firstTry}
          onRetry={() => { setQuestionIndex(0); setFirstTry(0); setDone(false); setMelody(pickMelody(level)); }}
          onBack={() => navigate('/category/ear-training/solfege')}
          levelLabel={LEVELS.find(l => l.number === level)?.label} />
      </div>
    );
  }

  return (
    <div style={{ direction: 'rtl' }}>
      <EarTrainingHeader exerciseTitle="S1 — שירה מתוך תווים" levels={LEVELS}
        currentLevel={level} onLevelChange={setLevel} storageKey={storageKey}
        onBack={() => navigate('/category/ear-training/solfege')}
        progressCurrent={questionIndex} progressTotal={numQuestions} />

      <div style={{ textAlign:'center', padding:'24px 16px' }}>
        <h2 style={{ fontSize:18, fontWeight:600, marginBottom:20, color:'var(--color-text,#222)' }}>
          שיר את המנגינה הבאה:
        </h2>

        <div style={{ display:'flex', justifyContent:'center', marginBottom:24 }}>
          <NotationCard notes={melody.notes} />
        </div>

        <div style={{ display:'flex', gap:12, justifyContent:'center', marginBottom:24, flexWrap:'wrap' }}>
          <button onClick={playCadence} style={btn}>🎵 נגן קדנצה</button>
          <button onClick={playMelody} style={btn}>▶ נגן מנגינה</button>
        </div>

        <p style={{ color:'#666', marginBottom:16, fontSize:15 }}>אחרי שירה, דרג את עצמך:</p>
        <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
          <button onClick={() => handleSelfRate(true)} style={{ ...btn, background:'#2dbb5b', borderColor:'#2dbb5b' }}>
            ✓ צדקתי
          </button>
          <button onClick={() => handleSelfRate(false)} style={{ ...btn, background:'#fff', color:'#e74c3c', borderColor:'#e74c3c' }}>
            ✗ טעיתי
          </button>
        </div>
      </div>

      <div style={settingsDivider} />

      <div style={ctrlRow}>
        <QuestionsCounter value={numQuestions} onChange={setNumQuestions} min={3} max={20} />
        <BinaryToggle label="כלי"
          options={[{ value:'piano', label:'פסנתר' }, { value:'guitar', label:'גיטרה' }]}
          value={instrument} onChange={handleInstrumentChange} />
      </div>
    </div>
  );
};

const settingsDivider = { borderTop:'1px solid #eee', margin:'8px 24px 0', opacity:0.6 };
const ctrlRow = { display:'flex', gap:16, alignItems:'center', padding:'16px 24px', justifyContent:'center', flexWrap:'wrap' };
const btn = {
  padding:'12px 24px', borderRadius:10,
  border:'2px solid var(--color-primary,#4a90e2)',
  background:'var(--color-primary,#4a90e2)', color:'#fff',
  fontSize:15, fontWeight:600, cursor:'pointer'
};

export default ExerciseS1;
