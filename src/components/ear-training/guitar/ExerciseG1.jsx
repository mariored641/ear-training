import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import EarTrainingHeader from '../shared/EarTrainingHeader';
import FeedbackOverlay from '../shared/FeedbackOverlay';
import SessionSummary from '../shared/SessionSummary';
import QuestionsCounter from '../shared/QuestionsCounter';
import ChipSelector from '../shared/ChipSelector';
import BinaryToggle from '../shared/BinaryToggle';
import { loadStoredLevel } from '../shared/LevelNavigator';
import Fretboard from '../../exercise2/Fretboard';
import NoteIndicator from '../../exercise2/NoteIndicator';
import AudioPlayer from '../../../utils/AudioPlayer';
import { getMelody } from '../../../utils/melodyGeneration';
import { checkNotePosition } from '../../../utils/fretboardCalculations';
import '../shared/earTrainingShared.css';

const LEVELS = [
  { number: 1, label: 'שלב 1 — תו בודד, מיתר E, פרטים 0-5' },
  { number: 2, label: 'שלב 2 — תו בודד, כל המיתרים, פרטים 0-5' },
  { number: 3, label: 'שלב 3 — 2 תווים, תנועה מדרגית' },
  { number: 4, label: 'שלב 4 — 3 תווים, מעורב' },
  { number: 5, label: 'שלב 5 — מנגינות ספרייה' },
  { number: 6, label: 'שלב 6 — מנגינות, מגוון' },
  { number: 7, label: 'שלב 7 — מצב חופשי, כל הצוואר' },
];

const STRING_CHIPS = [
  { id: 'E', label: 'E' },
  { id: 'A', label: 'A' },
  { id: 'D', label: 'D' },
  { id: 'G', label: 'G' },
  { id: 'B', label: 'B' },
  { id: 'e', label: 'e' },
];

const FRET_RANGES = {
  '0-5':  { from: 0, to: 5 },
  '0-12': { from: 0, to: 12 },
  'full': { from: 0, to: 24 },
};

const LEVEL_DEFAULTS = {
  1: { strings: ['E'],                          fretRange: '0-5',  numNotes: 1, movement: 'steps' },
  2: { strings: ['E','A','D','G','B','e'],      fretRange: '0-5',  numNotes: 1, movement: 'steps' },
  3: { strings: ['E','A','D','G','B','e'],      fretRange: '0-5',  numNotes: 2, movement: 'steps' },
  4: { strings: ['E','A','D','G','B','e'],      fretRange: '0-5',  numNotes: 3, movement: 'mixed' },
  5: { strings: ['E','A','D','G','B','e'],      fretRange: '0-12', numNotes: 4, movement: 'mixed' },
  6: { strings: ['E','A','D','G','B','e'],      fretRange: '0-12', numNotes: 5, movement: 'mixed' },
  7: { strings: ['E','A','D','G','B','e'],      fretRange: 'full', numNotes: 6, movement: 'mixed' },
};

function stringsToMap(arr) {
  return { E: arr.includes('E'), A: arr.includes('A'), D: arr.includes('D'), G: arr.includes('G'), B: arr.includes('B'), e: arr.includes('e') };
}

function initSession() {
  return { currentQuestion: 1, currentMelody: null, currentNoteIndex: 0, markedNotes: [], correctFirstTry: 0, totalNotes: 0, highlightedNote: null, noteAttempts: {} };
}

const ExerciseG1 = () => {
  const navigate = useNavigate();
  const storageKey = 'ear-training:G1:level';

  const [level, setLevel]               = useState(() => loadStoredLevel(storageKey, 1));
  const [numQuestions, setNumQuestions] = useState(10);
  const [source, setSource]             = useState('random');
  const [notation, setNotation]         = useState('ordered');
  const [activeStrings, setActiveStrings] = useState(() => LEVEL_DEFAULTS[1].strings);
  const [fretRange, setFretRange]       = useState('0-5');

  const [sessionState, setSessionState] = useState(initSession());
  const [feedback, setFeedback]         = useState(null);
  const [done, setDone]                 = useState(false);

  const isPlayingRef = useRef(false);
  const melodyRef    = useRef(null);
  const stateRef     = useRef({});
  stateRef.current   = { level, source, activeStrings, fretRange, numQuestions };

  // When level changes, reset strings and fretRange to level defaults
  useEffect(() => {
    const def = LEVEL_DEFAULTS[level] || LEVEL_DEFAULTS[1];
    setActiveStrings(def.strings);
    setFretRange(def.fretRange);
  }, [level]);

  const buildSettings = () => {
    const { level: lv, activeStrings: strs, fretRange: fr } = stateRef.current;
    const def = LEVEL_DEFAULTS[lv] || LEVEL_DEFAULTS[1];
    return {
      source: stateRef.current.source,
      numNotes: def.numNotes,
      octaveRange: 2,
      movement: def.movement,
      availableNotes: { C:true,'C#':true,D:true,'D#':true,E:true,F:true,'F#':true,G:true,'G#':true,A:true,'A#':true,B:true },
      display: { noteNames: true, dots: true },
      marking: stateRef.current.notation || 'inOrder',
      frets: FRET_RANGES[fr] || FRET_RANGES['0-5'],
      strings: stringsToMap(strs.length > 0 ? strs : LEVEL_DEFAULTS[lv].strings),
    };
  };

  const loadMelody = useCallback(async (qNum = 1) => {
    try {
      await AudioPlayer.setInstrument('guitar');
      const settings = buildSettings();
      const melody = getMelody(settings.source, settings, qNum - 1);
      melodyRef.current = melody;
      setSessionState(prev => ({ ...prev, currentMelody: melody, currentNoteIndex: 0, markedNotes: [], highlightedNote: null, noteAttempts: {} }));
      setTimeout(() => {
        if (!isPlayingRef.current && melodyRef.current) {
          isPlayingRef.current = true;
          AudioPlayer.playSequence(melodyRef.current.notes.map(n => n.fullNote), 100)
            .finally(() => { isPlayingRef.current = false; });
        }
      }, 400);
    } catch {}
  }, []);

  useEffect(() => {
    setDone(false);
    setSessionState(initSession());
    setTimeout(() => loadMelody(1), 150);
  }, [level, numQuestions]);

  const handleFretClick = (string, fret) => {
    const { currentNoteIndex, currentMelody, markedNotes, noteAttempts } = sessionState;
    if (!currentMelody) return;
    const correctNote = currentMelody.notes[currentNoteIndex];
    if (checkNotePosition(string, fret, correctNote)) {
      const isFirstTry = !noteAttempts[currentNoteIndex];
      const newMarked = [...markedNotes, { string, fret, noteIndices: [currentNoteIndex + 1] }];
      const allDone = newMarked.reduce((s, n) => s + n.noteIndices.length, 0) >= currentMelody.notes.length;
      const newFT = isFirstTry ? sessionState.correctFirstTry + 1 : sessionState.correctFirstTry;
      setFeedback('correct');
      setTimeout(() => setFeedback(null), 500);
      setSessionState(prev => ({
        ...prev, markedNotes: newMarked, correctFirstTry: newFT, totalNotes: prev.totalNotes + 1,
        currentNoteIndex: allDone ? prev.currentNoteIndex : prev.currentNoteIndex + 1
      }));
      if (allDone) {
        setTimeout(() => {
          const nextQ = sessionState.currentQuestion + 1;
          if (nextQ > stateRef.current.numQuestions) { setDone(true); }
          else {
            setSessionState(prev => ({ ...initSession(), currentQuestion: nextQ }));
            loadMelody(nextQ);
          }
        }, 800);
      }
    } else {
      setFeedback('wrong');
      setTimeout(() => setFeedback(null), 400);
      setSessionState(prev => ({ ...prev, noteAttempts: { ...prev.noteAttempts, [currentNoteIndex]: true } }));
    }
  };

  const toggleString = (id) => {
    setActiveStrings(prev => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev;
        return prev.filter(s => s !== id);
      }
      return [...prev, id];
    });
  };

  const currentSettings = buildSettings();

  if (done) {
    return (
      <>
        <EarTrainingHeader exerciseTitle="G1 — מיפוי צוואר גיטרה"
          levels={LEVELS} currentLevel={level} onLevelChange={setLevel}
          storageKey={storageKey} onBack={() => navigate('/category/ear-training/guitar')} />
        <SessionSummary total={numQuestions} firstTry={sessionState.correctFirstTry}
          onRetry={() => { setDone(false); setSessionState(initSession()); loadMelody(1); }}
          onBack={() => navigate('/category/ear-training/guitar')}
          levelLabel={LEVELS.find(l => l.number === level)?.label} />
      </>
    );
  }

  return (
    <div className="exercise2" style={{ direction: 'rtl' }}>
      <EarTrainingHeader exerciseTitle="G1 — מיפוי צוואר גיטרה"
        levels={LEVELS} currentLevel={level} onLevelChange={setLevel}
        storageKey={storageKey} onBack={() => navigate('/category/ear-training/guitar')}
        progressCurrent={sessionState.currentQuestion - 1} progressTotal={numQuestions}
        onStop={() => setDone(true)} />

      {/* Controls row */}
      <div style={ctrlRow}>
        <QuestionsCounter value={numQuestions} onChange={v => { setNumQuestions(v); }} min={3} max={20} />
        <BinaryToggle label="מקור"
          options={[{ value:'random', label:'אקראי' }, { value:'library', label:'ספרייה' }]}
          value={source} onChange={setSource} />
        <BinaryToggle label="טווח פרטים"
          options={[{ value:'0-5', label:'0–5' }, { value:'0-12', label:'0–12' }, { value:'full', label:'כל הצוואר' }]}
          value={fretRange} onChange={setFretRange} />
        <BinaryToggle label="סימון"
          options={[{ value:'ordered', label:'בסדר' }, { value:'free', label:'חופשי' }]}
          value={notation} onChange={setNotation} />
      </div>

      {/* String chips */}
      <div style={{ display:'flex', justifyContent:'center', padding:'8px 16px', gap:8 }}>
        <span style={{ fontSize:13, color:'#666', alignSelf:'center' }}>מיתרים:</span>
        <ChipSelector
          items={STRING_CHIPS}
          activeIds={activeStrings}
          onToggle={toggleString}
          minActive={1} />
      </div>

      {/* Play button */}
      <div style={{ textAlign: 'center', padding: '8px 8px 12px' }}>
        <button style={audioBtn}
          onClick={() => { if (melodyRef.current) AudioPlayer.playSequence(melodyRef.current.notes.map(n => n.fullNote), 100); }}>
          🔊 נגן מנגינה
        </button>
      </div>

      {sessionState.currentMelody && (
        <>
          <NoteIndicator
            totalNotes={sessionState.currentMelody.notes.length}
            currentNoteIndex={sessionState.currentNoteIndex}
            markedNotes={sessionState.markedNotes} />
          <Fretboard
            fretRange={currentSettings.frets}
            strings={currentSettings.strings}
            showNoteNames={currentSettings.display.noteNames}
            showDots={currentSettings.display.dots}
            markedNotes={sessionState.markedNotes}
            currentNoteIndex={sessionState.currentNoteIndex}
            onFretClick={handleFretClick}
            highlightedNote={sessionState.highlightedNote}
            marking={notation === 'free' ? 'free' : 'inOrder'}
            selectedNoteIndex={0} />
        </>
      )}
      <FeedbackOverlay state={feedback} />
    </div>
  );
};

const ctrlRow = { display:'flex', flexWrap:'wrap', gap:12, alignItems:'center', padding:'12px 20px', borderBottom:'1px solid #eee', justifyContent:'center' };
const audioBtn = { padding:'10px 24px', borderRadius:10, border:'2px solid var(--color-primary,#4a90e2)', background:'var(--color-primary,#4a90e2)', color:'#fff', fontSize:15, fontWeight:600, cursor:'pointer' };

export default ExerciseG1;
