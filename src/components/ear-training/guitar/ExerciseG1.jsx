import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import EarTrainingHeader from '../shared/EarTrainingHeader';
import FeedbackOverlay from '../shared/FeedbackOverlay';
import SessionSummary from '../shared/SessionSummary';
import QuestionsCounter from '../shared/QuestionsCounter';
import BinaryToggle from '../shared/BinaryToggle';
import { loadStoredLevel } from '../shared/LevelNavigator';
import AllScalesFretboard from '../../positions/AllScalesFretboard';
import NoteIndicator from '../../exercise2/NoteIndicator';
import AudioPlayer from '../../../utils/AudioPlayer';
import { getMelody } from '../../../utils/melodyGeneration';
import { checkNotePosition } from '../../../utils/fretboardCalculations';
import '../shared/earTrainingShared.css';

const LEVELS = [
  { number: 1, label: 'שלב 1 — תו בודד, מיתר A, פרטים 0-5' },
  { number: 2, label: 'שלב 2 — תו בודד, כל המיתרים, פרטים 0-5' },
  { number: 3, label: 'שלב 3 — 2 תווים, תנועה מדרגית' },
  { number: 4, label: 'שלב 4 — 3 תווים, מעורב' },
  { number: 5, label: 'שלב 5 — פוזיציה 1 (פרטים 0-3), 4 תווים' },
  { number: 6, label: 'שלב 6 — פוזיציה 2 (פרטים 2-5), 5 תווים' },
  { number: 7, label: 'שלב 7 — פוזיציה 5 (פרטים 5-8), 6 תווים' },
];

const ALL_STRINGS = ['E','A','D','G','B','e'];

const FRET_RANGES = {
  '0-5':  { from: 0, to: 5 },
  '0-12': { from: 0, to: 12 },
  'pos1': { from: 0, to: 3 },
  'pos2': { from: 2, to: 5 },
  'pos5': { from: 5, to: 8 },
  'full': { from: 0, to: 24 },
};

const LEVEL_DEFAULTS = {
  1: { strings: ['A'],       fretRange: '0-5',  numNotes: 1, movement: 'steps' },
  2: { strings: ALL_STRINGS, fretRange: '0-5',  numNotes: 1, movement: 'steps' },
  3: { strings: ALL_STRINGS, fretRange: '0-5',  numNotes: 2, movement: 'steps' },
  4: { strings: ALL_STRINGS, fretRange: '0-5',  numNotes: 3, movement: 'mixed' },
  5: { strings: ALL_STRINGS, fretRange: 'pos1', numNotes: 4, movement: 'mixed' },
  6: { strings: ALL_STRINGS, fretRange: 'pos2', numNotes: 5, movement: 'mixed' },
  7: { strings: ALL_STRINGS, fretRange: 'pos5', numNotes: 6, movement: 'mixed' },
};

// AllScalesFretboard uses 1=high e ... 6=low E
// checkNotePosition / melody system uses 0=low E ... 5=high e
const STRING_NAME_TO_NUM = { e: 1, B: 2, G: 3, D: 4, A: 5, E: 6 };
const ALL_CHROMATIC = new Set(['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']);

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

  const [sessionState, setSessionState] = useState(initSession());
  const [feedback, setFeedback]         = useState(null);
  const [done, setDone]                 = useState(false);

  const isPlayingRef = useRef(false);
  const melodyRef    = useRef(null);
  const stateRef     = useRef({});
  stateRef.current   = { level, source, numQuestions, notation };

  const levelDef = LEVEL_DEFAULTS[level] || LEVEL_DEFAULTS[1];

  const buildSettings = () => {
    const lv = stateRef.current.level;
    const def = LEVEL_DEFAULTS[lv] || LEVEL_DEFAULTS[1];
    return {
      source: stateRef.current.source,
      numNotes: def.numNotes,
      octaveRange: 2,
      movement: def.movement,
      availableNotes: { C:true,'C#':true,D:true,'D#':true,E:true,'F':true,'F#':true,G:true,'G#':true,A:true,'A#':true,B:true },
      display: { noteNames: true, dots: true },
      marking: stateRef.current.notation || 'inOrder',
      frets: FRET_RANGES[def.fretRange] || FRET_RANGES['0-5'],
      strings: stringsToMap(def.strings),
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

  const currentSettings = buildSettings();

  const activeStringsSet = useMemo(
    () => new Set(levelDef.strings.map(s => STRING_NAME_TO_NUM[s])),
    [levelDef.strings]
  );

  const markedCellsMap = useMemo(() => {
    const m = new Map();
    sessionState.markedNotes.forEach(n => {
      // legacy string idx (0=low E ... 5=high e) → AllScalesFretboard num (1=high e ... 6=low E)
      const stringNum = 6 - n.string;
      m.set(`${stringNum}-${n.fret}`, { label: n.noteIndices.join(',') });
    });
    return m;
  }, [sessionState.markedNotes]);

  const handleCellClick = useCallback((stringNum, fret) => {
    const oldStringIdx = 6 - stringNum;
    handleFretClick(oldStringIdx, fret);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionState]);

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

      {/* Play button */}
      <div style={{ textAlign: 'center', padding: '12px 8px 8px' }}>
        <button style={audioBtn}
          onClick={() => { if (melodyRef.current) AudioPlayer.playSequence(melodyRef.current.notes.map(n => n.fullNote), 100); }}>
          🔊 נגן מנגינה
        </button>
      </div>

      {sessionState.currentMelody && (
        <NoteIndicator
          totalNotes={sessionState.currentMelody.notes.length}
          currentNoteIndex={sessionState.currentNoteIndex}
          markedNotes={sessionState.markedNotes} />
      )}
      <div style={{ direction: 'ltr' }}>
        <AllScalesFretboard
          activeNoteClasses={ALL_CHROMATIC}
          selectedRoot={null}
          highlightColors={{}}
          fretRangeStart={currentSettings.frets.from}
          fretRangeEnd={currentSettings.frets.to}
          chordOverlays={[]}
          displayMode="notes"
          activeStrings={activeStringsSet}
          onCellClick={handleCellClick}
          markedCells={markedCellsMap}
          disableInactiveStringClicks={true}
          onNoteClick={() => {}}
          onNoteLongPress={() => {}}
          onFretClick={() => {}}
          onStringClick={() => {}}
        />
      </div>
      <FeedbackOverlay state={feedback} />

      <div style={settingsDivider} />

      {/* Controls row — settings at bottom */}
      <div style={ctrlRow}>
        <QuestionsCounter value={numQuestions} onChange={v => { setNumQuestions(v); }} min={3} max={20} />
        <BinaryToggle label="מקור"
          options={[{ value:'random', label:'אקראי' }, { value:'library', label:'ספרייה' }]}
          value={source} onChange={setSource} />
        <BinaryToggle label="סימון"
          options={[{ value:'ordered', label:'בסדר' }, { value:'free', label:'חופשי' }]}
          value={notation} onChange={setNotation} />
      </div>
    </div>
  );
};

const settingsDivider = { borderTop:'1px solid #eee', margin:'8px 24px 0', opacity:0.6 };
const ctrlRow = { display:'flex', flexWrap:'wrap', gap:12, alignItems:'center', padding:'12px 20px', justifyContent:'center' };
const audioBtn = { padding:'10px 24px', borderRadius:10, border:'2px solid var(--color-primary,#4a90e2)', background:'var(--color-primary,#4a90e2)', color:'#fff', fontSize:15, fontWeight:600, cursor:'pointer' };

export default ExerciseG1;
