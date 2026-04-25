import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import EarTrainingHeader from '../shared/EarTrainingHeader';
import FeedbackOverlay from '../shared/FeedbackOverlay';
import SessionSummary from '../shared/SessionSummary';
import { loadStoredLevel } from '../shared/LevelNavigator';
import Fretboard from '../../exercise2/Fretboard';
import NoteIndicator from '../../exercise2/NoteIndicator';
import AudioPlayer from '../../../utils/AudioPlayer';
import { getMelody } from '../../../utils/melodyGeneration';
import { checkNotePosition } from '../../../utils/fretboardCalculations';
import '../shared/earTrainingShared.css';

const LEVELS = [
  { number: 1, label: 'שלב 1 — מיתר E2, פרטים 0-5' },
  { number: 2, label: 'שלב 2 — מיתרים E2+A2, פרטים 0-5' },
  { number: 3, label: 'שלב 3 — 4 מיתרים תחתונים, פרטים 0-5' },
  { number: 4, label: 'שלב 4 — כל המיתרים, פרטים 0-5' },
  { number: 5, label: 'שלב 5 — כל המיתרים, פרטים 0-12' },
  { number: 6, label: 'שלב 6 — כל המיתרים, פרטים 0-17' },
  { number: 7, label: 'שלב 7 — כל המיתרים, כל הצוואר (0-24)' },
];

const LEVEL_CONFIG = {
  1: { frets: { from: 0, to: 5 },  strings: { E: true,  A: false, D: false, G: false, B: false, e: false } },
  2: { frets: { from: 0, to: 5 },  strings: { E: true,  A: true,  D: false, G: false, B: false, e: false } },
  3: { frets: { from: 0, to: 5 },  strings: { E: true,  A: true,  D: true,  G: true,  B: false, e: false } },
  4: { frets: { from: 0, to: 5 },  strings: { E: true,  A: true,  D: true,  G: true,  B: true,  e: true  } },
  5: { frets: { from: 0, to: 12 }, strings: { E: true,  A: true,  D: true,  G: true,  B: true,  e: true  } },
  6: { frets: { from: 0, to: 17 }, strings: { E: true,  A: true,  D: true,  G: true,  B: true,  e: true  } },
  7: { frets: { from: 0, to: 24 }, strings: { E: true,  A: true,  D: true,  G: true,  B: true,  e: true  } },
};

const baseSettings = {
  source: 'random', numNotes: 2, octaveRange: 2, movement: 'steps',
  availableNotes: { C:true,'C#':true,D:true,'D#':true,E:true,F:true,'F#':true,G:true,'G#':true,A:true,'A#':true,B:true },
  display: { noteNames: true, dots: true }, marking: 'inOrder',
  help: { enabled: true, afterAttempts: 3 }, transition: 'auto',
  numQuestions: 10, instrument: 'guitar'
};

const ExerciseG1 = () => {
  const navigate = useNavigate();
  const storageKey = 'ear-training:G1:level';
  const [level, setLevel] = useState(() => loadStoredLevel(storageKey, 1));
  const [numQuestions] = useState(10);
  const [sessionState, setSessionState] = useState(initSession());
  const [feedback, setFeedback] = useState(null);
  const [done, setDone] = useState(false);
  const isPlayingRef = useRef(false);
  const melodyRef = useRef(null);

  function initSession() {
    return { currentQuestion: 1, currentMelody: null, currentNoteIndex: 0, markedNotes: [], correctFirstTry: 0, totalNotes: 0, highlightedNote: null, noteAttempts: {} };
  }

  const settings = { ...baseSettings, ...LEVEL_CONFIG[level] };

  const loadMelody = useCallback(async (qNum = 1) => {
    try {
      await AudioPlayer.setInstrument('guitar');
      const melody = getMelody('random', settings, qNum - 1);
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
  }, [level]);

  useEffect(() => {
    setDone(false);
    setSessionState(initSession());
    setTimeout(() => loadMelody(1), 100);
  }, [level]);

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
          if (nextQ > numQuestions) { setDone(true); }
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

      <div style={{ textAlign: 'center', padding: '16px 8px' }}>
        <button className="audio-button" style={audioBtn}
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
            fretRange={settings.frets}
            strings={settings.strings}
            showNoteNames={settings.display.noteNames}
            showDots={settings.display.dots}
            markedNotes={sessionState.markedNotes}
            currentNoteIndex={sessionState.currentNoteIndex}
            onFretClick={handleFretClick}
            highlightedNote={sessionState.highlightedNote}
            marking="inOrder"
            selectedNoteIndex={0} />
        </>
      )}
      <FeedbackOverlay state={feedback} />
    </div>
  );
};

const audioBtn = {
  padding: '10px 24px', borderRadius: 10,
  border: '2px solid var(--color-primary,#4a90e2)',
  background: 'var(--color-primary,#4a90e2)', color: '#fff',
  fontSize: 15, fontWeight: 600, cursor: 'pointer'
};

export default ExerciseG1;
