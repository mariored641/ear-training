import React, { useState, useEffect } from 'react';
import Header from '../common/Header';
import ProgressBar from '../common/ProgressBar';
import SettingsPanel from '../common/SettingsPanel';
import SummaryScreen from '../common/SummaryScreen';
import NoteButtons from './NoteButtons';
import Exercise1Settings from './Exercise1Settings';
import AudioPlayer from '../../utils/AudioPlayer';
import Storage from '../../utils/Storage';
import { generateRandomNote } from '../../utils/noteGeneration';
import { DEFAULT_EXERCISE1_SETTINGS } from '../../constants/defaults';
import { REFERENCE_NOTE } from '../../constants/notes';
import './Exercise1.css';

const Exercise1 = () => {
  const [settings, setSettings] = useState(() =>
    Storage.loadSettings(1, DEFAULT_EXERCISE1_SETTINGS)
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [sessionState, setSessionState] = useState({
    currentQuestion: 1,
    correctNote: null,
    correctNoteWithOctave: null,
    usedNotes: [],
    correctFirstTry: 0,
    totalAttempts: 0,
    isComplete: false,
    hasPlayedCAtStart: false,
    selectedNote: null,
    isCorrect: null,
    statusMessage: ''
  });
  const [waitingForNext, setWaitingForNext] = useState(false);

  // Load new question
  const loadNewQuestion = () => {
    const { noteName, fullNote } = generateRandomNote(
      settings,
      sessionState.usedNotes
    );

    const newState = {
      ...sessionState,
      correctNote: noteName,
      correctNoteWithOctave: fullNote,
      usedNotes: [...sessionState.usedNotes, fullNote],
      selectedNote: null,
      isCorrect: null,
      statusMessage: ''
    };

    setSessionState(newState);
    setWaitingForNext(false);

    // Play audio
    setTimeout(() => {
      playQuestionAudio(newState.hasPlayedCAtStart, fullNote);
    }, 100);
  };

  // Play audio for a question
  const playQuestionAudio = async (hasPlayedC, noteToPlay) => {
    if (settings.playC === 'everyTime') {
      await AudioPlayer.playNote(REFERENCE_NOTE, 1);
      await new Promise(resolve => setTimeout(resolve, 300));
      await AudioPlayer.playNote(noteToPlay, 1);
    } else if (settings.playC === 'onceAtStart' && !hasPlayedC) {
      await AudioPlayer.playNote(REFERENCE_NOTE, 1);
      await new Promise(resolve => setTimeout(resolve, 300));
      await AudioPlayer.playNote(noteToPlay, 1);
      setSessionState(prev => ({ ...prev, hasPlayedCAtStart: true }));
    } else {
      await AudioPlayer.playNote(noteToPlay, 1);
    }
  };

  // Initialize first question
  useEffect(() => {
    loadNewQuestion();
    // eslint-disable-next-line
  }, []);

  const handlePlayC = () => {
    AudioPlayer.playNote(REFERENCE_NOTE, 1);
  };

  const handlePlayNote = () => {
    if (sessionState.correctNoteWithOctave) {
      AudioPlayer.playNote(sessionState.correctNoteWithOctave, 1);
    }
  };

  const handleNoteSelect = async (note) => {
    if (waitingForNext) return;

    const isCorrect = note === sessionState.correctNote;

    setSessionState(prev => ({
      ...prev,
      selectedNote: note,
      isCorrect,
      totalAttempts: prev.totalAttempts + 1
    }));

    if (isCorrect) {
      // Correct answer
      const isFirstTry = sessionState.totalAttempts === sessionState.currentQuestion - 1;

      setSessionState(prev => ({
        ...prev,
        statusMessage: 'Correct! ✅',
        correctFirstTry: isFirstTry ? prev.correctFirstTry + 1 : prev.correctFirstTry
      }));

      setWaitingForNext(true);

      // Wait 1 second then move to next
      setTimeout(() => {
        if (sessionState.currentQuestion >= settings.numQuestions) {
          // Exercise complete
          setSessionState(prev => ({ ...prev, isComplete: true }));
        } else if (settings.transition === 'auto') {
          // Auto transition
          setSessionState(prev => ({
            ...prev,
            currentQuestion: prev.currentQuestion + 1
          }));
          setTimeout(() => loadNewQuestion(), 100);
        } else {
          // Manual transition - show next button
          setWaitingForNext(true);
        }
      }, 1000);
    } else {
      // Incorrect answer - flash red for 0.5s then reset
      setTimeout(() => {
        setSessionState(prev => ({
          ...prev,
          selectedNote: null,
          isCorrect: null
        }));
      }, 500);
    }
  };

  const handleNext = () => {
    if (sessionState.currentQuestion >= settings.numQuestions) {
      setSessionState(prev => ({ ...prev, isComplete: true }));
    } else {
      setSessionState(prev => ({
        ...prev,
        currentQuestion: prev.currentQuestion + 1
      }));
      setTimeout(() => loadNewQuestion(), 100);
    }
  };

  const handleSettingsChange = (newSettings) => {
    setSettings(newSettings);
    Storage.saveSettings(1, newSettings);
  };

  const handleReset = () => {
    setIsSettingsOpen(false);
    setSessionState({
      currentQuestion: 1,
      correctNote: null,
      correctNoteWithOctave: null,
      usedNotes: [],
      correctFirstTry: 0,
      totalAttempts: 0,
      isComplete: false,
      hasPlayedCAtStart: false,
      selectedNote: null,
      isCorrect: null,
      statusMessage: ''
    });
    setTimeout(() => loadNewQuestion(), 100);
  };

  const handleStop = () => {
    setSessionState(prev => ({ ...prev, isComplete: true }));
  };

  const handleRestart = () => {
    handleReset();
  };

  if (sessionState.isComplete) {
    return (
      <SummaryScreen
        totalQuestions={Math.min(sessionState.currentQuestion, settings.numQuestions)}
        correctFirstTry={sessionState.correctFirstTry}
        onRestart={handleRestart}
        itemName="questions"
      />
    );
  }

  return (
    <div className="exercise1">
      <Header
        title="Exercise 1 - Interval Recognition"
        showSettings={true}
        showStop={true}
        currentQuestion={sessionState.currentQuestion}
        totalQuestions={settings.numQuestions}
        onSettingsClick={() => setIsSettingsOpen(true)}
        onStopClick={handleStop}
      />

      <ProgressBar
        current={sessionState.currentQuestion}
        total={settings.numQuestions}
      />

      <div className="exercise1-content">
        <div className="audio-controls">
          <button className="audio-button" onClick={handlePlayC}>
            🔊 Play C
          </button>
          <button className="audio-button" onClick={handlePlayNote}>
            🔊 Play Note
          </button>
        </div>

        <h3 className="exercise1-question">Which note did you hear?</h3>

        {sessionState.statusMessage && (
          <div className="status-message success">
            {sessionState.statusMessage}
          </div>
        )}

        <NoteButtons
          availableNotes={settings.availableNotes}
          selectedNote={sessionState.selectedNote}
          isCorrect={sessionState.isCorrect}
          onNoteSelect={handleNoteSelect}
          disabled={waitingForNext}
        />

        {waitingForNext && settings.transition === 'manual' && (
          <div className="next-button-container">
            <button className="btn btn-primary" onClick={handleNext}>
              Next Question
            </button>
          </div>
        )}
      </div>

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Exercise 1 Settings"
      >
        <Exercise1Settings
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onReset={handleReset}
        />
      </SettingsPanel>
    </div>
  );
};

export default Exercise1;
