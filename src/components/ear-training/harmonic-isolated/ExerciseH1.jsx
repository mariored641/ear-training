import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import EarTrainingHeader from '../shared/EarTrainingHeader';
import FeedbackOverlay from '../shared/FeedbackOverlay';
import SessionSummary from '../shared/SessionSummary';
import QuestionsCounter from '../shared/QuestionsCounter';
import BinaryToggle from '../shared/BinaryToggle';
import { loadStoredLevel } from '../shared/LevelNavigator';
import { useStoredState } from '../shared/useStoredState';
import harmonicAudioPlayer from '../../../utils/HarmonicAudioPlayer';
import { EXTENDED_CHORDS } from '../../../constants/harmonicDefaults';
import { getChordLabel, TERMINOLOGY_TOGGLE_OPTIONS } from '../../../constants/chordTerminology';
import '../shared/earTrainingShared.css';

// ── Levels — per spec.md lines 260-276 ────────────────────────────────────
const LEVELS = [
  { number: 1, label: 'שלב 1 — מז\'ור / מינור (12 שורשים)' },
  { number: 2, label: 'שלב 2 — + dim (מוקטן)' },
  { number: 3, label: 'שלב 3 — + aug (מוגדל)' },
  { number: 4, label: 'שלב 4 — ניואנסי קול (סטרום / ארפג\'יו)' },
  { number: 5, label: 'שלב 5 — רצף 2-3 אקורדים' },
  { number: 6, label: 'שלב 6 — רצף 4 אקורדים' },
];

const LEVEL_KINDS = {
  1: ['major','minor'],
  2: ['major','minor','diminished'],
  3: ['major','minor','diminished','augmented'],
  4: ['major','minor','diminished','augmented'],
  5: ['major','minor','diminished','augmented'],
  6: ['major','minor','diminished','augmented'],
};
const KIND_SHORT = { major:'M', minor:'m', diminished:'dim', augmented:'aug' };
const ROOTS = ['C','D','E','F','G','A','A#'];
const SUFFIX = { major:'', minor:'m', diminished:'dim', augmented:'aug' };

function randomKind(kinds) { return kinds[Math.floor(Math.random() * kinds.length)]; }
function randomRoot() { return ROOTS[Math.floor(Math.random() * ROOTS.length)]; }
function randomVoicing(level) {
  if (level === 4) return Math.random() > 0.5 ? 'arpeggiated' : 'strummed';
  return 'strummed';
}

function buildQ(level, termMode = 'hebrew') {
  const kinds = LEVEL_KINDS[level] || LEVEL_KINDS[1];
  const seqLen = level === 5 ? 2 + Math.floor(Math.random() * 2) : level === 6 ? 4 : 1;
  const voicing = randomVoicing(level);

  const sequence = Array.from({ length: seqLen }, () => {
    const kind = randomKind(kinds);
    const root = randomRoot();
    const chordName = root + SUFFIX[kind];
    const def = EXTENDED_CHORDS[chordName];
    return { kind, root, chordName, def };
  });

  const correctId = sequence[0].kind; // For levels 1-4: identify the (only) chord
  const correctSeq = sequence.map(s => s.kind); // For levels 5-6: identify all

  return {
    id: Date.now(),
    level,
    seqLen,
    voicing,
    sequence,
    correctId,
    correctSeq,
    options: kinds.map(k => ({ id: k, label: getChordLabel(k, termMode) })),
  };
}

async function playQ(q, voicingOverride = null) {
  if (!harmonicAudioPlayer.initialized) await harmonicAudioPlayer.init();
  const voicing = voicingOverride || q.voicing;
  for (const item of q.sequence) {
    if (item.def?.notes) harmonicAudioPlayer.playChord(item.def.notes, 1.2, voicing);
    await new Promise(r => setTimeout(r, 1400));
  }
}

const ExerciseH1 = () => {
  const navigate = useNavigate();
  const storageKey = 'ear-training:H1:level';

  const [level, setLevel]              = useState(() => loadStoredLevel(storageKey, 1));
  const [instrument, setInstrument]    = useStoredState('ear-training:H1:instrument', 'piano');
  const [voicing, setVoicing]          = useState('strummed');
  const [termMode, setTermMode]        = useStoredState('ear-training:H1:termMode', 'hebrew');
  const [numQuestions, setNumQuestions] = useState(10);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [question, setQuestion]        = useState(null);
  const [feedback, setFeedback]        = useState(null);
  const [firstTry, setFirstTry]        = useState(0);
  const [done, setDone]                = useState(false);
  const [selectedKind, setSelectedKind] = useState(null);

  // For levels 5-6: slot-filling state
  const [currentSlot, setCurrentSlot]  = useState(0);
  const [slotAnswers, setSlotAnswers]  = useState([]);
  const [attempted, setAttempted]      = useState(false);

  const stateRef = useRef({});
  const lastQuestionRef = useRef(null);
  stateRef.current = { level, voicing, instrument, termMode };

  const handleInstrumentChange = async (val) => {
    setInstrument(val);
    if (harmonicAudioPlayer.initialized) await harmonicAudioPlayer.setInstrument(val);
  };

  const keyOf = (q) => q ? `${q.correctSeq.join(',')}` : null;

  const generate = useCallback(async () => {
    const { level: lv, voicing: vc, termMode: tm } = stateRef.current;
    let q = buildQ(lv, tm);
    let attempts = 0;
    while (
      attempts < 5 &&
      lastQuestionRef.current &&
      keyOf(q) === keyOf(lastQuestionRef.current)
    ) {
      q = buildQ(lv, tm);
      attempts++;
    }
    lastQuestionRef.current = q;
    setQuestion(q);
    setCurrentSlot(0);
    setSlotAnswers([]);
    setFeedback(null);
    setAttempted(false);
    setSelectedKind(null);
    const effectiveVoicing = lv <= 3 ? 'strummed' : vc;
    await playQ(q, effectiveVoicing);
  }, []);

  useEffect(() => {
    setQuestionIndex(0); setFirstTry(0); setDone(false);
    lastQuestionRef.current = null;
    const tid = setTimeout(generate, 100);
    return () => clearTimeout(tid);
  }, [level, numQuestions, voicing, termMode]);

  const advance = () => {
    if (questionIndex + 1 >= numQuestions) setDone(true);
    else { setQuestionIndex(p => p + 1); setTimeout(generate, 100); }
  };

  // For levels 1-4: simple single-answer
  const handleSimpleAnswer = (kindId) => {
    if (!question || attempted) return;
    const ok = kindId === question.correctId;
    setSelectedKind(kindId);
    setAttempted(true);
    setFeedback(ok ? 'correct' : 'wrong');
    if (ok) setFirstTry(p => p + 1);
    setTimeout(() => setFeedback(null), 600);
    if (ok) setTimeout(advance, 800);
  };

  // For levels 5-6: slot-by-slot answer
  const handleSlotAnswer = (kindId) => {
    if (!question || currentSlot >= question.seqLen) return;
    const ok = kindId === question.correctSeq[currentSlot];
    const newAnswers = [...slotAnswers, { kind: kindId, ok }];
    setSlotAnswers(newAnswers);
    setFeedback(ok ? 'correct' : 'wrong');

    if (ok) {
      if (currentSlot === 0 && !attempted) {
        setFirstTry(p => p + 1);
        setAttempted(true);
      }
      const nextSlot = currentSlot + 1;
      setTimeout(() => {
        setFeedback(null);
        if (nextSlot >= question.seqLen) {
          setTimeout(advance, 400);
        } else {
          setCurrentSlot(nextSlot);
        }
      }, 500);
    } else {
      setAttempted(true);
      setTimeout(() => setFeedback(null), 500);
    }
  };

  const isSequenceLevel = question?.level >= 5;

  if (done) {
    return (
      <>
        <EarTrainingHeader exerciseTitle="H1 — זיהוי אופי אקורד" levels={LEVELS}
          currentLevel={level} onLevelChange={setLevel} storageKey={storageKey}
          onBack={() => navigate('/category/ear-training/harmonic-isolated')} />
        <SessionSummary total={numQuestions} firstTry={firstTry}
          onRetry={() => { setQuestionIndex(0); setFirstTry(0); setDone(false); setTimeout(generate, 100); }}
          onBack={() => navigate('/category/ear-training/harmonic-isolated')}
          levelLabel={LEVELS.find(l => l.number === level)?.label} />
      </>
    );
  }

  return (
    <div style={{ direction: 'rtl' }}>
      <EarTrainingHeader exerciseTitle="H1 — זיהוי אופי אקורד" levels={LEVELS}
        currentLevel={level} onLevelChange={setLevel} storageKey={storageKey}
        onBack={() => navigate('/category/ear-training/harmonic-isolated')}
        progressCurrent={questionIndex} progressTotal={numQuestions} />

      <div style={{ textAlign:'center', padding:'12px 16px 4px' }}>
        <button style={playBtn} onClick={() => question && playQ(question, level <= 3 ? 'strummed' : voicing)}>
          ▶ נגן שוב
        </button>
      </div>

      {/* Sequence slots for levels 5-6 */}
      {isSequenceLevel && question && (
        <div style={slotRow}>
          {Array.from({ length: question.seqLen }).map((_, i) => {
            const ans = slotAnswers[i];
            const isActive = i === currentSlot && !ans;
            return (
              <div key={i} style={{
                ...slotBox,
                ...(ans?.ok ? slotGreen : {}),
                ...(isActive ? slotBlue : {}),
              }}>
                {ans?.ok ? KIND_SHORT[ans.kind] : (i < currentSlot ? '?' : isActive ? '▶' : '?')}
              </div>
            );
          })}
        </div>
      )}

      {/* Answer options */}
      <div style={optGrid}>
        {question?.options.map(opt => {
          const isSel = !isSequenceLevel && selectedKind === opt.id;
          const isCorrect = isSel && feedback === 'correct';
          const isWrong = isSel && feedback === 'wrong';
          return (
            <button
              key={opt.id}
              onClick={() => isSequenceLevel ? handleSlotAnswer(opt.id) : handleSimpleAnswer(opt.id)}
              style={{
                ...optBtn,
                ...(isSel && !feedback ? optSelected : {}),
                ...(isCorrect ? optCorrect : {}),
                ...(isWrong ? optWrong : {})
              }}>
              {opt.label}
            </button>
          );
        })}
      </div>

      <div style={settingsDivider} />

      <div style={ctrlRow}>
        <QuestionsCounter value={numQuestions} onChange={setNumQuestions} min={3} max={20} />
        <BinaryToggle label="כלי"
          options={[{ value:'piano', label:'פסנתר' }, { value:'guitar', label:'גיטרה' }]}
          value={instrument} onChange={handleInstrumentChange} />
        <BinaryToggle label="תצוגה"
          options={TERMINOLOGY_TOGGLE_OPTIONS}
          value={termMode} onChange={setTermMode} />
        {level >= 4 && (
          <BinaryToggle label="נגינה"
            options={[
              { value:'strummed',    label:'סטרום' },
              { value:'arpeggiated', label:'ארפג\'יו' },
              { value:'mixed',       label:'מעורב' },
            ]}
            value={voicing} onChange={setVoicing} />
        )}
      </div>

      <FeedbackOverlay state={feedback} />
    </div>
  );
};

const settingsDivider = { borderTop:'1px solid #eee', margin:'8px 24px 0', opacity:0.6 };
const ctrlRow = { display:'flex', gap:16, alignItems:'center', padding:'16px 24px', justifyContent:'center', flexWrap:'wrap' };
const playBtn = { padding:'10px 20px', borderRadius:10, border:'2px solid var(--color-primary,#4a90e2)', background:'var(--color-primary,#4a90e2)', color:'#fff', fontSize:15, fontWeight:600, cursor:'pointer' };
const slotRow = { display:'flex', gap:12, justifyContent:'center', padding:'20px 16px 8px', flexWrap:'wrap' };
const slotBox = { width:80, height:64, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:10, border:'2px solid #ddd', fontSize:18, fontWeight:700, color:'#999', background:'#f8f8f8' };
const slotGreen = { background:'#e8f9f0', borderColor:'#2dbb5b', color:'#2dbb5b' };
const slotBlue = { background:'#eaf3ff', borderColor:'var(--color-primary,#4a90e2)', color:'var(--color-primary,#4a90e2)' };
const optGrid = { display:'flex', flexWrap:'wrap', gap:12, justifyContent:'center', padding:'24px 16px', maxWidth:600, margin:'0 auto' };
const optBtn = { minWidth:120, padding:'14px 18px', borderRadius:10, border:'2px solid #ddd', background:'#fff', fontSize:16, fontWeight:600, cursor:'pointer', transition:'all 0.15s' };
const optSelected = { background:'var(--color-primary, #4a90e2)', color:'#fff', border:'2px solid var(--color-primary, #4a90e2)' };
const optCorrect  = { background:'#2dbb5b', color:'#fff', border:'2px solid #2dbb5b' };
const optWrong    = { background:'#e74c3c', color:'#fff', border:'2px solid #e74c3c' };

export default ExerciseH1;
