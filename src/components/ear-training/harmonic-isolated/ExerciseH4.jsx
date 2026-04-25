import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EarTrainingHeader from '../shared/EarTrainingHeader';
import FeedbackOverlay from '../shared/FeedbackOverlay';
import SessionSummary from '../shared/SessionSummary';
import QuestionsCounter from '../shared/QuestionsCounter';
import { loadStoredLevel } from '../shared/LevelNavigator';
import harmonicAudioPlayer from '../../../utils/HarmonicAudioPlayer';
import { EXTENDED_CHORDS } from '../../../constants/harmonicDefaults';
import '../shared/earTrainingShared.css';

const LEVELS = [
  { number: 1, label: 'שלב 1 — טנשן 9 טבעי (9 בלבד)' },
  { number: 2, label: 'שלב 2 — b9 / 9 / #9' },
  { number: 3, label: 'שלב 3 — + #11' },
  { number: 4, label: 'שלב 4 — + b13 / 13' },
  { number: 5, label: 'שלב 5 — כל הטנשנים (9, b9, #9, #11, b13, 13)' },
  { number: 6, label: 'שלב 6 — שניים בו-זמנית' },
  { number: 7, label: 'שלב 7 — Upper Structure Triads' },
];

const ALL_TENSIONS = ['9','b9','#9','#11','b13','13'];
const TENSION_LABELS = { '9':'9', 'b9':'♭9', '#9':'♯9', '#11':'♯11', 'b13':'♭13', '13':'13' };

const LEVEL_POOL = {
  1: [['9']],
  2: [['b9'],['9'],['#9']],
  3: [['b9'],['9'],['#9'],['#11']],
  4: [['b9'],['9'],['#9'],['#11'],['b13'],['13']],
  5: [['b9'],['9'],['#9'],['#11'],['b13'],['13']],
  6: [['b9','#11'],['9','13'],['#9','b13'],['b9','13']],
  7: [['b9','#9'],['b9','#11','b13'],['9','#11','13']],
};
const BASE_CHORDS = ['C7','D7','E7','F7','G7','A7','Bb7'];

const ExerciseH4 = () => {
  const navigate = useNavigate();
  const storageKey = 'ear-training:H4:level';
  const [level, setLevel] = useState(() => loadStoredLevel(storageKey, 1));
  const [numQuestions, setNumQuestions] = useState(8);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [correctTensions, setCorrectTensions] = useState([]);
  const [baseChord, setBaseChord] = useState('C7');
  const [checked, setChecked] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [firstTry, setFirstTry] = useState(0);
  const [done, setDone] = useState(false);

  const generateAndPlay = useCallback(async () => {
    const pool = LEVEL_POOL[level] || LEVEL_POOL[1];
    const tensions = pool[Math.floor(Math.random() * pool.length)];
    const chord = BASE_CHORDS[Math.floor(Math.random() * BASE_CHORDS.length)];
    setCorrectTensions(tensions);
    setBaseChord(chord);
    setChecked({});
    setSubmitted(false);
    setFeedback(null);

    if (!harmonicAudioPlayer.initialized) await harmonicAudioPlayer.init();
    await harmonicAudioPlayer.playWithTensions(chord, tensions, { duration: 2.0, voicing: 'strummed' });
  }, [level]);

  useEffect(() => {
    setQuestionIndex(0); setFirstTry(0); setDone(false);
    setTimeout(generateAndPlay, 100);
  }, [level, numQuestions]);

  const handleCheck = (t) => {
    if (submitted) return;
    setChecked(prev => ({ ...prev, [t]: !prev[t] }));
  };

  const handleSubmit = () => {
    const picked = ALL_TENSIONS.filter(t => checked[t]);
    const correct = correctTensions.sort().join(',') === picked.sort().join(',');
    setSubmitted(true);
    setFeedback(correct ? 'correct' : 'wrong');
    if (correct) setFirstTry(p => p + 1);
    setTimeout(() => {
      setFeedback(null);
      if (questionIndex + 1 >= numQuestions) { setDone(true); }
      else { setQuestionIndex(p => p + 1); setTimeout(generateAndPlay, 100); }
    }, 1000);
  };

  const visibleTensions = level <= 1 ? ['9'] : level === 2 ? ['b9','9','#9'] : level === 3 ? ['b9','9','#9','#11'] : ALL_TENSIONS;

  if (done) {
    return (
      <>
        <EarTrainingHeader exerciseTitle="H4 — זיהוי טנשנים" levels={LEVELS} currentLevel={level}
          onLevelChange={setLevel} storageKey={storageKey}
          onBack={() => navigate('/category/ear-training/harmonic-isolated')} />
        <SessionSummary total={numQuestions} firstTry={firstTry}
          onRetry={() => { setQuestionIndex(0); setFirstTry(0); setDone(false); setTimeout(generateAndPlay, 100); }}
          onBack={() => navigate('/category/ear-training/harmonic-isolated')}
          levelLabel={LEVELS.find(l => l.number === level)?.label} />
      </>
    );
  }

  return (
    <div style={{ direction: 'rtl' }}>
      <EarTrainingHeader exerciseTitle="H4 — זיהוי טנשנים (ג'אז)" levels={LEVELS} currentLevel={level}
        onLevelChange={setLevel} storageKey={storageKey}
        onBack={() => navigate('/category/ear-training/harmonic-isolated')}
        progressCurrent={questionIndex} progressTotal={numQuestions} />

      <div style={ctrlRow}>
        <QuestionsCounter value={numQuestions} onChange={setNumQuestions} min={3} max={20} />
        <button style={playBtn} onClick={generateAndPlay}>▶ נגן שוב</button>
      </div>

      <div style={{ textAlign:'center', color:'#888', margin:'16px 0', fontSize:14 }}>
        אקורד: <strong style={{ color:'#222', fontSize:16 }}>{baseChord}</strong> — אילו טנשנים שומעים?
      </div>

      <div style={tensionGrid}>
        {visibleTensions.map(t => {
          const isChecked = !!checked[t];
          const correct = submitted && correctTensions.includes(t);
          const wrong = submitted && isChecked && !correctTensions.includes(t);
          const missed = submitted && !isChecked && correctTensions.includes(t);
          return (
            <button key={t} onClick={() => handleCheck(t)} style={{
              ...tensionBtn,
              ...(isChecked && !submitted ? { background:'var(--color-primary,#4a90e2)', color:'#fff', borderColor:'var(--color-primary,#4a90e2)' } : {}),
              ...(correct ? { background:'#2dbb5b', color:'#fff', borderColor:'#2dbb5b' } : {}),
              ...(wrong   ? { background:'#e74c3c', color:'#fff', borderColor:'#e74c3c' } : {}),
              ...(missed  ? { borderColor:'#2dbb5b', outline:'2px dashed #2dbb5b' } : {}),
            }}>
              {TENSION_LABELS[t]}
              {submitted && (correct ? ' ✓' : wrong ? ' ✗' : missed ? ' ←' : '')}
            </button>
          );
        })}
      </div>

      {!submitted && (
        <div style={{ textAlign:'center', marginTop:24 }}>
          <button style={submitBtn} onClick={handleSubmit}>אשר</button>
        </div>
      )}

      <FeedbackOverlay state={feedback} />
    </div>
  );
};

const ctrlRow = { display:'flex', gap:16, alignItems:'center', padding:'16px 24px', borderBottom:'1px solid #eee', justifyContent:'center' };
const playBtn = { padding:'10px 20px', borderRadius:10, border:'2px solid var(--color-primary,#4a90e2)', background:'var(--color-primary,#4a90e2)', color:'#fff', fontSize:15, fontWeight:600, cursor:'pointer' };
const tensionGrid = { display:'flex', flexWrap:'wrap', gap:16, justifyContent:'center', padding:'32px 16px', maxWidth:500, margin:'0 auto' };
const tensionBtn = { width:90, height:90, borderRadius:12, border:'2px solid #ddd', background:'#fff', fontSize:22, fontWeight:700, cursor:'pointer', transition:'all 0.15s' };
const submitBtn = { padding:'14px 40px', borderRadius:12, border:'none', background:'var(--color-primary,#4a90e2)', color:'#fff', fontSize:16, fontWeight:700, cursor:'pointer' };

export default ExerciseH4;
