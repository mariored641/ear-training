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
import '../shared/earTrainingShared.css';

// ── Levels — per spec.md lines 649-659 ────────────────────────────────────
const LEVELS = [
  { number: 1, label: 'שלב 1 — כיוון' },
  { number: 2, label: 'שלב 2 — צעד / קפיצה' },
  { number: 3, label: 'שלב 3 — דרגות 1, 4, 5' },
  { number: 4, label: 'שלב 4 — כל הדיאטוני' },
  { number: 5, label: 'שלב 5 — כרומטי' },
  { number: 6, label: 'שלב 6 — היפוך דרך בס' },
  { number: 7, label: 'שלב 7 — שעתוק' },
];

// C major bass register
const DEG_NOTE = { 1:'C2', 2:'D2', 3:'E2', 4:'F2', 5:'G2', 6:'A2', 7:'B2', 8:'C3' };
const DEG_LABEL = { 1:'I', 2:'ii', 3:'iii', 4:'IV', 5:'V', 6:'vi', 7:'vii°' };

const CHROMATIC_OPTIONS = [
  { id:'b2', note:'Db2', label:'♭II' },
  { id:'b3', note:'Eb2', label:'♭III' },
  { id:'b5', note:'Gb2', label:'♭V' },
  { id:'b6', note:'Ab2', label:'♭VI' },
  { id:'b7', note:'Bb2', label:'♭VII' },
];

// Chord inversions (bass, upper voices) for level 6
const INV_CHORDS = {
  I:  { root:['C2','E3','G3'], inv1:['E2','G3','C4'], inv2:['G2','C3','E3'] },
  IV: { root:['F2','A3','C4'], inv1:['A2','C3','F3'], inv2:['C2','F3','A3'] },
  V:  { root:['G2','B3','D4'], inv1:['B2','D3','G3'], inv2:['D2','G3','B3'] },
};
const INV_IDS = ['root', 'inv1', 'inv2'];
const INV_LABELS = { root:'תנוחה ראשית', inv1:'היפוך ראשון', inv2:'היפוך שני' };

function buildQ(level) {
  if (level === 1) {
    const allDegs = [1,2,3,4,5,6,7,8];
    const a = allDegs[Math.floor(Math.random() * allDegs.length)];
    const roll = Math.random();
    let b;
    if (roll < 0.2) {
      b = a;
    } else if (roll < 0.6) {
      b = Math.min(8, a + 1 + Math.floor(Math.random() * 3));
    } else {
      b = Math.max(1, a - 1 - Math.floor(Math.random() * 3));
    }
    const dir = b > a ? 'up' : b < a ? 'down' : 'same';
    return {
      id: Date.now(), type:'sequence', level,
      notes: [DEG_NOTE[a], DEG_NOTE[b]], bassNote: null,
      correctId: dir,
      options: [{ id:'up', label:'עולה ↑' }, { id:'down', label:'יורד ↓' }, { id:'same', label:'חוזר ↔' }],
    };
  }

  if (level === 2) {
    const isStep = Math.random() > 0.5;
    let a, b;
    if (isStep) {
      a = 1 + Math.floor(Math.random() * 7);
      b = Math.max(1, Math.min(8, a + (Math.random() > 0.5 ? 1 : -1)));
    } else {
      a = 1 + Math.floor(Math.random() * 6);
      const skip = 2 + Math.floor(Math.random() * 3);
      b = Math.random() > 0.5 ? Math.min(8, a + skip) : Math.max(1, a - skip);
    }
    const interval = Math.abs(b - a);
    return {
      id: Date.now(), type:'sequence', level,
      notes: [DEG_NOTE[a], DEG_NOTE[b]], bassNote: null,
      correctId: interval <= 1 ? 'step' : 'leap',
      options: [{ id:'step', label:'צעד' }, { id:'leap', label:'קפיצה' }],
    };
  }

  if (level === 3) {
    const pool = [1, 4, 5];
    const deg = pool[Math.floor(Math.random() * pool.length)];
    return {
      id: Date.now(), type:'single', level,
      notes: null, bassNote: DEG_NOTE[deg],
      correctId: String(deg),
      options: pool.map(d => ({ id: String(d), label: DEG_LABEL[d] })),
    };
  }

  if (level === 4) {
    const deg = 1 + Math.floor(Math.random() * 7);
    return {
      id: Date.now(), type:'single', level,
      notes: null, bassNote: DEG_NOTE[deg],
      correctId: String(deg),
      options: [1,2,3,4,5,6,7].map(d => ({ id: String(d), label: DEG_LABEL[d] })),
    };
  }

  if (level === 5) {
    const diatonic = [1,2,3,4,5,6,7].map(d => ({ id: String(d), note: DEG_NOTE[d], label: DEG_LABEL[d] }));
    const all = [...diatonic, ...CHROMATIC_OPTIONS.map(c => ({ id: c.id, note: c.note, label: c.label }))];
    const picked = all[Math.floor(Math.random() * all.length)];
    return {
      id: Date.now(), type:'single', level,
      notes: null, bassNote: picked.note,
      correctId: picked.id,
      options: all.map(o => ({ id: o.id, label: o.label })),
    };
  }

  if (level === 6) {
    const chords = Object.keys(INV_CHORDS);
    const chord = chords[Math.floor(Math.random() * chords.length)];
    const invType = INV_IDS[Math.floor(Math.random() * INV_IDS.length)];
    const notes = INV_CHORDS[chord][invType];
    return {
      id: Date.now(), type:'chord', level,
      notes, bassNote: notes[0], chord,
      correctId: invType,
      options: INV_IDS.map(id => ({ id, label: INV_LABELS[id] })),
    };
  }

  return null;
}

async function playNormal(q) {
  if (!harmonicAudioPlayer.initialized) await harmonicAudioPlayer.init();
  if (q.type === 'sequence') {
    for (const n of q.notes) {
      harmonicAudioPlayer.playNote(n, 1.5);
      await new Promise(r => setTimeout(r, 1700));
    }
  } else if (q.type === 'single') {
    harmonicAudioPlayer.playNote(q.bassNote, 2.0);
    await new Promise(r => setTimeout(r, 2100));
  } else if (q.type === 'chord') {
    harmonicAudioPlayer.playChord(q.notes, 2.0, 'arpeggiated');
    await new Promise(r => setTimeout(r, 2200));
  }
}

async function playEmphasis(q) {
  if (!harmonicAudioPlayer.initialized) await harmonicAudioPlayer.init();
  if (q.type === 'sequence') {
    for (const n of q.notes) {
      harmonicAudioPlayer.playNote(n, 2.0);
      await new Promise(r => setTimeout(r, 2200));
    }
  } else if (q.type === 'single') {
    harmonicAudioPlayer.playNote(q.bassNote, 3.0);
    await new Promise(r => setTimeout(r, 3100));
  } else if (q.type === 'chord') {
    // Bass note only
    harmonicAudioPlayer.playNote(q.bassNote, 3.0);
    await new Promise(r => setTimeout(r, 3100));
  }
}

const ExerciseV1 = () => {
  const navigate = useNavigate();
  const storageKey = 'ear-training:V1:level';

  const [level, setLevel]              = useState(() => loadStoredLevel(storageKey, 1));
  const [instrument, setInstrument]    = useStoredState('ear-training:V1:instrument', 'piano');
  const [numQuestions, setNumQuestions] = useState(10);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [question, setQuestion]        = useState(null);
  const [answered, setAnswered]        = useState(null);
  const [feedback, setFeedback]        = useState(null);
  const [firstTry, setFirstTry]        = useState(0);
  const [attempted, setAttempted]      = useState(false);
  const [done, setDone]                = useState(false);

  const stateRef = useRef({});
  stateRef.current = { level, instrument };

  const handleInstrumentChange = async (val) => {
    setInstrument(val);
    if (harmonicAudioPlayer.initialized) {
      await harmonicAudioPlayer.setInstrument(val);
    }
  };

  const generate = useCallback(async () => {
    const { level: lv } = stateRef.current;
    if (lv === 7) return;
    const q = buildQ(lv);
    setQuestion(q);
    setAnswered(null);
    setFeedback(null);
    setAttempted(false);
    await playNormal(q);
  }, []);

  useEffect(() => {
    setQuestionIndex(0); setFirstTry(0); setDone(false);
    const tid = setTimeout(generate, 100);
    return () => clearTimeout(tid);
  }, [level, numQuestions]);

  const handleAnswer = (optId) => {
    if (!question || answered) return;
    const ok = optId === question.correctId;
    setAnswered(optId);
    setFeedback(ok ? 'correct' : 'wrong');
    if (ok && !attempted) setFirstTry(p => p + 1);
    setAttempted(true);
    setTimeout(() => setFeedback(null), 600);
    if (ok) {
      setTimeout(() => {
        if (questionIndex + 1 >= numQuestions) setDone(true);
        else { setQuestionIndex(p => p + 1); setTimeout(generate, 100); }
      }, 800);
    }
  };

  if (done) {
    return (
      <>
        <EarTrainingHeader exerciseTitle="V1 — עקיבת קו בס" levels={LEVELS}
          currentLevel={level} onLevelChange={setLevel} storageKey={storageKey}
          onBack={() => navigate('/category/ear-training/voice-leading')} />
        <SessionSummary total={numQuestions} firstTry={firstTry}
          onRetry={() => { setQuestionIndex(0); setFirstTry(0); setDone(false); setTimeout(generate, 100); }}
          onBack={() => navigate('/category/ear-training/voice-leading')}
          levelLabel={LEVELS.find(l => l.number === level)?.label} />
      </>
    );
  }

  return (
    <div style={{ direction: 'rtl' }}>
      <EarTrainingHeader exerciseTitle="V1 — עקיבת קו בס" levels={LEVELS}
        currentLevel={level} onLevelChange={setLevel} storageKey={storageKey}
        onBack={() => navigate('/category/ear-training/voice-leading')}
        progressCurrent={questionIndex} progressTotal={numQuestions} />

      {level === 7 ? (
        <div style={{ textAlign:'center', padding:'48px 20px', color:'#888' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🎸</div>
          <div style={{ fontSize:17, marginBottom:8 }}>שלב זה כולל שעתוק קו בס מהקלטות.</div>
          <div style={{ fontSize:14 }}>בקרוב — בינתיים בחר שלב אחר.</div>
        </div>
      ) : (
        <>
          <div style={{ display:'flex', gap:12, justifyContent:'center', padding:'16px', flexWrap:'wrap' }}>
            <button style={playBtn} onClick={() => question && playNormal(question)}>🔊 נגן רצף</button>
            <button style={playBtn} onClick={() => question && playEmphasis(question)}>🎸 הבלט בס</button>
          </div>

          <div style={optGrid}>
            {question?.options.map(opt => {
              const ok = answered === opt.id && feedback === 'correct';
              const bad = answered === opt.id && feedback === 'wrong';
              return (
                <button key={opt.id}
                  onClick={() => handleAnswer(opt.id)}
                  disabled={!!answered}
                  style={{ ...optBtn, ...(ok ? optCorrect : {}), ...(bad ? optWrong : {}) }}>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </>
      )}

      <div style={settingsDivider} />

      <div style={ctrlRow}>
        <QuestionsCounter value={numQuestions} onChange={setNumQuestions} min={3} max={20} />
        <BinaryToggle label="כלי"
          options={[{ value:'piano', label:'פסנתר' }, { value:'guitar', label:'גיטרה' }]}
          value={instrument} onChange={handleInstrumentChange} />
      </div>

      <FeedbackOverlay state={feedback} />
    </div>
  );
};

const settingsDivider = { borderTop:'1px solid #eee', margin:'8px 24px 0', opacity:0.6 };
const ctrlRow = { display:'flex', gap:16, alignItems:'center', padding:'16px 24px', justifyContent:'center', flexWrap:'wrap' };
const playBtn = { padding:'10px 20px', borderRadius:10, border:'2px solid var(--color-primary,#4a90e2)', background:'var(--color-primary,#4a90e2)', color:'#fff', fontSize:15, fontWeight:600, cursor:'pointer' };
const optGrid = { display:'flex', flexWrap:'wrap', gap:12, justifyContent:'center', padding:'24px 16px', maxWidth:600, margin:'0 auto' };
const optBtn = { minWidth:110, padding:'14px 18px', borderRadius:10, border:'2px solid #ddd', background:'#fff', fontSize:16, fontWeight:600, cursor:'pointer', transition:'all 0.15s' };
const optCorrect = { background:'#2dbb5b', borderColor:'#2dbb5b', color:'#fff' };
const optWrong = { background:'#e74c3c', borderColor:'#e74c3c', color:'#fff' };

export default ExerciseV1;
