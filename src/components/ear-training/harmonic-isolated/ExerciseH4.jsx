import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import EarTrainingHeader from '../shared/EarTrainingHeader';
import FeedbackOverlay from '../shared/FeedbackOverlay';
import SessionSummary from '../shared/SessionSummary';
import QuestionsCounter from '../shared/QuestionsCounter';
import BinaryToggle from '../shared/BinaryToggle';
import ChipSelector from '../shared/ChipSelector';
import { loadStoredLevel } from '../shared/LevelNavigator';
import harmonicAudioPlayer from '../../../utils/HarmonicAudioPlayer';
import '../shared/earTrainingShared.css';

// ── Level definitions — per spec.md lines 381-391 ──────────────────────────
const LEVELS = [
  { number: 1, label: 'שלב 1 — 9 טבעי / ללא 9' },
  { number: 2, label: 'שלב 2 — ♭9 vs 9' },
  { number: 3, label: 'שלב 3 — כל ה-9 (9, ♭9, ♯9)' },
  { number: 4, label: 'שלב 4 — ♯11 לידי (על Maj7)' },
  { number: 5, label: 'שלב 5 — ♭13 / 13 (על dom7)' },
  { number: 6, label: 'שלב 6 — חבילות שלמות' },
  { number: 7, label: 'שלב 7 — Upper Structure Triads' },
];

const ALL_TENSIONS = ['9','b9','#9','#11','b13','13'];
const TENSION_LABELS = { '9':'9','b9':'♭9','#9':'♯9','#11':'♯11','b13':'♭13','13':'13' };

// Pools: each entry is {tensions, baseType} — baseType overrides user selection for that question
const LEVEL_POOL = {
  1: [{ tensions:['9'], baseType:'dom7' }, { tensions:[], baseType:'dom7' }],
  2: [{ tensions:['9'], baseType:'dom7' }, { tensions:['b9'], baseType:'dom7' }],
  3: [{ tensions:['9'], baseType:'dom7' }, { tensions:['b9'], baseType:'dom7' }, { tensions:['#9'], baseType:'dom7' }],
  4: [{ tensions:['#11'], baseType:'Maj7' }],
  5: [{ tensions:['b13'], baseType:'dom7' }, { tensions:['13'], baseType:'dom7' }],
  6: [
    { tensions:['b9','#11'], baseType:'dom7' },
    { tensions:['9','13'],   baseType:'dom7' },
    { tensions:['#9','b13'], baseType:'dom7' },
    { tensions:['b9','13'],  baseType:'dom7' },
    { tensions:['#11'],      baseType:'Maj7' },
    { tensions:['9','#11'],  baseType:'Maj7' },
  ],
  7: [
    { tensions:['b9','#9'],       baseType:'dom7' },
    { tensions:['b9','#11','b13'],baseType:'dom7' },
    { tensions:['9','#11','13'],  baseType:'dom7' },
  ],
};

const ROOTS_DOM7  = ['C','D','E','F','G','A','Bb'];
const ROOTS_MAJ7  = ['C','D','F','G','Bb'];
const ROOTS_M7    = ['C','D','E','F','G','A'];

const CHIPS_LEVEL6 = ALL_TENSIONS.map(t => ({ id: t, label: TENSION_LABELS[t] }));

function getRoots(baseType) {
  if (baseType === 'Maj7') return ROOTS_MAJ7;
  if (baseType === 'm7')   return ROOTS_M7;
  return ROOTS_DOM7;
}

function chordName(root, baseType) {
  if (baseType === 'Maj7') return root + 'Maj7';
  if (baseType === 'm7')   return root + 'm7';
  return root + '7';
}

const ExerciseH4 = () => {
  const navigate = useNavigate();
  const storageKey = 'ear-training:H4:level';

  const [level, setLevel]           = useState(() => loadStoredLevel(storageKey, 1));
  const [numQuestions, setNumQuestions] = useState(10);
  const [instrument, setInstrument] = useState(
    () => localStorage.getItem('ear-training:H4:instrument') || 'piano'
  );
  const [userBaseType, setUserBaseType] = useState('dom7');
  const [activeChips, setActiveChips]   = useState(ALL_TENSIONS);

  const [questionIndex,   setQuestionIndex]   = useState(0);
  const [correctTensions, setCorrectTensions] = useState([]);
  const [currentChord,    setCurrentChord]    = useState('C7');
  const [currentBaseType, setCurrentBaseType] = useState('dom7');
  const [checked,   setChecked]   = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [feedback,  setFeedback]  = useState(null);
  const [firstTry,  setFirstTry]  = useState(0);
  const [done,      setDone]      = useState(false);

  const stateRef = useRef({});
  const lastQuestionRef = useRef(null);
  stateRef.current = { level, activeChips, userBaseType, instrument };

  // Visible tensions per level (for the checkboxes)
  const visibleTensions = (() => {
    if (level === 1) return ['9'];
    if (level === 2) return ['9','b9'];
    if (level === 3) return ['9','b9','#9'];
    if (level === 4) return ['#11'];
    if (level === 5) return ['b13','13'];
    if (level === 6) return activeChips;
    return ALL_TENSIONS;
  })();

  const generateAndPlay = useCallback(async () => {
    const { level: lv, activeChips: chips } = stateRef.current;
    const pool = LEVEL_POOL[lv] || LEVEL_POOL[1];

    // For level 6, filter pool to only use tensions that are in activeChips
    let filteredPool = pool;
    if (lv === 6) {
      filteredPool = pool.filter(entry =>
        entry.tensions.every(t => chips.includes(t))
      );
      if (filteredPool.length === 0) filteredPool = pool;
    }

    const pickOne = () => {
      const entry = filteredPool[Math.floor(Math.random() * filteredPool.length)];
      const bType = entry.baseType;
      const roots = getRoots(bType);
      const root  = roots[Math.floor(Math.random() * roots.length)];
      return { entry, bType, root, chord: chordName(root, bType) };
    };

    let pick = pickOne();
    let attempts = 0;
    const keyOf = (p) => `${p.chord}_${[...p.entry.tensions].sort().join(',')}`;
    while (
      attempts < 5 &&
      lastQuestionRef.current &&
      keyOf(pick) === keyOf(lastQuestionRef.current)
    ) {
      pick = pickOne();
      attempts++;
    }
    lastQuestionRef.current = pick;

    setCorrectTensions(pick.entry.tensions);
    setCurrentChord(pick.chord);
    setCurrentBaseType(pick.bType);
    setChecked({});
    setSubmitted(false);
    setFeedback(null);

    if (!harmonicAudioPlayer.initialized) await harmonicAudioPlayer.init();
    // Play with tensions (empty tensions = base chord only)
    await harmonicAudioPlayer.playWithTensions(pick.chord, pick.entry.tensions, { duration: 2.0, voicing: 'strummed' });
  }, [level]);

  useEffect(() => {
    setQuestionIndex(0); setFirstTry(0); setDone(false);
    lastQuestionRef.current = null;
    const tid = setTimeout(generateAndPlay, 100);
    return () => clearTimeout(tid);
  }, [level, numQuestions]);

  const playBase = async () => {
    if (!harmonicAudioPlayer.initialized) await harmonicAudioPlayer.init();
    await harmonicAudioPlayer.playWithTensions(currentChord, [], { duration: 1.5, voicing: 'strummed' });
  };

  const playWithTensions = async () => {
    if (!harmonicAudioPlayer.initialized) await harmonicAudioPlayer.init();
    await harmonicAudioPlayer.playWithTensions(currentChord, correctTensions, { duration: 2.0, voicing: 'strummed' });
  };

  const playCompare = async () => {
    if (!harmonicAudioPlayer.initialized) await harmonicAudioPlayer.init();
    await harmonicAudioPlayer.playWithTensions(currentChord, [], { duration: 1.2, voicing: 'strummed' });
    await new Promise(r => setTimeout(r, 400));
    await harmonicAudioPlayer.playWithTensions(currentChord, correctTensions, { duration: 2.0, voicing: 'strummed' });
  };

  const handleCheck = (t) => {
    if (submitted) return;
    setChecked(prev => ({ ...prev, [t]: !prev[t] }));
  };

  const handleSubmit = () => {
    const picked = ALL_TENSIONS.filter(t => checked[t]);
    const correct = [...correctTensions].sort().join(',') === [...picked].sort().join(',');
    setSubmitted(true);
    setFeedback(correct ? 'correct' : 'wrong');
    if (correct) setFirstTry(p => p + 1);
    setTimeout(() => {
      setFeedback(null);
      if (questionIndex + 1 >= numQuestions) { setDone(true); }
      else { setQuestionIndex(p => p + 1); setTimeout(generateAndPlay, 100); }
    }, 1000);
  };

  const handleInstrumentChange = (val) => {
    setInstrument(val);
    localStorage.setItem('ear-training:H4:instrument', val);
  };

  const handleChipToggle = (id) => {
    setActiveChips(prev => {
      if (prev.includes(id)) {
        if (prev.length <= 2) return prev;
        return prev.filter(c => c !== id);
      }
      return [...prev, id];
    });
  };

  if (done) {
    return (
      <>
        <EarTrainingHeader exerciseTitle="H4 — זיהוי טנשנים (ג'אז)" levels={LEVELS} currentLevel={level}
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

      {/* Play buttons */}
      <div style={{ display:'flex', gap:12, justifyContent:'center', padding:'16px', flexWrap:'wrap' }}>
        <button style={playBtn} onClick={playBase}>🔊 בסיס</button>
        <button style={playBtn} onClick={playWithTensions}>🔊 עם טנשנים</button>
        <button style={playBtn} onClick={playCompare}>🔊 השווה</button>
      </div>

      <div style={{ textAlign:'center', color:'#888', margin:'8px 0', fontSize:14 }}>
        אקורד: <strong style={{ color:'#222', fontSize:16 }}>{currentChord}</strong> — אילו טנשנים שומעים?
      </div>

      <div style={tensionGrid}>
        {visibleTensions.map(t => {
          const isChecked = !!checked[t];
          const correct = submitted && correctTensions.includes(t);
          const wrong   = submitted && isChecked && !correctTensions.includes(t);
          const missed  = submitted && !isChecked && correctTensions.includes(t);
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

      <div style={settingsDivider} />

      <div style={ctrlRow}>
        <QuestionsCounter value={numQuestions} onChange={setNumQuestions} min={3} max={20} />
        <BinaryToggle label="בסיס"
          options={[{value:'dom7',label:'dom7'},{value:'Maj7',label:'Maj7'},{value:'m7',label:'m7'}]}
          value={userBaseType} onChange={setUserBaseType} />
        <BinaryToggle label="כלי"
          options={[{value:'piano',label:'פסנתר'},{value:'guitar',label:'גיטרה'}]}
          value={instrument} onChange={handleInstrumentChange} />
      </div>

      {level === 6 && (
        <div style={{ display:'flex', justifyContent:'center', padding:'8px 16px 24px' }}>
          <ChipSelector items={CHIPS_LEVEL6} activeIds={activeChips} onToggle={handleChipToggle} minActive={2} />
        </div>
      )}

      <FeedbackOverlay state={feedback} />
    </div>
  );
};

const settingsDivider = { borderTop:'1px solid #eee', margin:'8px 24px 0', opacity:0.6 };
const ctrlRow    = { display:'flex', gap:16, alignItems:'center', padding:'16px 24px', justifyContent:'center', flexWrap:'wrap' };
const playBtn    = { padding:'10px 20px', borderRadius:10, border:'2px solid var(--color-primary,#4a90e2)', background:'var(--color-primary,#4a90e2)', color:'#fff', fontSize:15, fontWeight:600, cursor:'pointer' };
const tensionGrid= { display:'flex', flexWrap:'wrap', gap:16, justifyContent:'center', padding:'24px 16px', maxWidth:500, margin:'0 auto' };
const tensionBtn = { width:90, height:90, borderRadius:12, border:'2px solid #ddd', background:'#fff', fontSize:22, fontWeight:700, cursor:'pointer', transition:'all 0.15s' };
const submitBtn  = { padding:'14px 40px', borderRadius:12, border:'none', background:'var(--color-primary,#4a90e2)', color:'#fff', fontSize:16, fontWeight:700, cursor:'pointer' };

export default ExerciseH4;
