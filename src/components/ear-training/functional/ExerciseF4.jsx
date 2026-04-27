import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EarTrainingHeader from '../shared/EarTrainingHeader';
import { useStoredState } from '../shared/useStoredState';
import DegreeNameToggle from '../shared/DegreeNameToggle';
import KeySelector from '../shared/KeySelector';
import BinaryToggle from '../shared/BinaryToggle';
import FeedbackOverlay from '../shared/FeedbackOverlay';
import SessionSummary from '../shared/SessionSummary';
import QuestionsCounter from '../shared/QuestionsCounter';
import { loadStoredLevel } from '../shared/LevelNavigator';
import harmonicAudioPlayer from '../../../utils/HarmonicAudioPlayer';
import { KNOWN_PROGRESSIONS, PROGRESSIONS_BY_DIFFICULTY } from '../../../constants/progressionLibrary';
import { EXTENDED_CHORDS, CHORD_DEFINITIONS } from '../../../constants/harmonicDefaults';
import '../shared/earTrainingShared.css';

// ── Levels — per spec.md lines 598-606 ────────────────────────────────────
const LEVELS = [
  { number: 1, label: 'שלב 1 — שניים בלבד' },
  { number: 2, label: 'שלב 2 — פופ/רוק 4' },
  { number: 3, label: 'שלב 3 — 6–8 מהלכים' },
  { number: 4, label: 'שלב 4 — ג\'אז' },
  { number: 5, label: 'שלב 5 — מאגר מלא' },
  { number: 6, label: 'שלב 6 — שינוי סגנון' },
];

// Semitone transposition helpers for chord name display
const NOTES_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const ENHARMONIC = { 'Db':'C#','Eb':'D#','Fb':'E','Gb':'F#','Ab':'G#','Bb':'A#','Cb':'B' };

function noteToSemitone(n) {
  const resolved = ENHARMONIC[n] || n;
  return NOTES_SHARP.indexOf(resolved);
}

function transposeChordName(chordName, semitoneShift) {
  if (!semitoneShift) return chordName;
  // Extract root (1 or 2 chars)
  let root = chordName.length >= 2 && (chordName[1] === '#' || chordName[1] === 'b')
    ? chordName.slice(0, 2)
    : chordName[0];
  const rootIdx = noteToSemitone(root);
  if (rootIdx === -1) return chordName;
  const newIdx = (rootIdx + semitoneShift + 12) % 12;
  return NOTES_SHARP[newIdx] + chordName.slice(root.length);
}

function resolveChord(n) {
  if (CHORD_DEFINITIONS[n]) return CHORD_DEFINITIONS[n];
  if (EXTENDED_CHORDS[n]) return EXTENDED_CHORDS[n].notes;
  return null;
}

function pickPool(level) {
  return PROGRESSIONS_BY_DIFFICULTY(level);
}

function makeQuestion(level) {
  const pool = pickPool(level);
  if (!pool || pool.length === 0) return makeQuestion(5);
  const correct = pool[Math.floor(Math.random() * pool.length)];
  const rest = pool.filter(p => p.id !== correct.id).sort(() => Math.random() - 0.5);
  const distractors = [correct, ...rest.slice(0, 3)].sort(() => Math.random() - 0.5);
  return { correct, distractors };
}

const ExerciseF4 = () => {
  const navigate = useNavigate();
  const storageKey = 'ear-training:F4:level';

  const [level, setLevel]              = useState(() => loadStoredLevel(storageKey, 1));
  const [numQuestions, setNumQuestions] = useState(8);
  const [displayMode, setDisplayMode]  = useState('degrees');
  const [key, setKey]                  = useState('C');
  const [instrument, setInstrument]    = useStoredState('ear-training:F4:instrument', 'piano');

  const [question, setQuestion]        = useState(() => makeQuestion(1));
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answered, setAnswered]        = useState(null);
  const [feedback, setFeedback]        = useState(null);
  const [firstTry, setFirstTry]        = useState(0);
  const [attempted, setAttempted]      = useState(false);
  const [done, setDone]                = useState(false);

  const nextQuestion = useCallback(() => {
    setQuestion(makeQuestion(level));
    setAnswered(null);
    setFeedback(null);
    setAttempted(false);
  }, [level]);

  useEffect(() => {
    setQuestionIndex(0); setFirstTry(0); setDone(false); nextQuestion();
  }, [level, numQuestions]);

  const keyShift = noteToSemitone(key); // shift from C

  const displayChords = (chords) => {
    if (displayMode === 'degrees') return null;
    return chords.map(c => transposeChordName(c, keyShift));
  };

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
        <KeySelector value={key} onChange={setKey} />
        <BinaryToggle label="כלי"
          options={[{ value:'piano', label:'פסנתר' }, { value:'guitar', label:'גיטרה' }]}
          value={instrument} onChange={setInstrument} />
        <button style={playBtn} onClick={() => playProg(question.correct)}>▶ נגן שוב</button>
      </div>

      {level === 6 && (
        <div style={{ textAlign:'center', fontSize:13, color:'#888', padding:'8px 0' }}>
          שלב זה כולל עיבודים שונים לאותו מהלך — בקרוב
        </div>
      )}

      <div style={optGrid}>
        {question.distractors.map(p => {
          const chordDisplay = displayChords(p.chords);
          const ok = answered === p.id && feedback === 'correct';
          const bad = answered === p.id && feedback === 'wrong';
          return (
            <button key={p.id} onClick={() => handleAnswer(p)} disabled={!!answered} style={{
              ...optBtn,
              ...(ok ? optCorrect : {}),
              ...(bad ? optWrong : {}),
            }}>
              <div style={{ fontWeight:700, fontSize:15 }}>{p.name}</div>
              <div style={{ fontSize:12, color: ok || bad ? '#fff' : '#888', marginTop:4 }}>
                {displayMode === 'degrees' ? p.degrees.join(' ') : chordDisplay?.join(' ')}
              </div>
              {p.examples?.length > 0 && (
                <div style={{ fontSize:11, color: ok || bad ? '#fff' : '#bbb', marginTop:3 }}>
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
const optBtn = { width:165, padding:'16px 12px', borderRadius:12, border:'2px solid #ddd', background:'#fff', cursor:'pointer', textAlign:'center', transition:'all 0.15s' };
const optCorrect = { background:'#2dbb5b', borderColor:'#2dbb5b', color:'#fff' };
const optWrong = { background:'#e74c3c', borderColor:'#e74c3c', color:'#fff' };

export default ExerciseF4;
