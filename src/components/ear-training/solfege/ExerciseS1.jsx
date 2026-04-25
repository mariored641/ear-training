import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EarTrainingHeader from '../shared/EarTrainingHeader';
import SessionSummary from '../shared/SessionSummary';
import audioPlayer from '../../../utils/AudioPlayer';
import { loadStoredLevel } from '../shared/LevelNavigator';

const LEVELS = [
  { number: 1, label: 'שלב 1 — דרגות 1-2-3 (מז\'ור)' },
  { number: 2, label: 'שלב 2 — דרגות 1-2-3-5' },
  { number: 3, label: 'שלב 3 — סולם דיאטוני שלם' },
  { number: 4, label: 'שלב 4 — קפיצות (1→3, 1→5)' },
  { number: 5, label: 'שלב 5 — מנגינות עם 4-5 תווים' },
  { number: 6, label: 'שלב 6 — מנגינות בנות 8 תווים' },
  { number: 7, label: 'שלב 7 — מודולציה למפתח אחר' }
];

const PC = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const SOLFEGE = { 0: 'דו', 2: 'רה', 4: 'מי', 5: 'פה', 7: 'סול', 9: 'לה', 11: 'סי' };
const MAJOR_DEG = [0, 2, 4, 5, 7, 9, 11];

function generatePattern(level) {
  let degrees;
  switch (level) {
    case 1: degrees = [0, 2, 4]; break;
    case 2: degrees = [0, 2, 4, 7]; break;
    case 3: degrees = MAJOR_DEG; break;
    case 4: degrees = [0, 4, 7, 4, 0]; break;
    case 5: degrees = Array.from({ length: 5 }, () => MAJOR_DEG[Math.floor(Math.random() * MAJOR_DEG.length)]); break;
    case 6: degrees = Array.from({ length: 8 }, () => MAJOR_DEG[Math.floor(Math.random() * MAJOR_DEG.length)]); break;
    case 7: degrees = Array.from({ length: 6 }, () => MAJOR_DEG[Math.floor(Math.random() * MAJOR_DEG.length)]); break;
    default: degrees = [0, 2, 4];
  }
  return degrees;
}

const ExerciseS1 = () => {
  const navigate = useNavigate();
  const storageKey = 'ear-training:S1:level';
  const [level, setLevel] = useState(() => loadStoredLevel(storageKey, 1));
  const [pattern, setPattern] = useState(() => generatePattern(level));
  const [questionIndex, setQuestionIndex] = useState(0);
  const [firstTry, setFirstTry] = useState(0);
  const [done, setDone] = useState(false);
  const numQuestions = 5;

  React.useEffect(() => {
    setPattern(generatePattern(level));
    setQuestionIndex(0);
    setFirstTry(0);
    setDone(false);
  }, [level]);

  const playPattern = async () => {
    const tonic = 'C';
    const tonicPc = PC.indexOf(tonic);
    const notes = pattern.map(d => PC[(tonicPc + d) % 12] + (4 + Math.floor((tonicPc + d) / 12)));
    await audioPlayer.playSequence(notes, 100);
  };

  const handleSelfRate = (correct) => {
    if (correct) setFirstTry(p => p + 1);
    if (questionIndex + 1 >= numQuestions) {
      setDone(true);
    } else {
      setQuestionIndex(p => p + 1);
      setPattern(generatePattern(level));
    }
  };

  if (done) {
    return (
      <div>
        <EarTrainingHeader exerciseTitle="S1 — שירה מתוך תווים" levels={LEVELS} currentLevel={level}
          onLevelChange={setLevel} storageKey={storageKey} onBack={() => navigate('/category/ear-training/solfege')} />
        <SessionSummary total={numQuestions} firstTry={firstTry}
          onRetry={() => { setQuestionIndex(0); setFirstTry(0); setDone(false); setPattern(generatePattern(level)); }}
          onBack={() => navigate('/category/ear-training/solfege')}
          levelLabel={LEVELS.find(l => l.number === level)?.label} />
      </div>
    );
  }

  return (
    <div style={{ direction: 'rtl' }}>
      <EarTrainingHeader exerciseTitle="S1 — שירה מתוך תווים" levels={LEVELS} currentLevel={level}
        onLevelChange={setLevel} storageKey={storageKey}
        onBack={() => navigate('/category/ear-training/solfege')}
        progressCurrent={questionIndex} progressTotal={numQuestions} />

      <div style={{ textAlign: 'center', padding: 32 }}>
        <h2>שיר את התווים הבאים:</h2>
        <div style={{ fontSize: 36, fontWeight: 700, margin: '24px 0', letterSpacing: 8 }}>
          {pattern.map((d, i) => (
            <span key={i} style={{ marginInline: 8 }}>{SOLFEGE[d] || '?'}</span>
          ))}
        </div>
        <button onClick={playPattern} style={btn}>▶ שמע רפרנס</button>
        <p style={{ marginTop: 32, color: '#666' }}>אחרי שירה, דרג את עצמך:</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 12 }}>
          <button onClick={() => handleSelfRate(true)} style={{ ...btn, background: '#2dbb5b', borderColor: '#2dbb5b' }}>✓ צדקתי</button>
          <button onClick={() => handleSelfRate(false)} style={{ ...btn, background: '#fff', color: '#e74c3c', borderColor: '#e74c3c' }}>✗ טעיתי</button>
        </div>
      </div>
    </div>
  );
};

const btn = {
  padding: '12px 24px', borderRadius: 10,
  border: '2px solid var(--color-primary, #4a90e2)',
  background: 'var(--color-primary, #4a90e2)', color: '#fff',
  fontSize: 15, fontWeight: 600, cursor: 'pointer'
};

export default ExerciseS1;
