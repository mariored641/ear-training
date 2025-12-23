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
    statusMessage: '',
    questionResults: [] // Array to track each question: true = first try, false = needed more attempts
  });
  const [waitingForNext, setWaitingForNext] = useState(false);
  const isPlayingRef = React.useRef(false);
  const currentNoteRef = React.useRef(null);
  const currentQuestionAttemptsRef = React.useRef(0); // Track attempts for current question

  // Load new question
  const loadNewQuestion = React.useCallback(() => {
    console.log('=== loadNewQuestion called ===');

    // Stop any currently playing audio first
    AudioPlayer.stop();

    // Reset playing flag to allow new question to play
    isPlayingRef.current = false;

    // Reset attempts counter for new question
    currentQuestionAttemptsRef.current = 0;

    setSessionState(prev => {
      const { noteName, fullNote } = generateRandomNote(
        settings,
        prev.usedNotes
      );

      console.log('New question generated:', noteName, fullNote);

      // Store the note in ref so it doesn't get lost in double rendering
      currentNoteRef.current = {
        noteName,
        fullNote,
        hasPlayedC: prev.hasPlayedCAtStart
      };

      return {
        ...prev,
        correctNote: noteName,
        correctNoteWithOctave: fullNote,
        usedNotes: [...prev.usedNotes, fullNote],
        selectedNote: null,
        isCorrect: null,
        statusMessage: ''
      };
    });

    setWaitingForNext(false);

    // Play audio after state update using the ref
    setTimeout(() => {
      if (currentNoteRef.current) {
        console.log('About to play audio for new question:', currentNoteRef.current.fullNote);
        playQuestionAudio(currentNoteRef.current.hasPlayedC, currentNoteRef.current.fullNote);
      }
    }, 150);
  }, [settings]);

  // Play audio for a question
  const playQuestionAudio = async (hasPlayedC, noteToPlay) => {
    console.log('playQuestionAudio called with:', noteToPlay, 'isPlaying:', isPlayingRef.current);

    // Prevent double playing
    if (isPlayingRef.current) {
      console.log('Already playing, skipping...');
      return;
    }

    isPlayingRef.current = true;

    // Stop any currently playing sounds first
    AudioPlayer.stop();

    await AudioPlayer.init();

    try {
      if (settings.playC === 'everyTime') {
        await AudioPlayer.playNote(REFERENCE_NOTE, 1);
        await new Promise(resolve => setTimeout(resolve, 1100));
        await AudioPlayer.playNote(noteToPlay, 1);
      } else if (settings.playC === 'onceAtStart' && !hasPlayedC) {
        await AudioPlayer.playNote(REFERENCE_NOTE, 1);
        await new Promise(resolve => setTimeout(resolve, 1100));
        await AudioPlayer.playNote(noteToPlay, 1);
        setSessionState(prev => ({ ...prev, hasPlayedCAtStart: true }));
      } else {
        await AudioPlayer.playNote(noteToPlay, 1);
      }
    } finally {
      // Reset flag after playing is done
      setTimeout(() => {
        isPlayingRef.current = false;
      }, 100);
    }
  };

  // Initialize first question
  useEffect(() => {
    // Initialize AudioPlayer first, then load question
    AudioPlayer.setInstrument(settings.instrument || 'piano').then(() => {
      loadNewQuestion();
    });
    // eslint-disable-next-line
  }, []);

  // Update instrument when settings change
  useEffect(() => {
    AudioPlayer.setInstrument(settings.instrument || 'piano');
  }, [settings.instrument]);

  const handlePlayC = () => {
    AudioPlayer.stop();
    AudioPlayer.playNote(REFERENCE_NOTE, 1);
  };

  const handlePlayNote = () => {
    if (sessionState.correctNoteWithOctave) {
      AudioPlayer.stop();
      AudioPlayer.playNote(sessionState.correctNoteWithOctave, 1);
    }
  };

  const handleNoteSelect = async (note) => {
    if (waitingForNext) return;

    const isCorrect = note === sessionState.correctNote;

    // Increment attempts for this question
    currentQuestionAttemptsRef.current += 1;

    if (isCorrect) {
      // Correct answer - check if this was first attempt
      const isFirstTry = currentQuestionAttemptsRef.current === 1;

      setSessionState(prev => ({
        ...prev,
        selectedNote: note,
        isCorrect,
        statusMessage: 'Correct! ✅',
        questionResults: [...prev.questionResults, isFirstTry]
      }));

      setWaitingForNext(true);

      // Wait 1 second then move to next
      setTimeout(() => {
        setSessionState(prev => {
          if (prev.currentQuestion >= settings.numQuestions) {
            // Exercise complete
            return { ...prev, isComplete: true };
          } else if (settings.transition === 'auto') {
            // Auto transition - increment question number
            setTimeout(() => loadNewQuestion(), 100);
            return {
              ...prev,
              currentQuestion: prev.currentQuestion + 1
            };
          } else {
            // Manual transition - show next button
            return prev;
          }
        });
      }, 1000);
    } else {
      // Incorrect answer - just show the error visually
      setSessionState(prev => ({
        ...prev,
        selectedNote: note,
        isCorrect
      }));

      // Flash red for 0.5s then reset
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
    currentQuestionAttemptsRef.current = 0;
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
      statusMessage: '',
      questionResults: []
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
    // Calculate stats from questionResults array
    const totalQuestions = sessionState.questionResults.length;
    const correctFirstTry = sessionState.questionResults.filter(result => result === true).length;

    return (
      <SummaryScreen
        totalQuestions={totalQuestions}
        correctFirstTry={correctFirstTry}
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
