import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import EarTrainingHeader from '../shared/EarTrainingHeader';
import FeedbackOverlay from '../shared/FeedbackOverlay';
import SessionSummary from '../shared/SessionSummary';
import QuestionsCounter from '../shared/QuestionsCounter';
import BinaryToggle from '../shared/BinaryToggle';
import ChipSelector from '../shared/ChipSelector';
import { loadStoredLevel } from '../shared/LevelNavigator';
import audioPlayer from '../../../utils/AudioPlayer';
import harmonicAudioPlayer from '../../../utils/HarmonicAudioPlayer';
import '../shared/earTrainingShared.css';

const PC = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

// ── Level definitions — per spec.md lines 143-164 ──────────────────────────
const LEVELS = [
  { number:  1, label: 'שלב 1 — הטוניקה' },
  { number:  2, label: 'שלב 2 — 1 ו-7' },
  { number:  3, label: 'שלב 3 — הוספת 2' },
  { number:  4, label: 'שלב 4 — הוספת 5' },
  { number:  5, label: 'שלב 5 — הוספת 3' },
  { number:  6, label: 'שלב 6 — הוספת 4' },
  { number:  7, label: 'שלב 7 — כל מז\'ור' },
  { number:  8, label: 'שלב 8 — מינור: 1 ו-♭7' },
  { number:  9, label: 'שלב 9 — מינור: הרחבה' },
  { number: 10, label: 'שלב 10 — כל מינור טבעי' },
  { number: 11, label: 'שלב 11 — + ♭3 כרומטי' },
  { number: 12, label: 'שלב 12 — + ♭2' },
  { number: 13, label: 'שלב 13 — + ♭6' },
  { number: 14, label: 'שלב 14 — + ♭7' },
  { number: 15, label: 'שלב 15 — + ♭5' },
  { number: 16, label: 'שלב 16 — כל 12 — מז\'ור' },
  { number: 17, label: 'שלב 17 — כל 12 — מינור' },
];

// Config per level — baseNotes = diatonic, chromatic = chips that can be toggled
const LEVEL_CONFIG = {
  1:  { notes:[0],               scale:'major', tonic:'C', defaultRef:'cadence' },
  2:  { notes:[0,11],            scale:'major', tonic:'C', defaultRef:'cadence' },
  3:  { notes:[0,11,2],          scale:'major', tonic:'C', defaultRef:'cadence' },
  4:  { notes:[0,11,2,7],        scale:'major', tonic:'C', defaultRef:'cadence' },
  5:  { notes:[0,11,2,7,4],      scale:'major', tonic:'C', defaultRef:'chord'   },
  6:  { notes:[0,11,2,7,4,5],    scale:'major', tonic:'C', defaultRef:'chord'   },
  7:  { notes:[0,2,4,5,7,9,11],  scale:'major', tonic:'C', defaultRef:'chord'   },
  8:  { notes:[0,10],            scale:'minor', tonic:'A', defaultRef:'cadence' },
  9:  { notes:[0,10,2,7,3,5,8],  scale:'minor', tonic:'A', defaultRef:'chord'   },
  10: { notes:[0,2,3,5,7,8,10],  scale:'minor', tonic:'A', defaultRef:'chord'   },
  11: { baseNotes:[0,2,4,5,7,9,11], scale:'major', tonic:'C', defaultRef:'chord',
        chromatic:[{id:3,label:'♭3'}] },
  12: { baseNotes:[0,2,4,5,7,9,11], scale:'major', tonic:'C', defaultRef:'chord',
        chromatic:[{id:3,label:'♭3'},{id:1,label:'♭2'}] },
  13: { baseNotes:[0,2,4,5,7,9,11], scale:'major', tonic:'C', defaultRef:'note',
        chromatic:[{id:3,label:'♭3'},{id:1,label:'♭2'},{id:8,label:'♭6'}] },
  14: { baseNotes:[0,2,4,5,7,9,11], scale:'major', tonic:'C', defaultRef:'note',
        chromatic:[{id:3,label:'♭3'},{id:1,label:'♭2'},{id:8,label:'♭6'},{id:10,label:'♭7'}] },
  15: { baseNotes:[0,2,4,5,7,9,11], scale:'major', tonic:'C', defaultRef:'note',
        chromatic:[{id:3,label:'♭3'},{id:1,label:'♭2'},{id:8,label:'♭6'},{id:10,label:'♭7'},{id:6,label:'♭5'}] },
  16: { notes:[0,1,2,3,4,5,6,7,8,9,10,11], scale:'chromatic', tonic:'C', defaultRef:'note' },
  17: { notes:[0,1,2,3,4,5,6,7,8,9,10,11], scale:'minor',     tonic:'A', defaultRef:'note' },
};

const DEGREE_MAJOR    = { 0:'I', 2:'II', 4:'III', 5:'IV', 7:'V', 9:'VI', 11:'VII' };
const DEGREE_MINOR    = { 0:'i', 2:'ii', 3:'♭III', 5:'iv', 7:'v', 8:'♭VI', 10:'♭VII' };
const DEGREE_CHROMATIC= { 0:'I', 1:'♭II', 2:'II', 3:'♭III', 4:'III', 5:'IV', 6:'♭V', 7:'V', 8:'♭VI', 9:'VI', 10:'♭VII', 11:'VII' };

function degreeLabel(interval, scale) {
  if (scale === 'minor') return DEGREE_MINOR[interval] ?? DEGREE_CHROMATIC[interval] ?? PC[interval];
  if (scale === 'chromatic') return DEGREE_CHROMATIC[interval] ?? PC[interval];
  return DEGREE_MAJOR[interval] ?? DEGREE_CHROMATIC[interval] ?? PC[interval];
}

// Depleting-bag pick: cycle through all notes before repeating
function pickFromBag(bag, notes) {
  // Keep only notes still in current set
  const filtered = bag.filter(n => notes.includes(n));
  if (filtered.length === 0) {
    // Refill: shuffle all notes
    const shuffled = [...notes].sort(() => Math.random() - 0.5);
    bag.length = 0;
    bag.push(...shuffled);
    return bag.pop();
  }
  bag.length = 0;
  bag.push(...filtered);
  return bag.pop();
}

function pickNote(notes, tonic, bag) {
  const rootPc = PC.indexOf(tonic);
  const iv = pickFromBag(bag, notes);
  const pc = (rootPc + iv) % 12;
  const extraOct = Math.floor((rootPc + iv) / 12);
  // Random octave offset over 3 octaves (3, 4, 5)
  const octOffset = Math.floor(Math.random() * 3) - 1;
  const noteOct = Math.max(2, Math.min(6, 4 + extraOct + octOffset));
  return { noteName: PC[pc], noteWithOct: PC[pc] + noteOct, interval: iv };
}

const delay = (ms) => new Promise(r => setTimeout(r, ms));

const ExerciseM1 = () => {
  const navigate = useNavigate();
  const storageKey = 'ear-training:M1:level';

  const [level, setLevelRaw] = useState(() => loadStoredLevel(storageKey, 1));
  const [numQuestions, setNumQuestions] = useState(10);
  const [displayMode, setDisplayMode] = useState('degrees');
  const [instrument, setInstrument] = useState(
    () => localStorage.getItem('ear-training:M1:instrument') || 'piano'
  );
  const [reference, setReference] = useState(null); // null = use defaultRef
  const [activeChips, setActiveChips] = useState([]);

  const [questionIndex, setQuestionIndex] = useState(0);
  const [correctNote, setCorrectNote] = useState(null);
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [firstTry, setFirstTry] = useState(0);
  const [attempted, setAttempted] = useState(false);
  const [done, setDone] = useState(false);
  const [playing, setPlaying] = useState(false);
  const isPlayingRef = useRef(false);
  const stateRef = useRef({});
  const bagRef = useRef([]);
  const lastIntervalRef = useRef(null);

  const cfg = LEVEL_CONFIG[level] || LEVEL_CONFIG[1];
  const effectiveRef = reference ?? cfg.defaultRef;

  const activeNotes = cfg.baseNotes
    ? [...cfg.baseNotes, ...activeChips]
    : (cfg.notes ?? []);

  stateRef.current = { cfg, effectiveRef, instrument, activeNotes };

  const setLevel = (n) => {
    setLevelRaw(n);
    setReference(null);
    const newCfg = LEVEL_CONFIG[n] || LEVEL_CONFIG[1];
    setActiveChips(newCfg.chromatic ? newCfg.chromatic.map(c => c.id) : []);
  };

  useEffect(() => {
    setActiveChips(cfg.chromatic ? cfg.chromatic.map(c => c.id) : []);
  }, []); // mount only

  const playQuestion = async (note) => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;
    setPlaying(true);
    const { effectiveRef: ref, instrument: inst, cfg: c } = stateRef.current;
    try {
      if (!audioPlayer.initialized) await audioPlayer.init();
      if (audioPlayer.currentInstrument !== inst) await audioPlayer.setInstrument(inst);
      if (!harmonicAudioPlayer.initialized) await harmonicAudioPlayer.init();

      if (ref === 'cadence') {
        const mode = c.scale === 'minor' ? 'minor' : 'major';
        await harmonicAudioPlayer.playCadence('PAC', c.tonic, null, mode, 0.8);
        await delay(200);
      } else if (ref === 'chord') {
        const mode = c.scale === 'minor' ? 'minor' : 'major';
        const chordName = mode === 'minor' ? c.tonic + 'm' : c.tonic;
        const { CHORD_DEFINITIONS, EXTENDED_CHORDS } = await import('../../../constants/harmonicDefaults');
        const chordNotes = CHORD_DEFINITIONS[chordName] || EXTENDED_CHORDS[chordName]?.notes;
        if (chordNotes) harmonicAudioPlayer.playChord(chordNotes, 0.8, 'strummed');
        await delay(1000);
      } else if (ref === 'note') {
        await audioPlayer.playNote(c.tonic + '4', 1.0);
        await delay(1100);
      }
      // ref === 'none': play only the note, no reference
      await audioPlayer.playNote(note.noteWithOct, 1.0);
    } finally {
      setTimeout(() => { isPlayingRef.current = false; setPlaying(false); }, 200);
    }
  };

  const loadQuestion = useCallback(async () => {
    if (isPlayingRef.current) return;
    const { cfg: c, activeNotes: notes } = stateRef.current;
    let note = pickNote(notes, c.tonic, bagRef.current);
    let attempts = 0;
    while (
      attempts < 5 &&
      notes.length > 1 &&
      lastIntervalRef.current !== null &&
      note.interval === lastIntervalRef.current
    ) {
      note = pickNote(notes, c.tonic, bagRef.current);
      attempts++;
    }
    lastIntervalRef.current = note.interval;
    setCorrectNote(note);
    setSelected(null);
    setFeedback(null);
    setAttempted(false);
    await playQuestion(note);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  useEffect(() => {
    bagRef.current = []; // reset bag on level/numQuestions change
    lastIntervalRef.current = null;
    setQuestionIndex(0);
    setFirstTry(0);
    setDone(false);
    setCorrectNote(null);
    setSelected(null);
    setTimeout(() => loadQuestion(), 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, numQuestions]);

  const handleInstrumentChange = (val) => {
    setInstrument(val);
    localStorage.setItem('ear-training:M1:instrument', val);
  };

  const handleReferenceChange = (val) => {
    setReference(val);
    localStorage.setItem('ear-training:M1:reference', val);
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

  const refLabel = effectiveRef === 'cadence' ? 'קדנצה ← תו — איזו דרגה?'
    : effectiveRef === 'chord'   ? 'אקורד ← תו — איזו דרגה?'
    : effectiveRef === 'note'    ? 'תו טוניקה ← תו — איזו דרגה?'
    : 'תו — איזו דרגה? (ללא רפרנס)';

  // Sort descending so RTL flex renders ascending left-to-right
  const displayNotes = [...activeNotes].sort((a, b) => b - a);

  return (
    <div style={{ direction: 'rtl' }}>
      <EarTrainingHeader exerciseTitle="M1 — זיהוי דרגה מלודית"
        levels={LEVELS} currentLevel={level} onLevelChange={setLevel}
        storageKey={storageKey} onBack={() => navigate('/category/ear-training/melodic')}
        progressCurrent={questionIndex} progressTotal={numQuestions} />

      <div style={{ textAlign:'center', padding:'12px 16px 4px' }}>
        <button onClick={() => !playing && correctNote && playQuestion(correctNote)} disabled={playing} style={replayBtn}>
          {playing ? '🔊' : '▶'} נגן שוב
        </button>
      </div>

      <div style={{ textAlign:'center', color:'#888', marginTop:4, minHeight:18, fontSize:13 }}>
        {refLabel}
      </div>

      <div style={noteGrid}>
        {displayNotes.map(iv => {
          const noteName = PC[(PC.indexOf(cfg.tonic) + iv) % 12];
          const label = displayMode === 'names' ? noteName : degreeLabel(iv, cfg.scale);
          const isSelected = selected === iv;
          return (
            <button key={iv} onClick={() => handleSelect(iv)}
              style={{
                ...noteBtn,
                ...(isSelected && !feedback ? noteSelected : {}),
                ...(isSelected && feedback === 'correct' ? noteCorrect : {}),
                ...(isSelected && feedback === 'wrong'   ? noteWrong   : {}),
              }}>
              {label}
            </button>
          );
        })}
      </div>

      <div style={settingsDivider} />

      <div style={ctrlRow}>
        <QuestionsCounter value={numQuestions} onChange={setNumQuestions} />
        <BinaryToggle label="רפרנס"
          options={[{value:'cadence',label:'קדנצה'},{value:'chord',label:'אקורד'},{value:'note',label:'תו'},{value:'none',label:'ללא'}]}
          value={effectiveRef} onChange={handleReferenceChange} />
        <BinaryToggle label="כלי"
          options={[{value:'piano',label:'פסנתר'},{value:'guitar',label:'גיטרה'}]}
          value={instrument} onChange={handleInstrumentChange} />
        <BinaryToggle label="תצוגה"
          options={[{value:'degrees',label:'I II III'},{value:'names',label:'C D E'}]}
          value={displayMode} onChange={setDisplayMode} />
      </div>

      {cfg.chromatic && (
        <div style={{ display:'flex', justifyContent:'center', padding:'8px 16px 24px' }}>
          <ChipSelector
            items={cfg.chromatic}
            activeIds={activeChips}
            onToggle={handleChipToggle}
            minActive={2}
          />
        </div>
      )}

      <FeedbackOverlay state={feedback} />
    </div>
  );
};

const settingsDivider = { borderTop:'1px solid var(--border-color,#eee)', margin:'8px 24px 0', opacity:0.6 };
const ctrlRow = {
  display:'flex', flexWrap:'wrap', gap:16, alignItems:'center',
  padding:'16px 24px', justifyContent:'center'
};
const replayBtn = {
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
const noteSelected = { background:'var(--color-primary, #4a90e2)', color:'#fff', border:'2px solid var(--color-primary, #4a90e2)' };
const noteCorrect  = { background:'#2dbb5b', color:'#fff', border:'2px solid #2dbb5b' };
const noteWrong    = { background:'#e74c3c', color:'#fff', border:'2px solid #e74c3c' };

export default ExerciseM1;
