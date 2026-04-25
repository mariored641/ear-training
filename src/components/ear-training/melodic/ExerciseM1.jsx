import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import EarTrainingHeader from '../shared/EarTrainingHeader';
import FeedbackOverlay from '../shared/FeedbackOverlay';
import SessionSummary from '../shared/SessionSummary';
import QuestionsCounter from '../shared/QuestionsCounter';
import BinaryToggle from '../shared/BinaryToggle';
import { loadStoredLevel } from '../shared/LevelNavigator';
import audioPlayer from '../../../utils/AudioPlayer';
import harmonicAudioPlayer from '../../../utils/HarmonicAudioPlayer';
import '../shared/earTrainingShared.css';

const PC = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

// ── Level definitions ──────────────────────────────────────────────────────
const LEVELS = [
  { number:  1, label: 'שלב 1 — דרגות 1-2-3 (מז\'ור, קדנצה)' },
  { number:  2, label: 'שלב 2 — דרגות 1-2-3-5 (מז\'ור, קדנצה)' },
  { number:  3, label: 'שלב 3 — דרגות 1-2-3-4-5 (מז\'ור, קדנצה)' },
  { number:  4, label: 'שלב 4 — כל הדיאטוני (1-7, קדנצה)' },
  { number:  5, label: 'שלב 5 — 1-7 (אקורד טוניקה)' },
  { number:  6, label: 'שלב 6 — 1-7 + ♭7 (מיקסולידי, אקורד)' },
  { number:  7, label: 'שלב 7 — מינור טבעי 1-7 (אקורד)' },
  { number:  8, label: 'שלב 8 — מינור הרמוני (קדנצה מינורית)' },
  { number:  9, label: 'שלב 9 — מינור + מז\'ור, אקורד בלבד' },
  { number: 10, label: 'שלב 10 — 1-7 מינור, תו בלבד' },
  { number: 11, label: 'שלב 11 — 12 תווים כרומטיים (תו)' },
  { number: 12, label: 'שלב 12 — 12 כרומטיים, רנדום אוקטבה' },
  { number: 13, label: 'שלב 13 — 12 כרומטיים, בלי רפרנס' },
  { number: 14, label: 'שלב 14 — גיטרה, 12 כרומטיים' },
  { number: 15, label: 'שלב 15 — מהיר, כרומטי מלא' },
  { number: 16, label: 'שלב 16 — דיאטוני מז\'ור, ללא רפרנס' },
  { number: 17, label: 'שלב 17 — מינור, ללא רפרנס' },
];

// Notes and labels per level
const LEVEL_CONFIG = {
  1:  { notes: [0,2,4],              scale:'major',  ref:'cadence', tonic:'C', instrument:'piano' },
  2:  { notes: [0,2,4,7],            scale:'major',  ref:'cadence', tonic:'C', instrument:'piano' },
  3:  { notes: [0,2,4,5,7],          scale:'major',  ref:'cadence', tonic:'C', instrument:'piano' },
  4:  { notes: [0,2,4,5,7,9,11],     scale:'major',  ref:'cadence', tonic:'C', instrument:'piano' },
  5:  { notes: [0,2,4,5,7,9,11],     scale:'major',  ref:'chord',   tonic:'C', instrument:'piano' },
  6:  { notes: [0,2,4,5,7,9,10,11],  scale:'major',  ref:'chord',   tonic:'C', instrument:'piano' },
  7:  { notes: [0,2,3,5,7,8,10],     scale:'minor',  ref:'chord',   tonic:'A', instrument:'piano' },
  8:  { notes: [0,2,3,5,7,8,11],     scale:'minor',  ref:'cadence', tonic:'A', instrument:'piano' },
  9:  { notes: [0,2,4,5,7,9,11, 3,8,10], scale:'mixed', ref:'chord', tonic:'C', instrument:'piano' },
  10: { notes: [0,2,3,5,7,8,10],     scale:'minor',  ref:'note',    tonic:'A', instrument:'piano' },
  11: { notes: [0,1,2,3,4,5,6,7,8,9,10,11], scale:'chromatic', ref:'note', tonic:'C', instrument:'piano' },
  12: { notes: [0,1,2,3,4,5,6,7,8,9,10,11], scale:'chromatic', ref:'note', tonic:'C', instrument:'piano', wideOctave:true },
  13: { notes: [0,1,2,3,4,5,6,7,8,9,10,11], scale:'chromatic', ref:'none', tonic:'C', instrument:'piano' },
  14: { notes: [0,1,2,3,4,5,6,7,8,9,10,11], scale:'chromatic', ref:'note', tonic:'C', instrument:'guitar' },
  15: { notes: [0,1,2,3,4,5,6,7,8,9,10,11], scale:'chromatic', ref:'note', tonic:'C', instrument:'piano', fast:true },
  16: { notes: [0,2,4,5,7,9,11],     scale:'major',  ref:'none',    tonic:'C', instrument:'piano' },
  17: { notes: [0,2,3,5,7,8,10],     scale:'minor',  ref:'none',    tonic:'A', instrument:'piano' },
};

const DEGREE_LABELS_MAJOR = { 0:'I', 2:'II', 4:'III', 5:'IV', 7:'V', 9:'VI', 11:'VII' };
const DEGREE_LABELS_MINOR = { 0:'i', 2:'ii', 3:'♭III', 5:'iv', 7:'v', 8:'♭VI', 10:'♭VII', 11:'VII' };

function degreeLabel(interval, scale) {
  if (scale === 'minor') return DEGREE_LABELS_MINOR[interval] ?? PC[interval];
  return DEGREE_LABELS_MAJOR[interval] ?? PC[interval];
}

function pickNote(cfg) {
  const rootPc = PC.indexOf(cfg.tonic);
  const iv = cfg.notes[Math.floor(Math.random() * cfg.notes.length)];
  const octave = cfg.wideOctave ? (3 + Math.floor(Math.random() * 3)) : 4;
  const pc = (rootPc + iv) % 12;
  const extraOct = Math.floor((rootPc + iv) / 12);
  return { noteName: PC[pc], noteWithOct: PC[pc] + (octave + extraOct), interval: iv };
}

// ── Component ──────────────────────────────────────────────────────────────
const ExerciseM1 = () => {
  const navigate = useNavigate();
  const storageKey = 'ear-training:M1:level';

  const [level, setLevel] = useState(() => loadStoredLevel(storageKey, 1));
  const [numQuestions, setNumQuestions] = useState(10);
  const [displayMode, setDisplayMode] = useState('degrees'); // 'degrees' | 'names'
  const [questionIndex, setQuestionIndex] = useState(0);
  const [correctNote, setCorrectNote] = useState(null);
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [firstTry, setFirstTry] = useState(0);
  const [attempted, setAttempted] = useState(false);
  const [done, setDone] = useState(false);
  const [playing, setPlaying] = useState(false);
  const isPlayingRef = useRef(false);

  const cfg = LEVEL_CONFIG[level] || LEVEL_CONFIG[1];

  const loadQuestion = useCallback(async () => {
    if (isPlayingRef.current) return;
    const note = pickNote(cfg);
    setCorrectNote(note);
    setSelected(null);
    setFeedback(null);
    setAttempted(false);
    await playQuestion(note);
  }, [cfg]);

  useEffect(() => {
    setQuestionIndex(0);
    setFirstTry(0);
    setDone(false);
    setCorrectNote(null);
    setSelected(null);
    setTimeout(() => loadQuestion(), 100);
  }, [level, numQuestions]);

  const playQuestion = async (note) => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;
    setPlaying(true);
    try {
      const inst = cfg.instrument || 'piano';
      if (!audioPlayer.initialized) await audioPlayer.init();
      if (audioPlayer.currentInstrument !== inst) await audioPlayer.setInstrument(inst);
      if (!harmonicAudioPlayer.initialized) await harmonicAudioPlayer.init();

      if (cfg.ref === 'cadence') {
        const mode = cfg.scale === 'minor' ? 'minor' : 'major';
        await harmonicAudioPlayer.playCadence('PAC', cfg.tonic, null, mode, 0.8);
        await delay(200);
      } else if (cfg.ref === 'chord') {
        const mode = cfg.scale === 'minor' ? 'minor' : 'major';
        const chordName = mode === 'minor' ? cfg.tonic + 'm' : cfg.tonic;
        const { CHORD_DEFINITIONS, EXTENDED_CHORDS } = await import('../../../constants/harmonicDefaults');
        const chordNotes = CHORD_DEFINITIONS[chordName] || EXTENDED_CHORDS[chordName]?.notes;
        if (chordNotes) harmonicAudioPlayer.playChord(chordNotes, 0.8, 'strummed');
        await delay(1000);
      } else if (cfg.ref === 'note') {
        await audioPlayer.playNote(cfg.tonic + '4', 1.0);
        await delay(1100);
      }
      await audioPlayer.playNote(note.noteWithOct, cfg.fast ? 0.5 : 1.0);
    } finally {
      setTimeout(() => { isPlayingRef.current = false; setPlaying(false); }, 200);
    }
  };

  const handleSelect = async (iv) => {
    if (!correctNote || done || playing) return;
    const isOk = iv === correctNote.interval;
    setSelected(iv);
    setFeedback(isOk ? 'correct' : 'wrong');
    if (isOk && !attempted) setFirstTry(p => p + 1);
    setAttempted(true);
    setTimeout(() => setFeedback(null), 600);
    if (isOk) {
      setTimeout(async () => {
        if (questionIndex + 1 >= numQuestions) { setDone(true); }
        else { setQuestionIndex(p => p + 1); await loadQuestion(); }
      }, 800);
    }
  };

  if (done) {
    return (
      <>
        <EarTrainingHeader exerciseTitle="M1 — זיהוי דרגה מלודית"
          levels={LEVELS} currentLevel={level} onLevelChange={setLevel}
          storageKey={storageKey} onBack={() => navigate('/category/ear-training/melodic')} />
        <SessionSummary total={numQuestions} firstTry={firstTry}
          onRetry={() => { setQuestionIndex(0); setFirstTry(0); setDone(false); setTimeout(loadQuestion,100); }}
          onBack={() => navigate('/category/ear-training/melodic')}
          levelLabel={LEVELS.find(l => l.number === level)?.label} />
      </>
    );
  }

  return (
    <div style={{ direction: 'rtl' }}>
      <EarTrainingHeader exerciseTitle="M1 — זיהוי דרגה מלודית"
        levels={LEVELS} currentLevel={level} onLevelChange={setLevel}
        storageKey={storageKey} onBack={() => navigate('/category/ear-training/melodic')}
        progressCurrent={questionIndex} progressTotal={numQuestions} />

      {/* Controls bar */}
      <div style={ctrlRow}>
        <QuestionsCounter value={numQuestions} onChange={setNumQuestions} />
        <BinaryToggle
          label="תצוגה"
          options={[{ value:'degrees', label:'I II III' }, { value:'names', label:'C D E' }]}
          value={displayMode} onChange={setDisplayMode} />
        {cfg.ref !== 'none' && (
          <button onClick={() => loadQuestion()} disabled={playing} style={refBtn}>
            {playing ? '🔊' : '▶'} נגן שוב
          </button>
        )}
      </div>

      <div style={{ textAlign:'center', color:'#888', marginTop:12, minHeight:24, fontSize:14 }}>
        {cfg.ref === 'cadence' && 'קדנצה ← תו — איזו דרגה?'}
        {cfg.ref === 'chord' && 'אקורד ← תו — איזו דרגה?'}
        {cfg.ref === 'note' && 'תו טוניקה ← תו — איזו דרגה?'}
        {cfg.ref === 'none' && 'תו ← איזו דרגה? (ללא רפרנס)'}
      </div>

      {/* Note buttons */}
      <div style={noteGrid}>
        {cfg.notes.map(iv => {
          const noteName = PC[(PC.indexOf(cfg.tonic) + iv) % 12];
          const label = displayMode === 'names' ? noteName : degreeLabel(iv, cfg.scale);
          const isCorrectIv = correctNote?.interval === iv;
          const isSelected = selected === iv;
          return (
            <button
              key={iv}
              onClick={() => handleSelect(iv)}
              style={{
                ...noteBtn,
                ...(isSelected && feedback === 'correct' ? noteCorrect : {}),
                ...(isSelected && feedback === 'wrong' ? noteWrong : {}),
              }}
              aria-pressed={isSelected}
            >
              {label}
            </button>
          );
        })}
      </div>

      <FeedbackOverlay state={feedback} />
    </div>
  );
};

const delay = (ms) => new Promise(r => setTimeout(r, ms));

const ctrlRow = {
  display:'flex', flexWrap:'wrap', gap:16, alignItems:'center',
  padding:'16px 24px', borderBottom:'1px solid var(--border-color,#eee)', justifyContent:'center'
};
const refBtn = {
  padding:'10px 20px', borderRadius:10,
  border:'2px solid var(--color-primary,#4a90e2)',
  background:'var(--color-primary,#4a90e2)', color:'#fff',
  fontSize:15, fontWeight:600, cursor:'pointer'
};
const noteGrid = {
  display:'flex', flexWrap:'wrap', gap:12, justifyContent:'center',
  padding:'32px 16px', maxWidth:700, margin:'0 auto'
};
const noteBtn = {
  minWidth:80, padding:'16px 12px', borderRadius:10,
  border:'2px solid var(--border-color,#ddd)', background:'#fff',
  color:'var(--color-text,#222)', fontSize:18, fontWeight:700, cursor:'pointer'
};
const noteCorrect = { background:'#2dbb5b', color:'#fff', borderColor:'#2dbb5b' };
const noteWrong   = { background:'#e74c3c', color:'#fff', borderColor:'#e74c3c' };

export default ExerciseM1;
