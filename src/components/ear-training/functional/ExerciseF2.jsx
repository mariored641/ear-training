import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import EarTrainingHeader from '../shared/EarTrainingHeader';
import DegreeNameToggle from '../shared/DegreeNameToggle';
import FeedbackOverlay from '../shared/FeedbackOverlay';
import SessionSummary from '../shared/SessionSummary';
import QuestionsCounter from '../shared/QuestionsCounter';
import { loadStoredLevel } from '../shared/LevelNavigator';
import harmonicAudioPlayer from '../../../utils/HarmonicAudioPlayer';
import { CHORD_DEFINITIONS, EXTENDED_CHORDS } from '../../../constants/harmonicDefaults';
import { chordAtDegree } from '../../../constants/cadenceDefinitions';
import '../shared/earTrainingShared.css';

// ── Level definitions ──────────────────────────────────────────────────────
const LEVELS = [
  { number: 1, label: 'שלב 1 — I / V (2 אקורדים)' },
  { number: 2, label: 'שלב 2 — I / IV / V (3 אקורדים)' },
  { number: 3, label: 'שלב 3 — I / IV / V / vi (4 אקורדים)' },
  { number: 4, label: 'שלב 4 — כל הדיאטוני, רצף 4' },
  { number: 5, label: 'שלב 5 — + II7 (secondary dominant)' },
  { number: 6, label: 'שלב 6 — + IV מינורי (borrowed)' },
  { number: 7, label: 'שלב 7 — + ♭VII, ♭VI (Neapolitan)' },
  { number: 8, label: "שלב 8 — ג'אז: ii-V-I, turnaround" },
  { number: 9, label: 'שלב 9 — מפתחות שונים' },
];

// Pool of diatonic degrees per level
const DEGREE_POOLS = {
  1: [1, 5],
  2: [1, 4, 5],
  3: [1, 4, 5, 6],
  4: [1, 2, 3, 4, 5, 6, 7],
  5: [1, 2, 3, 4, 5, 6, 7],
  6: [1, 2, 3, 4, 5, 6, 7],
  7: [1, 2, 3, 4, 5, 6, 7],
  8: [1, 2, 3, 4, 5, 6, 7],
  9: [1, 2, 3, 4, 5, 6, 7],
};

const ROMAN_MAJOR = ['I','ii','iii','IV','V','vi','vii°'];
const ROMAN_MINOR = ['i','ii°','III','iv','v','VI','VII'];
const TONIC = 'C';
const MODE = 'major';

function getButtons(level) {
  const base = (DEGREE_POOLS[level] || DEGREE_POOLS[1]).map(d => {
    const name = chordAtDegree(TONIC, MODE, d);
    return { degree: d, name, roman: ROMAN_MAJOR[d - 1] };
  });
  if (level === 5) {
    base.push({ degree: 'V/ii', name: 'A', roman: 'V/ii' });
    base.push({ degree: 'V/IV', name: 'C7', roman: 'V/IV' });
  }
  if (level === 6) {
    base.push({ degree: 'iv', name: 'Fm', roman: 'iv (minor)' });
    base.push({ degree: 'bVII', name: 'Bb', roman: '♭VII' });
  }
  if (level >= 7) {
    base.push({ degree: 'bVI', name: 'Ab', roman: '♭VI' });
    base.push({ degree: 'bVII', name: 'Bb', roman: '♭VII' });
  }
  if (level === 8) {
    return [
      { degree: 'I', name: 'CMaj7', roman: 'IMaj7' },
      { degree: 'ii', name: 'Dm7', roman: 'ii7' },
      { degree: 'V', name: 'G7', roman: 'V7' },
      { degree: 'vi', name: 'Am7', roman: 'vi7' },
    ];
  }
  return base;
}

function generateProgression(level) {
  const buttons = getButtons(level);
  const len = level <= 1 ? 2 : 4;
  const seq = [];
  for (let i = 0; i < len; i++) {
    const btn = buttons[Math.floor(Math.random() * buttons.length)];
    seq.push(btn);
  }
  return seq; // array of { degree, name, roman }
}

function resolveChord(name) {
  if (CHORD_DEFINITIONS[name]) return CHORD_DEFINITIONS[name];
  if (EXTENDED_CHORDS[name]) return EXTENDED_CHORDS[name].notes;
  return null;
}

// ── Component ──────────────────────────────────────────────────────────────
const ExerciseF2 = () => {
  const navigate = useNavigate();
  const storageKey = 'ear-training:F2:level';
  const [level, setLevel] = useState(() => loadStoredLevel(storageKey, 1));
  const [numQuestions, setNumQuestions] = useState(8);
  const [displayMode, setDisplayMode] = useState('degrees');

  const [questionIndex, setQuestionIndex] = useState(0);
  const [progression, setProgression] = useState(null);
  const [positionIndex, setPositionIndex] = useState(0); // which slot we're filling
  const [slots, setSlots] = useState([]); // filled answers per slot
  const [feedback, setFeedback] = useState(null);
  const [firstTry, setFirstTry] = useState(0);
  const [posAttempts, setPosAttempts] = useState({});
  const [done, setDone] = useState(false);
  const isPlayingRef = useRef(false);

  const buttons = getButtons(level);

  const startQuestion = useCallback(async () => {
    const prog = generateProgression(level);
    setProgression(prog);
    setPositionIndex(0);
    setSlots(Array(prog.length).fill(null));
    setPosAttempts({});
    setFeedback(null);
    await playProg(prog);
  }, [level]);

  useEffect(() => {
    setQuestionIndex(0); setFirstTry(0); setDone(false);
    setTimeout(startQuestion, 100);
  }, [level, numQuestions]);

  const playProg = async (prog) => {
    if (!harmonicAudioPlayer.initialized) await harmonicAudioPlayer.init();
    for (const item of prog) {
      const notes = resolveChord(item.name);
      if (notes) harmonicAudioPlayer.playChord(notes, 1.2, 'strummed');
      await new Promise(r => setTimeout(r, 1400));
    }
  };

  const handleSelect = (btn) => {
    if (!progression || positionIndex >= progression.length) return;
    const correct = progression[positionIndex];
    const isOk = btn.degree === correct.degree || btn.name === correct.name;
    const isFirst = !posAttempts[positionIndex];

    setPosAttempts(prev => ({ ...prev, [positionIndex]: (prev[positionIndex] || 0) + 1 }));
    setSlots(prev => { const n = [...prev]; n[positionIndex] = { ...btn, ok: isOk }; return n; });
    setFeedback(isOk ? 'correct' : 'wrong');
    setTimeout(() => setFeedback(null), 600);

    if (isOk) {
      if (isFirst) setFirstTry(p => p + 1);
      const nextPos = positionIndex + 1;
      if (nextPos >= progression.length) {
        setTimeout(() => {
          if (questionIndex + 1 >= numQuestions) { setDone(true); }
          else { setQuestionIndex(p => p + 1); setTimeout(startQuestion, 100); }
        }, 800);
      } else {
        setTimeout(() => setPositionIndex(nextPos), 400);
      }
    }
  };

  if (done) {
    return (
      <>
        <EarTrainingHeader exerciseTitle="F2 — הכתבה הרמונית" levels={LEVELS} currentLevel={level}
          onLevelChange={setLevel} storageKey={storageKey}
          onBack={() => navigate('/category/ear-training/functional')} />
        <SessionSummary total={numQuestions} firstTry={firstTry}
          onRetry={() => { setQuestionIndex(0); setFirstTry(0); setDone(false); setTimeout(startQuestion, 100); }}
          onBack={() => navigate('/category/ear-training/functional')}
          levelLabel={LEVELS.find(l => l.number === level)?.label} />
      </>
    );
  }

  return (
    <div style={{ direction: 'rtl' }}>
      <EarTrainingHeader exerciseTitle="F2 — הכתבה הרמונית" levels={LEVELS} currentLevel={level}
        onLevelChange={setLevel} storageKey={storageKey}
        onBack={() => navigate('/category/ear-training/functional')}
        progressCurrent={questionIndex} progressTotal={numQuestions} />

      <div style={ctrlRow}>
        <QuestionsCounter value={numQuestions} onChange={setNumQuestions} min={3} max={20} />
        <DegreeNameToggle mode={displayMode} onToggle={setDisplayMode} />
        <button style={playBtn} onClick={() => progression && playProg(progression)}>▶ נגן שוב</button>
      </div>

      {/* Progression slots */}
      {progression && (
        <div style={slotRow}>
          {progression.map((item, i) => {
            const ans = slots[i];
            const isCurrent = i === positionIndex && !ans?.ok;
            return (
              <div key={i} style={{
                ...slot,
                ...(ans?.ok ? slotCorrect : {}),
                ...(isCurrent ? slotActive : {}),
              }}>
                {ans?.ok
                  ? (displayMode === 'degrees' ? ans.roman : ans.name)
                  : (i < positionIndex ? '?' : isCurrent ? '▶' : '?')}
              </div>
            );
          })}
        </div>
      )}

      {/* Chord buttons */}
      <div style={btnGrid}>
        {buttons.map(btn => (
          <button key={btn.degree + btn.name} onClick={() => handleSelect(btn)}
            style={chordBtn}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              {displayMode === 'degrees' ? btn.roman : btn.name}
            </div>
            {displayMode === 'degrees' && (
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{btn.name}</div>
            )}
          </button>
        ))}
      </div>

      <FeedbackOverlay state={feedback} />
    </div>
  );
};

const ctrlRow = { display:'flex', flexWrap:'wrap', gap:16, alignItems:'center', padding:'16px 24px', borderBottom:'1px solid #eee', justifyContent:'center' };
const playBtn = { padding:'10px 20px', borderRadius:10, border:'2px solid var(--color-primary,#4a90e2)', background:'var(--color-primary,#4a90e2)', color:'#fff', fontSize:15, fontWeight:600, cursor:'pointer' };
const slotRow = { display:'flex', gap:12, justifyContent:'center', padding:'24px 16px 8px', flexWrap:'wrap' };
const slot = { width:80, height:64, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:10, border:'2px solid #ddd', fontSize:18, fontWeight:700, color:'#999', background:'#f8f8f8' };
const slotCorrect = { background:'#e8f9f0', borderColor:'#2dbb5b', color:'#2dbb5b' };
const slotActive = { background:'#eaf3ff', borderColor:'var(--color-primary,#4a90e2)', color:'var(--color-primary,#4a90e2)' };
const btnGrid = { display:'flex', flexWrap:'wrap', gap:10, justifyContent:'center', padding:'20px 16px 32px', maxWidth:700, margin:'0 auto' };
const chordBtn = { minWidth:80, padding:'12px 10px', borderRadius:10, border:'2px solid #ddd', background:'#fff', cursor:'pointer', textAlign:'center' };

export default ExerciseF2;
