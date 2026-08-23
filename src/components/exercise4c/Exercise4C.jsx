import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import HarmonicAudioPlayer from '../../utils/HarmonicAudioPlayer';
import Header from '../common/Header';
import ChordButtons4C from './ChordButtons4C';
import Settings4CPanel from './Settings4CPanel';
import LevelStrip from '../common/LevelStrip';
import { changedKeys } from '../../utils/settingsClassifier';
import {
  DEFAULT_SETTINGS_4C,
  CHORD_DEFINITIONS,
  getChordTones,
  getChordRoot
} from '../../constants/harmonicDefaults';
import './Exercise4C.css';

const Exercise4C = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const levels = [
    { id: 'regular', label: t('legacy.regular') },
    { id: 'custom', label: t('legacy.custom') },
  ];
  const isMountedRef = useRef(true);

  // Settings
  const [settings, setSettings] = useState(DEFAULT_SETTINGS_4C);
  const settingsRef = useRef(DEFAULT_SETTINGS_4C);
  const [activeLevel, setActiveLevel] = useState('regular');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Session state
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [currentProgression, setCurrentProgression] = useState(null);
  const [currentPositionIndex, setCurrentPositionIndex] = useState(0); // Which position in progression we're identifying
  const [markedChords, setMarkedChords] = useState([]); // Array of { chord, positionNumbers: [1, 2, 3...] }
  const [correctFirstTry, setCorrectFirstTry] = useState(0);
  const [totalIdentifications, setTotalIdentifications] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [positionAttempts, setPositionAttempts] = useState({}); // Track attempts per position

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

    // Reset state
    setCurrentPositionIndex(0);
    setMarkedChords([]);
    setFeedbackMessage('');
    setPositionAttempts({});

    // Generate progression
    const progression = generateProgression();
    setCurrentProgression(progression);

    // Play progression automatically
    if (!isMountedRef.current) return;
    await delay(500);
    if (!isMountedRef.current) return;
    await playProgression(progression);
  };

  const generateProgression = () => {
    // Get list of available chords
    const availableChordList = Object.keys(settings.availableChords).filter(
      chord => settings.availableChords[chord]
    );

    if (availableChordList.length === 0) {
      console.error('No available chords selected');
      return null;
    }

    // Generate random chord sequence
    const chordSequence = [];

    // First chord
    if (settings.startChordMode === 'fixed') {
      // Use fixed start chord
      chordSequence.push(settings.startChord);
    } else {
      // Random start chord
      const randomIndex = Math.floor(Math.random() * availableChordList.length);
      chordSequence.push(availableChordList[randomIndex]);
    }

    // Generate remaining chords randomly
    for (let i = 1; i < settings.progressionLength; i++) {
      const randomIndex = Math.floor(Math.random() * availableChordList.length);
      chordSequence.push(availableChordList[randomIndex]);
    }

    // Convert chord sequence to progression with bass notes
    const progression = chordSequence.map((chord) => {
      const chordNotes = CHORD_DEFINITIONS[chord];
      let bassNote;

      if (settings.inversions === 'no') {
        // Bass = root
        const root = getChordRoot(chord);
        bassNote = `${root}2`; // Lower octave for bass
      } else {
        // Bass can be any chord tone
        const chordTones = getChordTones(chord);
        const randomTone = chordTones[Math.floor(Math.random() * chordTones.length)];
        bassNote = `${randomTone}2`;
      }

      return {
        chord: chord,
        chordNotes: chordNotes,
        bassNote: bassNote
      };
    });

    return progression;
  };

  const playProgression = async (progression = currentProgression) => {
    if (!progression) return;

    const chordDuration = 2.0; // 2 seconds per chord

    for (let i = 0; i < progression.length; i++) {
      const { chordNotes, bassNote } = progression[i];

      // Read voicing per-iteration so live changes apply softly from next chord onwards
      const currentVoicingPref = settingsRef.current.voicing;
      const voicing = currentVoicingPref === 'mixed'
        ? (Math.random() > 0.5 ? 'strummed' : 'arpeggiated')
        : currentVoicingPref;

      // Play bass and chord together
      HarmonicAudioPlayer.playNote(bassNote, chordDuration);
      HarmonicAudioPlayer.playChord(chordNotes, chordDuration, voicing);

      await delay(chordDuration * 1000 + 200); // Chord duration + gap
    }
  };

  const handleChordSelect = async (selectedChord) => {
    if (currentPositionIndex >= currentProgression.length) return;

    const correctChord = currentProgression[currentPositionIndex].chord;
    const positionNumber = currentPositionIndex + 1; // 1-based numbering

    // Track attempts for this position
    const isFirstTry = !positionAttempts[currentPositionIndex];
    setPositionAttempts(prev => ({
      ...prev,
      [currentPositionIndex]: (prev[currentPositionIndex] || 0) + 1
    }));

    if (selectedChord === correctChord) {
      // CORRECT!
      if (isFirstTry) {
        setCorrectFirstTry(correctFirstTry + 1);
      }
      setTotalIdentifications(totalIdentifications + 1);

      // Play chord as confirmation
      HarmonicAudioPlayer.playChord(
        currentProgression[currentPositionIndex].chordNotes,
        1.5,
        settings.voicing === 'mixed'
          ? (Math.random() > 0.5 ? 'strummed' : 'arpeggiated')
          : settings.voicing
      );

      // Check if this chord already has marks
      const existingChord = markedChords.find(m => m.chord === selectedChord);
      let newMarkedChords;

      if (existingChord) {
        // Add position number to existing chord
        newMarkedChords = markedChords.map(m =>
          m.chord === selectedChord
            ? { ...m, positionNumbers: [...m.positionNumbers, positionNumber] }
            : m
        );
      } else {
        // Create new marked chord
        newMarkedChords = [
          ...markedChords,
          {
            chord: selectedChord,
            positionNumbers: [positionNumber]
          }
        ];
      }

      setMarkedChords(newMarkedChords);

      // Move to next position or finish
      if (currentPositionIndex === currentProgression.length - 1) {
        // Progression complete!
        setFeedbackMessage('excellent');
        await delay(1000);

        if (currentQuestion >= settings.numQuestions) {
          setIsComplete(true);
        } else {
          if (settings.transition === 'auto') {
            setCurrentQuestion(currentQuestion + 1);
          } else {
            setFeedbackMessage('completeNext');
          }
        }
      } else {
        // Move to next chord
        setCurrentPositionIndex(currentPositionIndex + 1);
      }
    } else {
      // INCORRECT
      setFeedbackMessage('tryAgain');
      await delay(500);
      setFeedbackMessage('');
    }
  };

  const handlePlayProgression = () => {
    HarmonicAudioPlayer.stop();
    playProgression();
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

    // Sync ref FIRST so in-flight playProgression loop picks up new voicing/instrument
    settingsRef.current = newSettings;
    setSettings(newSettings);

    // numQuestions conflict → jump to summary
    if (changes.includes('numQuestions') &&
        newSettings.numQuestions < currentQuestion) {
      HarmonicAudioPlayer.stop();
      setIsComplete(true);
      return;
    }

    // Apply instrument change to player (soft swap — next chord uses it via settingsRef)
    if (changes.includes('instrument')) {
      await HarmonicAudioPlayer.setInstrument(newSettings.instrument);
    }
  };

  const handleReset = async () => {
    setCurrentQuestion(1);
    setCorrectFirstTry(0);
    setTotalIdentifications(0);
    setIsComplete(false);
    setIsSettingsOpen(false);

    // Force new question generation with updated settings
    setTimeout(() => {
      if (isMountedRef.current) {
        generateNewQuestion();
      }
    }, 100);
  };

  const handleLevelChange = (id) => {
    if (id === activeLevel) return;
    setActiveLevel(id);

    if (id === 'regular') {
      HarmonicAudioPlayer.stop();
      settingsRef.current = DEFAULT_SETTINGS_4C;
      setSettings(DEFAULT_SETTINGS_4C);
      handleReset();
    } else if (id === 'custom') {
      setIsSettingsOpen(true);
    }
  };

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Summary screen
  if (isComplete) {
    const neededHelp = totalIdentifications - correctFirstTry;

    return (
      <div className="exercise-container">
        <div className="summary-screen">
          <h1 className="summary-title">{t('legacy.completed')}</h1>

          <div className="summary-content">
            <h2>{t('legacy.progressionsBass')}</h2>
            <h3>({settings.inversions === 'with' ? t('legacy.withInversions') : t('legacy.withoutInversions')})</h3>

            <div className="summary-stats">
              <p>{t('legacy.completedProgressions', { count: settings.numQuestions })}</p>
              {settings.inversions === 'with' && (
                <>
                  <p>{t('legacy.totalIdentifications', { count: totalIdentifications })}</p>
                  <p className="stat-small">{t('legacy.chordsAndBass', { chords: Math.floor(totalIdentifications / 2), bass: Math.ceil(totalIdentifications / 2) })}</p>
                </>
              )}
              {settings.inversions === 'no' && (
                <p>{t('legacy.totalChords', { count: totalIdentifications })}</p>
              )}
              <p className="stat-highlight">{t('legacy.correctFirstTry', { count: correctFirstTry })}</p>
              {neededHelp > 0 && (
                <p>{t('legacy.requiredAttempts', { count: neededHelp })}</p>
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
    <div className="exercise-container exercise4c">
      <Header
        title={t('legacy.exercise4CTitle')}
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
        <button className="play-btn primary" onClick={handlePlayProgression}>
          🔊 {t('legacy.playProgression')}
        </button>
      </div>

      {/* Question */}
      <div className="question-section">
        <h2>{t('legacy.identifyProgression')}:</h2>
        <p className="progression-hint">
          {t('legacy.progressionLengthValue', { count: settings.progressionLength })}
          {currentPositionIndex < settings.progressionLength && (
            <span> • {t('legacy.identifyingChord', { current: currentPositionIndex + 1, total: settings.progressionLength })}</span>
          )}
        </p>
        {feedbackMessage && (
          <div className={`feedback-message ${feedbackMessage === 'tryAgain' ? 'incorrect' : 'correct'}`}>
            {t(`legacy.feedback.${feedbackMessage}`)}
          </div>
        )}
      </div>

      {/* Chord selection buttons */}
      <ChordButtons4C
        availableChords={settings.availableChords}
        markedChords={markedChords}
        onChordSelect={handleChordSelect}
      />

      {/* Next button for manual transition */}
      {settings.transition === 'manual' && feedbackMessage === 'completeNext' && (
        <div className="next-button-container">
          <button className="next-btn" onClick={handleNext}>
            {t('legacy.next')}
          </button>
        </div>
      )}

      {/* Settings panel */}
      <Settings4CPanel
        isOpen={isSettingsOpen}
        settings={settings}
        onSettingsChange={handleSettingsChange}
        onClose={() => setIsSettingsOpen(false)}
        onReset={handleReset}
      />
    </div>
  );
};

export default Exercise4C;
