import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EarTrainingHeader from '../shared/EarTrainingHeader';
import DegreeNameToggle from '../shared/DegreeNameToggle';
import FeedbackOverlay from '../shared/FeedbackOverlay';
import SessionSummary from '../shared/SessionSummary';
import QuestionsCounter from '../shared/QuestionsCounter';
import { loadStoredLevel } from '../shared/LevelNavigator';
import harmonicAudioPlayer from '../../../utils/HarmonicAudioPlayer';
import { KNOWN_PROGRESSIONS, PROGRESSIONS_BY_DIFFICULTY } from '../../../constants/progressionLibrary';
import { EXTENDED_CHORDS, CHORD_DEFINITIONS } from '../../../constants/harmonicDefaults';
import '../shared/earTrainingShared.css';

const LEVELS = [
  { number: 1, label: 'שלב 1 — Pop בסיסי (קלות 1)' },
  { number: 2, label: 'שלב 2 — + ii-V-I, Andalusian, מינור' },
  { number: 3, label: 'שלב 3 — + Rhythm Changes, Blues' },
  { number: 4, label: 'שלב 4 — מז\'ור בלבד' },
  { number: 5, label: 'שלב 5 — מינור בלבד' },
  { number: 6, label: 'שלב 6 — הכל' },
];

function resolveChord(n) {
  if (CHORD_DEFINITIONS[n]) return CHORD_DEFINITIONS[n];
  if (EXTENDED_CHORDS[n]) return EXTENDED_CHORDS[n].notes;
  return null;
}

function pickPool(level) {
  if (level <= 3) return PROGRESSIONS_BY_DIFFICULTY(level);
  if (level === 4) return KNOWN_PROGRESSIONS.filter(p => p.mode === 'major');
  if (level === 5) return KNOWN_PROGRESSIONS.filter(p => p.mode === 'minor');
  return KNOWN_PROGRESSIONS;
}

function makeQuestion(level) {
  const pool = pickPool(level) || KNOWN_PROGRESSIONS;
  const correct = pool[Math.floor(Math.random() * pool.length)];
  const distractors = pool.filter(p => p.id !== correct.id).sort(() => Math.random() - 0.5).slice(0, 3);
  return { correct, distractors: [correct, ...distractors].sort(() => Math.random() - 0.5) };
}

const ExerciseF4 = () => {
  const navigate = useNavigate();
  const storageKey = 'ear-training:F4:level';
  const [level, setLevel] = useState(() => loadStoredLevel(storageKey, 1));
  const [numQuestions, setNumQuestions] = useState(8);
  const [displayMode, setDisplayMode] = useState('degrees');

  const [question, setQuestion] = useState(() => makeQuestion(1));
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answered, setAnswered] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [firstTry, setFirstTry] = useState(0);
  const [attempted, setAttempted] = useState(false);
  const [done, setDone] = useState(false);

  const nextQuestion = useCallback(() => {
    setQuestion(makeQuestion(level));
    setAnswered(null);
    setFeedback(null);
    setAttempted(false);
  }, [level]);

  useEffect(() => {
    setQuestionIndex(0); setFirstTry(0); setDone(false); nextQuestion();
  }, [level, numQuestions]);

  const playProg = useCallback(async (prog) => {
    if (!harmonicAudioPlayer.initialized) await harmonicAudioPlayer.init();
    for (const ch of prog.chords) {
      const notes = resolveChord(ch);
      if (notes) harmonicAudioPlayer.playChord(notes, 1.0, 'strummed');
      await new Promise(r => setTimeout(r, 1100));
    }
  }, []);

  const handleAnswer = (p) => {
    if (done || answered) return;
    const ok = p.id === question.correct.id;
    setAnswered(p.id);
    setFeedback(ok ? 'correct' : 'wrong');
    if (ok && !attempted) setFirstTry(prev => prev + 1);
    setAttempted(true);
    setTimeout(() => setFeedback(null), 600);
    if (ok) {
      setTimeout(() => {
        if (questionIndex + 1 >= numQuestions) { setDone(true); }
        else { setQuestionIndex(p => p + 1); nextQuestion(); }
      }, 800);
    }
  };

  if (done) {
    return (
      <>
        <EarTrainingHeader exerciseTitle="F4 — זיהוי מהלך מוכר" levels={LEVELS} currentLevel={level}
          onLevelChange={setLevel} storageKey={storageKey}
          onBack={() => navigate('/category/ear-training/functional')} />
        <SessionSummary total={numQuestions} firstTry={firstTry}
          onRetry={() => { setQuestionIndex(0); setFirstTry(0); setDone(false); nextQuestion(); }}
          onBack={() => navigate('/category/ear-training/functional')}
          levelLabel={LEVELS.find(l => l.number === level)?.label} />
      </>
    );
  }

  return (
    <div style={{ direction: 'rtl' }}>
      <EarTrainingHeader exerciseTitle="F4 — זיהוי מהלך מוכר" levels={LEVELS} currentLevel={level}
        onLevelChange={setLevel} storageKey={storageKey}
        onBack={() => navigate('/category/ear-training/functional')}
        progressCurrent={questionIndex} progressTotal={numQuestions} />

      <div style={ctrlRow}>
        <QuestionsCounter value={numQuestions} onChange={setNumQuestions} min={3} max={20} />
        <DegreeNameToggle mode={displayMode} onToggle={setDisplayMode} />
        <button style={playBtn} onClick={() => playProg(question.correct)}>▶ נגן שוב</button>
      </div>

      {/* Chord labels */}
      <div style={{ textAlign: 'center', padding: '16px 8px 0', fontSize: 13, color: '#888' }}>
        {displayMode === 'degrees'
          ? question.correct.degrees.join(' — ')
          : question.correct.chords.join(' — ')}
      </div>

      {/* Options */}
      <div style={optGrid}>
        {question.distractors.map(p => {
          const ok = answered === p.id && feedback === 'correct';
          const bad = answered === p.id && feedback === 'wrong';
          return (
            <button key={p.id} onClick={() => handleAnswer(p)} style={{
              ...optBtn,
              ...(ok ? optCorrect : {}),
              ...(bad ? optWrong : {}),
            }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: ok || bad ? '#fff' : '#888', marginTop: 4 }}>
                {displayMode === 'degrees' ? p.degrees.join(' ') : p.chords.join(' ')}
              </div>
              {p.examples?.length > 0 && (
                <div style={{ fontSize: 11, color: ok || bad ? '#fff' : '#bbb', marginTop: 3 }}>
                  {p.examples[0]}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <FeedbackOverlay state={feedback} />
    </div>
  );
};

const ctrlRow = { display:'flex', flexWrap:'wrap', gap:16, alignItems:'center', padding:'16px 24px', borderBottom:'1px solid #eee', justifyContent:'center' };
const playBtn = { padding:'10px 20px', borderRadius:10, border:'2px solid var(--color-primary,#4a90e2)', background:'var(--color-primary,#4a90e2)', color:'#fff', fontSize:15, fontWeight:600, cursor:'pointer' };
const optGrid = { display:'flex', flexWrap:'wrap', gap:12, justifyContent:'center', padding:'24px 16px', maxWidth:700, margin:'0 auto' };
const optBtn = { width:160, padding:'16px 12px', borderRadius:12, border:'2px solid #ddd', background:'#fff', cursor:'pointer', textAlign:'center', transition:'all 0.15s' };
const optCorrect = { background:'#2dbb5b', borderColor:'#2dbb5b', color:'#fff' };
const optWrong = { background:'#e74c3c', borderColor:'#e74c3c', color:'#fff' };

export default ExerciseF4;
