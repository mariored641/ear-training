import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import HarmonicAudioPlayer from '../../utils/HarmonicAudioPlayer';
import Header from '../common/Header';
import ChordButtons from './ChordButtons';
import Settings4APanel from './Settings4APanel';
import {
  DEFAULT_SETTINGS_4A,
  CHORD_DEFINITIONS
} from '../../constants/harmonicDefaults';
import './Exercise4A.css';

const Exercise4A = () => {
  const navigate = useNavigate();
  const isMountedRef = useRef(true);
  const currentQuestionAttemptsRef = useRef(0);

  // Settings
  const [settings, setSettings] = useState(DEFAULT_SETTINGS_4A);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Session state
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [correctChord, setCorrectChord] = useState(null);
  const [usedChords, setUsedChords] = useState([]);
  const [selectedChord, setSelectedChord] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [correctFirstTry, setCorrectFirstTry] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [hasPlayedCAtStart, setHasPlayedCAtStart] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isAudioReady, setIsAudioReady] = useState(false);

  // Initialize audio on mount
  useEffect(() => {
    isMountedRef.current = true;

    const initAudio = async () => {
      await HarmonicAudioPlayer.init();
      await HarmonicAudioPlayer.setInstrument(settings.instrument);
      if (isMountedRef.current) {
        setIsAudioReady(true);
      }
    };
    initAudio();

    return () => {
      isMountedRef.current = false;
      HarmonicAudioPlayer.stop();
    };
  }, []);

  // Start new question
  useEffect(() => {
    if (!isComplete && isAudioReady) {
      generateNewQuestion();
    }
  }, [currentQuestion, isAudioReady]);

  const generateNewQuestion = async () => {
    if (!isMountedRef.current) return;

    // Reset UI state and attempts counter
    setSelectedChord(null);
    setIsCorrect(null);
    setFeedbackMessage('');
    currentQuestionAttemptsRef.current = 0;

    // Get available chords
    const available = Object.keys(settings.availableChords)
      .filter(chord => settings.availableChords[chord]);

    // Filter out last used chord to avoid repetition
    const lastChord = usedChords[usedChords.length - 1];
    const candidates = available.filter(chord => chord !== lastChord);

    // Select random chord
    const randomChord = candidates[Math.floor(Math.random() * candidates.length)];
    setCorrectChord(randomChord);
    setUsedChords([...usedChords, randomChord]);

    // Play C reference if needed
    if (settings.playC === 'everyTime') {
      if (!isMountedRef.current) return;
      await playC();
      if (!isMountedRef.current) return;
      await delay(400); // 400ms pause
      if (!isMountedRef.current) return;
      await playCurrentChord(randomChord);
    } else if (settings.playC === 'onceAtStart' && !hasPlayedCAtStart) {
      if (!isMountedRef.current) return;
      await playC();
      if (!isMountedRef.current) return;
      await delay(400);
      if (!isMountedRef.current) return;
      await playCurrentChord(randomChord);
      setHasPlayedCAtStart(true);
    } else {
      if (!isMountedRef.current) return;
      await playCurrentChord(randomChord);
    }
  };

  const playC = async () => {
    const cChord = CHORD_DEFINITIONS['C'];
    const voicing = settings.voicing === 'mixed'
      ? (Math.random() > 0.5 ? 'strummed' : 'arpeggiated')
      : settings.voicing;

    // Stop any previous sounds
    HarmonicAudioPlayer.stop();
    await delay(100);

    HarmonicAudioPlayer.playChord(cChord, 1.5, voicing);
    await delay(1600); // Wait for chord to finish
  };

  const playCurrentChord = async (chord = correctChord) => {
    if (!chord) return;

    const chordNotes = CHORD_DEFINITIONS[chord];
    const voicing = settings.voicing === 'mixed'
      ? (Math.random() > 0.5 ? 'strummed' : 'arpeggiated')
      : settings.voicing;

    // Stop any previous sounds
    HarmonicAudioPlayer.stop();
    await delay(100);

    HarmonicAudioPlayer.playChord(chordNotes, 1.5, voicing);
    await delay(1600); // Wait for chord to finish
  };

  const handlePlayC = () => {
    playC();
  };

  const handlePlayChord = () => {
    playCurrentChord();
  };

  const handleChordSelect = async (chord) => {
    if (isCorrect) return; // Already answered correctly

    setSelectedChord(chord);
    currentQuestionAttemptsRef.current += 1;

    if (chord === correctChord) {
      // Correct answer!
      setIsCorrect(true);
      setFeedbackMessage('Correct! ✅');

      // Record if first try
      const isFirstTry = currentQuestionAttemptsRef.current === 1;
      if (isFirstTry) {
        setCorrectFirstTry(correctFirstTry + 1);
      }

      // Play chord again as confirmation
      await playCurrentChord(chord);
      await delay(1000);

      // Move to next question or finish
      if (currentQuestion >= settings.numQuestions) {
        setIsComplete(true);
      } else {
        if (settings.transition === 'auto') {
          setCurrentQuestion(currentQuestion + 1);
        } else {
          setFeedbackMessage('Correct! ✅ Click Next to continue');
        }
      }
    } else {
      // Incorrect answer
      setIsCorrect(false);
      setFeedbackMessage('Try again');

      // Flash red and reset
      await delay(500);
      setSelectedChord(null);
      setIsCorrect(null);
      setFeedbackMessage('');
    }
  };

  const handleNext = () => {
    if (currentQuestion < settings.numQuestions) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handleStop = () => {
    HarmonicAudioPlayer.stop();
    navigate('/category/harmonic');
  };

  const handleSettingsChange = async (newSettings) => {
    setSettings(newSettings);

    // Update instrument if changed
    if (newSettings.instrument !== settings.instrument) {
      await HarmonicAudioPlayer.setInstrument(newSettings.instrument);
    }
  };

  const handleReset = () => {
    setCurrentQuestion(1);
    setUsedChords([]);
    setCorrectFirstTry(0);
    setIsComplete(false);
    setHasPlayedCAtStart(false);
    setIsSettingsOpen(false);
    currentQuestionAttemptsRef.current = 0;

    // Force new question generation with updated settings
    setTimeout(() => {
      generateNewQuestion();
    }, 0);
  };

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Summary screen
  if (isComplete) {
    const neededMoreAttempts = settings.numQuestions - correctFirstTry;

    return (
      <div className="exercise-container">
        <div className="summary-screen">
          <h1 className="summary-title">Completed! 🎉</h1>

          <div className="summary-content">
            <h2>Single Chord Recognition</h2>

            <div className="summary-stats">
              <p>Completed {settings.numQuestions} questions</p>
              <p className="stat-highlight">{correctFirstTry} correct on first try</p>
              {neededMoreAttempts > 0 && (
                <p>{neededMoreAttempts} required additional attempts</p>
              )}
            </div>

            <div className="summary-buttons">
              <button className="summary-btn primary" onClick={handleReset}>
                Practice Again
              </button>
              <button className="summary-btn secondary" onClick={() => navigate('/category/harmonic')}>
                Back to Category
              </button>
              <button className="summary-btn secondary" onClick={() => navigate('/')}>
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const progress = (currentQuestion / settings.numQuestions) * 100;

  return (
    <div className="exercise-container exercise4a">
      <Header
        title="Exercise 4A: Single Chord Recognition"
        showSettings={true}
        showStop={true}
        onSettingsClick={() => setIsSettingsOpen(true)}
        onStopClick={handleStop}
      />

      {/* Progress bar */}
      <div className="progress-container">
        <div className="progress-text">Question {currentQuestion}/{settings.numQuestions}</div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      {/* Playback buttons */}
      <div className="playback-controls">
        <button className="play-btn" onClick={handlePlayC}>
          🔊 Play C
        </button>
        <button className="play-btn primary" onClick={handlePlayChord}>
          🔊 Play Chord
        </button>
      </div>

      {/* Question */}
      <div className="question-section">
        <h2>Which chord did you hear?</h2>
        {feedbackMessage && (
          <div className={`feedback-message ${isCorrect ? 'correct' : 'incorrect'}`}>
            {feedbackMessage}
          </div>
        )}
      </div>

      {/* Chord selection buttons */}
      <ChordButtons
        availableChords={settings.availableChords}
        selectedChord={selectedChord}
        isCorrect={isCorrect}
        onChordSelect={handleChordSelect}
      />

      {/* Next button for manual transition */}
      {settings.transition === 'manual' && isCorrect && currentQuestion < settings.numQuestions && (
        <div className="next-button-container">
          <button className="next-btn" onClick={handleNext}>
            Next →
          </button>
        </div>
      )}

      {/* Settings panel */}
      <Settings4APanel
        isOpen={isSettingsOpen}
        settings={settings}
        onSettingsChange={handleSettingsChange}
        onClose={() => setIsSettingsOpen(false)}
        onReset={handleReset}
      />
    </div>
  );
};

export default Exercise4A;
