import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import HarmonicAudioPlayer from '../../utils/HarmonicAudioPlayer';
import Header from '../common/Header';
import Settings4BPanel from './Settings4BPanel';
import {
  DEFAULT_SETTINGS_4B,
  PROGRESSION_LIBRARY,
  CHORD_DEFINITIONS,
  getChordTones
} from '../../constants/harmonicDefaults';
import './Exercise4B.css';

const Exercise4B = () => {
  const navigate = useNavigate();
  const isMountedRef = useRef(true);

  // Settings
  const [settings, setSettings] = useState(DEFAULT_SETTINGS_4B);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Session state
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [currentMelody, setCurrentMelody] = useState(null);
  const [identifiedPositions, setIdentifiedPositions] = useState({}); // { position: { correct, attempts, timestamp, noteName } }
  const [columnStatus, setColumnStatus] = useState({}); // { chordIndex: 'active' | 'completed' }
  const [correctFirstTry, setCorrectFirstTry] = useState(0);
  const [correctSecondTry, setCorrectSecondTry] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isPlayingMelody, setIsPlayingMelody] = useState(false);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [flashingButton, setFlashingButton] = useState(null); // { chordIndex, rowIndex, noteName }

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

  const generateMelody = useCallback(() => {
    // Get progression from library
    const progression = PROGRESSION_LIBRARY.find(p => p.id === settings.progressionId);
    if (!progression) {
      console.error('Progression not found');
      return null;
    }

    const melody = {
      progression: progression.chords,
      notesPerChord: [], // Array of note counts per chord
      notes: [], // Flat array of all notes with position metadata
      totalNotes: 0
    };

    let position = 1; // 1-indexed position in melody

    // Generate notes for each chord
    progression.chords.forEach((chordName, chordIndex) => {
      const chordTones = getChordTones(chordName);
      const numNotes = settings.notesPerChord;

      melody.notesPerChord.push(numNotes);

      for (let rowIndex = 0; rowIndex < numNotes; rowIndex++) {
        // Select random chord tone
        const tone = chordTones[Math.floor(Math.random() * chordTones.length)];

        // Select random octave within range
        const baseOctave = 4;
        const octave = baseOctave + Math.floor(Math.random() * settings.octaveRange);

        const noteWithOctave = `${tone}${octave}`;

        melody.notes.push({
          melodyPosition: position,
          chordIndex: chordIndex,
          chordName: chordName,
          rowInChord: rowIndex + 1, // 1-indexed
          note: noteWithOctave,
          noteName: tone,
          chordTones: chordTones
        });

        position++;
      }

      melody.totalNotes += numNotes;
    });

    return melody;
  }, [settings.progressionId, settings.notesPerChord, settings.octaveRange]);

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const playMelody = useCallback(async (melody) => {
    if (!melody) return;

    setIsPlayingMelody(true);
    const noteDuration = 0.5; // 500ms per note (120 BPM)

    // Play notes in melody order
    for (let i = 0; i < melody.notes.length; i++) {
      const noteData = melody.notes[i];
      let note = noteData.note;
      const chordName = noteData.chordName;

      // Play chord together with the first note of each chord section
      if (noteData.rowInChord === 1 && CHORD_DEFINITIONS[chordName]) {
        const chordNotes = CHORD_DEFINITIONS[chordName];

        // Always play chord with piano in lower octave
        const lowerChord = chordNotes.map(n => n.replace('4', '3').replace('5', '4'));
        HarmonicAudioPlayer.playChord(lowerChord, noteDuration * 2, 'strummed', undefined, true);

        // If using piano for melody, adjust octave to avoid overlap
        if (settings.instrument === 'piano') {
          note = HarmonicAudioPlayer.adjustOctaveForSeparation(note, lowerChord);
        }
      }

      // Play melody note with selected instrument (guitar or piano)
      HarmonicAudioPlayer.playMelodyNote(note, noteDuration);
      await delay(noteDuration * 1000);
    }

    setIsPlayingMelody(false);
  }, [settings.instrument]);

  const generateNewQuestion = useCallback(async () => {
    console.log('[Exercise4B] generateNewQuestion called');
    if (!isMountedRef.current) {
      console.log('[Exercise4B] Component not mounted, aborting');
      return;
    }

    // Reset state (but keep session statistics)
    setIdentifiedPositions({});
    setColumnStatus({});
    setFeedbackMessage('');
    setFlashingButton(null);

    // Generate melody with position-based structure
    console.log('[Exercise4B] Generating melody...');
    const melody = generateMelody();
    console.log('[Exercise4B] Melody generated:', melody);
    setCurrentMelody(melody);

    // Play melody automatically
    if (!isMountedRef.current) return;
    await delay(500);
    if (!isMountedRef.current) return;
    console.log('[Exercise4B] About to play melody');
    await playMelody(melody);
  }, [generateMelody, playMelody]);

  // Start new question
  useEffect(() => {
    if (!isComplete && isAudioReady) {
      generateNewQuestion();
    }
  }, [currentQuestion, isAudioReady, isComplete, generateNewQuestion]);

  const calculatePosition = (chordIndex, rowIndex) => {
    let position = 0;

    // Add notes from all previous chords
    for (let i = 0; i < chordIndex; i++) {
      position += currentMelody.notesPerChord[i];
    }

    // Add current row (rowIndex is 0-based, but we need 1-based position)
    position += (rowIndex + 1);

    return position;
  };

  const handleNoteClick = async (chordIndex, rowIndex, clickedNoteName) => {
    if (!currentMelody) return;

    // Calculate position in melody
    const position = calculatePosition(chordIndex, rowIndex);

    // Check if already identified
    if (identifiedPositions[position]?.correct) {
      return; // Already correctly identified
    }

    // Get the correct note at this position
    const noteData = currentMelody.notes[position - 1]; // Array is 0-indexed
    const correctNoteName = noteData.noteName;

    // Update column status to active
    setColumnStatus(prev => ({
      ...prev,
      [chordIndex]: 'active'
    }));

    if (clickedNoteName === correctNoteName) {
      // CORRECT!
      const previousAttempts = identifiedPositions[position]?.attempts || 0;
      const isFirstAttemptForThisPosition = previousAttempts === 0;

      const updatedPositions = {
        ...identifiedPositions,
        [position]: {
          correct: true,
          attempts: previousAttempts + 1,
          timestamp: Date.now(),
          noteName: clickedNoteName
        }
      };

      setIdentifiedPositions(updatedPositions);
      setTotalAttempts(totalAttempts + 1);

      if (isFirstAttemptForThisPosition) {
        setCorrectFirstTry(correctFirstTry + 1);
      } else if (previousAttempts === 1) {
        // Second attempt success
        setCorrectSecondTry(correctSecondTry + 1);
      }

      // Play confirmation sound with melody instrument
      let confirmNote = noteData.note;

      // If using piano, adjust octave to match what was played
      if (settings.instrument === 'piano' && noteData.rowInChord === 1) {
        const chordNotes = CHORD_DEFINITIONS[noteData.chordName];
        const lowerChord = chordNotes.map(n => n.replace('4', '3').replace('5', '4'));
        confirmNote = HarmonicAudioPlayer.adjustOctaveForSeparation(confirmNote, lowerChord);
      }

      HarmonicAudioPlayer.playMelodyNote(confirmNote, 0.5);

      // Check if entire chord column is complete
      checkColumnCompletion(chordIndex, updatedPositions);

      // Check if entire melody is complete
      checkMelodyCompletion(updatedPositions);

    } else {
      // INCORRECT - flash red
      setFlashingButton({ chordIndex, rowIndex, noteName: clickedNoteName });
      setTotalAttempts(totalAttempts + 1);

      setIdentifiedPositions(prev => ({
        ...prev,
        [position]: {
          correct: false,
          attempts: (prev[position]?.attempts || 0) + 1,
          timestamp: Date.now(),
          noteName: null
        }
      }));

      // Remove flash after 500ms
      await delay(500);
      setFlashingButton(null);
    }
  };

  const checkColumnCompletion = (chordIndex, currentIdentifiedPositions) => {
    const numNotesInChord = currentMelody.notesPerChord[chordIndex];

    // Calculate which positions belong to this chord
    let startPosition = 1;
    for (let i = 0; i < chordIndex; i++) {
      startPosition += currentMelody.notesPerChord[i];
    }

    // Check if all positions in this chord are correctly identified
    let allCorrect = true;
    for (let i = 0; i < numNotesInChord; i++) {
      const pos = startPosition + i;
      if (!currentIdentifiedPositions[pos]?.correct) {
        allCorrect = false;
        break;
      }
    }

    if (allCorrect) {
      setColumnStatus(prev => ({
        ...prev,
        [chordIndex]: 'completed'
      }));
    }
  };

  const checkMelodyCompletion = (currentIdentifiedPositions) => {
    // Check if all positions are correctly identified
    const totalNotes = currentMelody.totalNotes;
    const correctCount = Object.values(currentIdentifiedPositions).filter(p => p.correct).length;

    if (correctCount === totalNotes) {
      // All notes identified!
      setTimeout(() => {
        handleMelodyComplete();
      }, 300);
    }
  };

  const handleMelodyComplete = async () => {
    setFeedbackMessage('Excellent! 🎉');
    await delay(1500);

    if (currentQuestion >= settings.numQuestions) {
      setIsComplete(true);
    } else {
      // Always manual transition for this exercise
      setFeedbackMessage('Complete! Click Next to continue');
    }
  };

  const handlePlayMelody = () => {
    if (currentMelody) {
      playMelody(currentMelody);
    }
  };

  const handleNext = () => {
    if (currentQuestion < settings.numQuestions) {
      setCurrentQuestion(currentQuestion + 1);
      setFeedbackMessage('');
    }
  };

  const handleStop = () => {
    HarmonicAudioPlayer.stop();
    navigate('/category/harmonic');
  };

  const handleSettingsChange = async (newSettings) => {
    // Save settings but don't apply them yet (only after reset)
    setSettings(newSettings);
  };

  const handleReset = async () => {
    // Apply any instrument changes when resetting
    if (settings.instrument !== HarmonicAudioPlayer.instrument) {
      await HarmonicAudioPlayer.setInstrument(settings.instrument);
    }

    setCurrentQuestion(1);
    setCorrectFirstTry(0);
    setCorrectSecondTry(0);
    setTotalAttempts(0);
    setIsComplete(false);
    setIsSettingsOpen(false);
  };

  // Get max notes per chord for table layout
  const maxNotesPerChord = currentMelody
    ? Math.max(...currentMelody.notesPerChord)
    : settings.notesPerChord;

  // Summary screen
  if (isComplete) {
    const totalNotesIdentified = correctFirstTry + correctSecondTry;
    const notesRequiringMoreAttempts = totalAttempts - correctFirstTry - correctSecondTry;

    return (
      <div className="exercise-container">
        <div className="summary-screen">
          <h1 className="summary-title">Completed! 🎉</h1>

          <div className="summary-content">
            <h2>Chord Tone Melodies</h2>

            <div className="summary-stats">
              <p>Completed {settings.numQuestions} melodies</p>
              <p className="stat-highlight">{correctFirstTry} notes correct on first try</p>
              {notesRequiringMoreAttempts > 0 && (
                <p>{notesRequiringMoreAttempts} notes required additional attempts</p>
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
    <div className="exercise-container exercise4b">
      <Header
        title="Exercise 4B: Chord Tone Melodies"
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

      {/* Playback button */}
      <div className="playback-controls">
        <button
          className="play-btn primary"
          onClick={handlePlayMelody}
          disabled={isPlayingMelody}
        >
          🔊 {isPlayingMelody ? 'Playing...' : 'Play Melody'}
        </button>
      </div>

      {/* Progression display */}
      {currentMelody && (
        <>
          <div className="progression-display">
            <span className="progression-label">Progression:</span>
            {currentMelody.progression.map((chord, idx) => (
              <span key={idx} className="chord-badge">
                {chord}
                {idx < currentMelody.progression.length - 1 && ' → '}
              </span>
            ))}
          </div>

          {feedbackMessage && (
            <div className={`feedback-message ${feedbackMessage.includes('Excellent') ? 'success' : ''}`}>
              {feedbackMessage}
            </div>
          )}

          {/* CHORD TONE TABLE - Main UI */}
          <div className="chord-tone-table-container">
            <div className="table-instructions">
              Numbers ①②③④⑤⑥⑦⑧⑨⑩⑪⑫ show the actual order of notes in melody
            </div>

            <table className="chord-tone-table">
              <thead>
                <tr>
                  <th className="row-label-header"></th>
                  {currentMelody.progression.map((chordName, chordIndex) => {
                    const status = columnStatus[chordIndex];
                    const numNotes = currentMelody.notesPerChord[chordIndex];

                    return (
                      <th key={chordIndex} className={`chord-column-header ${status || ''}`}>
                        <div className="chord-header-content">
                          <div className="chord-name-row">
                            {status === 'completed' && <span className="status-icon green">🟢 ✓</span>}
                            {status === 'active' && <span className="status-icon blue">🔵 ●</span>}
                            <span className="chord-name">{chordName}</span>
                          </div>
                          <div className="note-count">{numNotes} note{numNotes > 1 ? 's' : ''}</div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
                <tr className="available-tones-row">
                  <td className="row-label-header"></td>
                  {currentMelody.progression.map((chordName, chordIndex) => {
                    const chordTones = getChordTones(chordName);
                    return (
                      <td key={chordIndex} className="available-tones">
                        {chordTones.join(' ')}
                      </td>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: maxNotesPerChord }).map((_, rowIndex) => (
                  <tr key={rowIndex}>
                    <td className="row-label">{rowIndex + 1}:</td>
                    {currentMelody.progression.map((chordName, chordIndex) => {
                      const numNotesInChord = currentMelody.notesPerChord[chordIndex];

                      // Check if this cell should be empty (chord has fewer notes than max)
                      if (rowIndex >= numNotesInChord) {
                        return (
                          <td key={chordIndex} className="note-cell empty-cell">
                            <div className="empty-cell-content">-</div>
                          </td>
                        );
                      }

                      const chordTones = getChordTones(chordName);
                      const position = calculatePosition(chordIndex, rowIndex);
                      const positionData = identifiedPositions[position];
                      const isCorrect = positionData?.correct;
                      const isFlashing = flashingButton?.chordIndex === chordIndex &&
                                       flashingButton?.rowIndex === rowIndex;

                      return (
                        <td key={chordIndex} className="note-cell">
                          <div className="note-buttons-group">
                            {chordTones.map((tone, toneIndex) => {
                              const isThisNoteCorrect = isCorrect && positionData.noteName === tone;
                              const isThisNoteFlashing = isFlashing && flashingButton.noteName === tone;

                              return (
                                <button
                                  key={toneIndex}
                                  className={`note-button ${isThisNoteCorrect ? 'correct' : ''} ${isThisNoteFlashing ? 'incorrect-flash' : ''}`}
                                  onClick={() => handleNoteClick(chordIndex, rowIndex, tone)}
                                  disabled={isCorrect}
                                >
                                  {tone}
                                  {isThisNoteCorrect && (
                                    <span className="number-badge">
                                      {getCircledNumber(position)}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Next button - always shown when melody is complete */}
      {feedbackMessage.includes('Next') && (
        <div className="next-button-container">
          <button className="next-btn" onClick={handleNext}>
            Next →
          </button>
        </div>
      )}

      {/* Settings panel */}
      <Settings4BPanel
        isOpen={isSettingsOpen}
        settings={settings}
        onSettingsChange={handleSettingsChange}
        onClose={() => setIsSettingsOpen(false)}
        onReset={handleReset}
      />
    </div>
  );
};

// Helper function to get circled numbers
const getCircledNumber = (num) => {
  const circledNumbers = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫'];
  return circledNumbers[num - 1] || num;
};

export default Exercise4B;
