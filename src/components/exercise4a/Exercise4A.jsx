import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import HarmonicAudioPlayer from '../../utils/HarmonicAudioPlayer';
import Header from '../common/Header';
import ChordButtons from './ChordButtons';
import Settings4APanel from './Settings4APanel';
import LevelStrip from '../common/LevelStrip';
import { classify, changedKeys } from '../../utils/settingsClassifier';
import {
  DEFAULT_SETTINGS_4A,
  CHORD_DEFINITIONS
} from '../../constants/harmonicDefaults';
import './Exercise4A.css';

const Exercise4A = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const levels = [
    { id: 'regular', label: t('legacy.regular') },
    { id: 'custom', label: t('legacy.custom') },
  ];
  const isMountedRef = useRef(true);
  const isPlayingRef = useRef(false);
  const currentQuestionAttemptsRef = useRef(0);

  // Settings
  const [settings, setSettings] = useState(DEFAULT_SETTINGS_4A);
  const [activeLevel, setActiveLevel] = useState('regular');
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

  const resolveVoicing = (preferred) => {
    return preferred === 'mixed'
      ? (Math.random() > 0.5 ? 'strummed' : 'arpeggiated')
      : preferred;
  };

  const playC = async (voicingOverride = null) => {
    const cChord = CHORD_DEFINITIONS['C'];
    const voicing = resolveVoicing(voicingOverride !== null ? voicingOverride : settings.voicing);

    // Stop any previous sounds
    HarmonicAudioPlayer.stop();
    await delay(100);

    isPlayingRef.current = true;
    HarmonicAudioPlayer.playChord(cChord, 1.5, voicing);
    await delay(1600); // Wait for chord to finish
    isPlayingRef.current = false;
  };

  const playCurrentChord = async (chord = correctChord, voicingOverride = null) => {
    if (!chord) return;

    const chordNotes = CHORD_DEFINITIONS[chord];
    const voicing = resolveVoicing(voicingOverride !== null ? voicingOverride : settings.voicing);

    // Stop any previous sounds
    HarmonicAudioPlayer.stop();
    await delay(100);

    isPlayingRef.current = true;
    HarmonicAudioPlayer.playChord(chordNotes, 1.5, voicing);
    await delay(1600); // Wait for chord to finish
    isPlayingRef.current = false;
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
      setFeedbackMessage('correct');

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
          setFeedbackMessage('correctNext');
        }
      }
    } else {
      // Incorrect answer
      setIsCorrect(false);
      setFeedbackMessage('tryAgain');

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
    const changes = changedKeys(settings, newSettings);
    const wasPlaying = isPlayingRef.current;

    setSettings(newSettings);

    // numQuestions conflict → jump to summary
    if (changes.includes('numQuestions') &&
        newSettings.numQuestions < currentQuestion) {
      HarmonicAudioPlayer.stop();
      isPlayingRef.current = false;
      setIsComplete(true);
      return;
    }

    // Apply instrument change to player so next playback uses it
    if (changes.includes('instrument')) {
      await HarmonicAudioPlayer.setInstrument(newSettings.instrument);
    }

    // Live interrupt: instrument or voicing change while a chord is playing
    const liveChanges = changes.filter(k => classify('4a', k) === 'live');
    if (wasPlaying && liveChanges.length > 0 && correctChord) {
      HarmonicAudioPlayer.stop();
      isPlayingRef.current = false;
      // Replay current chord with new voicing
      playCurrentChord(correctChord, newSettings.voicing);
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

  const handleLevelChange = (id) => {
    if (id === activeLevel) return;
    setActiveLevel(id);

    if (id === 'regular') {
      HarmonicAudioPlayer.stop();
      isPlayingRef.current = false;
      setSettings(DEFAULT_SETTINGS_4A);
      handleReset();
    } else if (id === 'custom') {
      setIsSettingsOpen(true);
    }
  };

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Summary screen
  if (isComplete) {
    const neededMoreAttempts = settings.numQuestions - correctFirstTry;

    return (
      <div className="exercise-container">
        <div className="summary-screen">
          <h1 className="summary-title">{t('legacy.completed')}</h1>

          <div className="summary-content">
            <h2>{t('legacy.singleChord')}</h2>

            <div className="summary-stats">
              <p>{t('legacy.completedQuestions', { count: settings.numQuestions })}</p>
              <p className="stat-highlight">{t('legacy.correctFirstTry', { count: correctFirstTry })}</p>
              {neededMoreAttempts > 0 && (
                <p>{t('legacy.requiredAttempts', { count: neededMoreAttempts })}</p>
              )}
            </div>

            <div className="summary-buttons">
              <button className="summary-btn primary" onClick={handleReset}>
                {t('legacy.practiceAgain')}
              </button>
              <button className="summary-btn secondary" onClick={() => navigate('/category/harmonic')}>
                {t('legacy.backToCategory')}
              </button>
              <button className="summary-btn secondary" onClick={() => navigate('/')}>
                {t('legacy.backToHome')}
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
        title={t('legacy.exercise4ATitle')}
        showSettings={true}
        showStop={true}
        onSettingsClick={() => setIsSettingsOpen(true)}
        onStopClick={handleStop}
      />

      {/* Progress bar */}
      <div className="progress-container">
        <div className="progress-text">{t('legacy.questionProgress', { current: currentQuestion, total: settings.numQuestions })}</div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      <LevelStrip
        levels={levels}
        activeId={activeLevel}
        onChange={handleLevelChange}
      />

      {/* Playback buttons */}
      <div className="playback-controls">
        <button className="play-btn" onClick={handlePlayC}>
          🔊 {t('legacy.playC')}
        </button>
        <button className="play-btn primary" onClick={handlePlayChord}>
          🔊 {t('legacy.playChord')}
        </button>
      </div>

      {/* Question */}
      <div className="question-section">
        <h2>{t('legacy.whichChord')}?</h2>
        {feedbackMessage && (
          <div className={`feedback-message ${isCorrect ? 'correct' : 'incorrect'}`}>
            {t(`legacy.feedback.${feedbackMessage}`)}
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
            {t('legacy.next')}
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
