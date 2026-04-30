import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import EarTrainingHeader from '../shared/EarTrainingHeader';
import FeedbackOverlay from '../shared/FeedbackOverlay';
import SessionSummary from '../shared/SessionSummary';
import QuestionsCounter from '../shared/QuestionsCounter';
import MeterToggle from '../shared/MeterToggle';
import RhythmGrid from '../shared/RhythmGrid';
import { loadStoredLevel } from '../shared/LevelNavigator';
import harmonicAudioPlayer from '../../../utils/HarmonicAudioPlayer';
import { chordAtDegree } from '../../../constants/cadenceDefinitions';
import { CHORD_DEFINITIONS, EXTENDED_CHORDS } from '../../../constants/harmonicDefaults';
import '../shared/earTrainingShared.css';

const LEVELS = [
  { number: 1, label: 'שלב 1 — כן / לא' },
  { number: 2, label: 'שלב 2 — ספירה' },
  { number: 3, label: 'שלב 3 — מיקום' },
  { number: 4, label: 'שלב 4 — מיפוי מלא' },
  { number: 5, label: 'שלב 5 — האצה' },
  { number: 6, label: 'שלב 6 — שיר אמיתי' },
];

// One grid cell = one beat (or dotted quarter for 6/8)
const METER_CFG = {
  '4/4': { subdivisions: 4, cellMs: 750 },
  '3/4': { subdivisions: 3, cellMs: 667 },
  '6/8': { subdivisions: 2, cellMs: 750 },
};

const TONIC = 'C';

function resolveChord(name) {
  if (CHORD_DEFINITIONS[name]) return CHORD_DEFINITIONS[name];
  if (EXTENDED_CHORDS[name]) return EXTENDED_CHORDS[name].notes;
  return null;
}

function rndDegree() { return 1 + Math.floor(Math.random() * 7); }

function buildQ(level, meter) {
  const cfg = METER_CFG[meter];
  const { subdivisions, cellMs } = cfg;
  const numMeasures = level >= 4 ? 4 : 2;
  const midBarCell = Math.floor(subdivisions / 2);

  // All positions: "m:b" where m=measure, b=beat
  const available = [];
  for (let m = 0; m < numMeasures; m++) {
    for (let b = 0; b < subdivisions; b++) {
      if (!(m === 0 && b === 0)) available.push(`${m}:${b}`);
    }
  }

  const correctSet = new Set();
  let isAccelerating = false;

  if (level === 1) {
    if (Math.random() > 0.5 && available.length > 0) {
      correctSet.add(available[Math.floor(Math.random() * available.length)]);
    }
  } else if (level === 2) {
    const maxChanges = Math.min(3, available.length);
    const numChanges = Math.floor(Math.random() * (maxChanges + 1));
    [...available].sort(() => Math.random() - 0.5).slice(0, numChanges).forEach(p => correctSet.add(p));
  } else if (level === 3) {
    const numChanges = 1 + Math.floor(Math.random() * Math.min(2, available.length));
    [...available].sort(() => Math.random() - 0.5).slice(0, numChanges).forEach(p => correctSet.add(p));
  } else if (level === 4 || level === 6) {
    const numChanges = 1 + Math.floor(Math.random() * Math.min(4, available.length));
    [...available].sort(() => Math.random() - 0.5).slice(0, numChanges).forEach(p => correctSet.add(p));
  } else if (level === 5) {
    isAccelerating = Math.random() > 0.5;
    for (let m = 1; m < numMeasures; m++) correctSet.add(`${m}:0`);
    if (isAccelerating && midBarCell > 0) {
      for (let m = numMeasures - 2; m < numMeasures; m++) {
        correctSet.add(`${m}:${midBarCell}`);
      }
    }
  }

  // Build audio segments
  const totalCells = numMeasures * subdivisions;
  const changeCellSet = new Set([0, ...Array.from(correctSet).map(p => {
    const [m, b] = p.split(':').map(Number);
    return m * subdivisions + b;
  })]);
  const changeCells = [...changeCellSet].sort((a, b) => a - b);

  const segments = changeCells.map((cell, i) => {
    const endCell = i + 1 < changeCells.length ? changeCells[i + 1] : totalCells;
    const cellCount = endCell - cell;
    return { chord: chordAtDegree(TONIC, 'major', rndDegree()), cellCount, durationMs: cellCount * cellMs };
  });

  return { id: Date.now(), level, numMeasures, cfg, correctSet, segments, isAccelerating, hasChange: correctSet.size > 0, changeCount: correctSet.size };
}

async function playQ(q) {
  if (!harmonicAudioPlayer.initialized) await harmonicAudioPlayer.init();
  for (const seg of q.segments) {
    const notes = resolveChord(seg.chord);
    const sec = Math.max((seg.durationMs - 80) / 1000, 0.3);
    if (notes) harmonicAudioPlayer.playChord(notes, sec, 'strummed');
    await new Promise(r => setTimeout(r, seg.durationMs));
  }
}

const ExerciseF3 = () => {
  const navigate = useNavigate();
  const storageKey = 'ear-training:F3:level';

  const [level, setLevel]              = useState(() => loadStoredLevel(storageKey, 1));
  const [meter, setMeter]              = useState('4/4');
  const [numQuestions, setNumQuestions] = useState(10);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [question, setQuestion]        = useState(null);
  const [feedback, setFeedback]        = useState(null);
  const [firstTry, setFirstTry]        = useState(0);
  const [done, setDone]                = useState(false);
  const [gridResetKey, setGridResetKey] = useState(0);
  const [simpleAnswered, setSimpleAnswered] = useState(null);

  const stateRef = useRef({});
  const lastQKeyRef = useRef(null);
  stateRef.current = { level, meter };

  const generate = useCallback(async () => {
    const { level: lv, meter: mt } = stateRef.current;
    if (lv === 6) return;
    let q = buildQ(lv, mt);
    let attempts = 0;
    const keyOf = (qq) => `${[...qq.correctSet].sort().join('|')}_${qq.isAccelerating}`;
    while (
      attempts < 5 &&
      lastQKeyRef.current &&
      keyOf(q) === lastQKeyRef.current
    ) {
      q = buildQ(lv, mt);
      attempts++;
    }
    lastQKeyRef.current = keyOf(q);
    setQuestion(q);
    setGridResetKey(k => k + 1);
    setFeedback(null);
    setSimpleAnswered(null);
    await playQ(q);
  }, []);

  useEffect(() => {
    setQuestionIndex(0); setFirstTry(0); setDone(false);
    lastQKeyRef.current = null;
    const tid = setTimeout(generate, 100);
    return () => clearTimeout(tid);
  }, [level, numQuestions, meter]);

  const handleResult = (isCorrect) => {
    setFeedback(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) setFirstTry(p => p + 1);
    setTimeout(() => {
      setFeedback(null);
      if (questionIndex + 1 >= numQuestions) {
        setDone(true);
      } else {
        setQuestionIndex(p => p + 1);
        setSimpleAnswered(null);
        setTimeout(generate, 100);
      }
    }, 1200);
  };

  const handleSimpleAnswer = (userValue, correctValue) => {
    if (simpleAnswered) return;
    setSimpleAnswered({ picked: userValue, isCorrect: userValue === correctValue });
    handleResult(userValue === correctValue);
  };

  const handleGridConfirm = (_sel, isCorrect) => { handleResult(isCorrect); };

  if (done) {
    return (
      <>
        <EarTrainingHeader exerciseTitle="F3 — ריתמוס הרמוני" levels={LEVELS}
          currentLevel={level} onLevelChange={setLevel} storageKey={storageKey}
          onBack={() => navigate('/category/ear-training/functional')} />
        <SessionSummary total={numQuestions} firstTry={firstTry}
          onRetry={() => { setQuestionIndex(0); setFirstTry(0); setDone(false); setTimeout(generate, 100); }}
          onBack={() => navigate('/category/ear-training/functional')}
          levelLabel={LEVELS.find(l => l.number === level)?.label} />
      </>
    );
  }

  const renderAnswerArea = () => {
    if (level === 6) {
      return (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: '#888' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎵</div>
          <div style={{ fontSize: 17, marginBottom: 8 }}>שלב זה ישתמש בהקלטות אמיתיות של שירים.</div>
          <div style={{ fontSize: 14 }}>בקרוב — בינתיים בחר שלב אחר.</div>
        </div>
      );
    }

    if (!question) return null;

    if (level === 1) {
      const correctValue = question.hasChange ? 'yes' : 'no';
      return (
        <div style={{ textAlign: 'center', padding: '24px 16px' }}>
          <div style={questionLabel}>האם שמעת שינוי אקורד?</div>
          <div style={btnRow}>
            {[{ v: 'yes', label: 'כן — היה שינוי' }, { v: 'no', label: 'לא — אקורד אחיד' }].map(({ v, label }) => (
              <button key={v}
                disabled={!!simpleAnswered}
                onClick={() => handleSimpleAnswer(v, correctValue)}
                style={{
                  ...optBtn,
                  ...(simpleAnswered && v === correctValue ? optCorrect : {}),
                  ...(simpleAnswered && simpleAnswered.picked === v && v !== correctValue ? optWrong : {}),
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (level === 2) {
      const correctValue = question.changeCount;
      return (
        <div style={{ textAlign: 'center', padding: '24px 16px' }}>
          <div style={questionLabel}>כמה שינויי אקורד שמעת?</div>
          <div style={btnRow}>
            {[0, 1, 2, 3].map(n => (
              <button key={n}
                disabled={!!simpleAnswered}
                onClick={() => handleSimpleAnswer(n, correctValue)}
                style={{
                  ...optBtnSq,
                  ...(simpleAnswered && n === correctValue ? optCorrect : {}),
                  ...(simpleAnswered && simpleAnswered.picked === n && n !== correctValue ? optWrong : {}),
                }}>
                {n}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (level === 3 || level === 4) {
      return (
        <div>
          <div style={{ textAlign: 'center', fontSize: 14, color: '#888', padding: '12px 0 4px' }}>
            סמן את המיקומים שבהם שמעת שינוי אקורד
          </div>
          <RhythmGrid
            measures={question.numMeasures}
            subdivisions={question.cfg.subdivisions}
            correctSet={question.correctSet}
            resetKey={gridResetKey}
            onConfirm={handleGridConfirm}
          />
        </div>
      );
    }

    if (level === 5) {
      const correctValue = question.isAccelerating;
      return (
        <div style={{ textAlign: 'center', padding: '24px 16px' }}>
          <div style={questionLabel}>האם קצב האקורדים מתגבר לקראת הסוף?</div>
          <div style={btnRow}>
            {[{ v: true, label: 'כן — מתגבר' }, { v: false, label: 'לא — אחיד' }].map(({ v, label }) => (
              <button key={String(v)}
                disabled={!!simpleAnswered}
                onClick={() => handleSimpleAnswer(v, correctValue)}
                style={{
                  ...optBtn,
                  ...(simpleAnswered && v === correctValue ? optCorrect : {}),
                  ...(simpleAnswered && simpleAnswered.picked === v && v !== correctValue ? optWrong : {}),
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div style={{ direction: 'rtl' }}>
      <EarTrainingHeader exerciseTitle="F3 — ריתמוס הרמוני" levels={LEVELS}
        currentLevel={level} onLevelChange={setLevel} storageKey={storageKey}
        onBack={() => navigate('/category/ear-training/functional')}
        progressCurrent={questionIndex} progressTotal={numQuestions} />

      {question && level !== 6 && (
        <div style={{ textAlign:'center', padding:'12px 16px 4px' }}>
          <button style={playBtn} onClick={() => playQ(question)}>▶ נגן שוב</button>
        </div>
      )}

      {renderAnswerArea()}

      <div style={settingsDivider} />

      <div style={ctrlRow}>
        <QuestionsCounter value={numQuestions} onChange={setNumQuestions} min={3} max={20} />
        <MeterToggle value={meter} onChange={setMeter} />
      </div>

      <FeedbackOverlay state={feedback} />
    </div>
  );
};

const settingsDivider = { borderTop:'1px solid #eee', margin:'8px 24px 0', opacity:0.6 };
const ctrlRow = { display:'flex', gap:16, alignItems:'center', padding:'16px 24px', justifyContent:'center', flexWrap:'wrap' };
const playBtn = { padding:'10px 20px', borderRadius:10, border:'2px solid var(--color-primary,#4a90e2)', background:'var(--color-primary,#4a90e2)', color:'#fff', fontSize:15, fontWeight:600, cursor:'pointer' };
const questionLabel = { fontSize:17, color:'var(--color-text,#222)', marginBottom:20, fontWeight:600 };
const btnRow = { display:'flex', gap:16, justifyContent:'center', flexWrap:'wrap' };
const optBtn = { padding:'14px 28px', borderRadius:10, border:'2px solid #ddd', background:'#fff', fontSize:15, fontWeight:600, cursor:'pointer', minWidth:140, transition:'all 0.15s' };
const optBtnSq = { width:72, height:72, borderRadius:10, border:'2px solid #ddd', background:'#fff', fontSize:22, fontWeight:700, cursor:'pointer', transition:'all 0.15s' };
const optCorrect = { background:'#2dbb5b', borderColor:'#2dbb5b', color:'#fff' };
const optWrong = { background:'#e74c3c', borderColor:'#e74c3c', color:'#fff' };

export default ExerciseF3;
