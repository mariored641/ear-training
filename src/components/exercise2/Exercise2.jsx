import React, { useState, useEffect } from 'react';
import Header from '../common/Header';
import ProgressBar from '../common/ProgressBar';
import SettingsPanel from '../common/SettingsPanel';
import SummaryScreen from '../common/SummaryScreen';
import Fretboard from './Fretboard';
import NoteIndicator from './NoteIndicator';
import NoteSelector from './NoteSelector';
import Exercise2Settings from './Exercise2Settings';
import AudioPlayer from '../../utils/AudioPlayer';
import Storage from '../../utils/Storage';
import { getMelody } from '../../utils/melodyGeneration';
import { checkNotePosition } from '../../utils/fretboardCalculations';
import { DEFAULT_EXERCISE2_SETTINGS } from '../../constants/defaults';
import './Exercise2.css';

const Exercise2 = () => {
  const [settings, setSettings] = useState(() =>
    Storage.loadSettings(2, DEFAULT_EXERCISE2_SETTINGS)
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [sessionState, setSessionState] = useState({
    currentQuestion: 1,
    currentMelody: null,
    currentNoteIndex: 0,
    selectedNoteIndex: 0, // For free mode
    markedNotes: [],
    correctFirstTry: 0,
    totalNotes: 0,
    isComplete: false,
    highlightedNote: null,
    noteAttempts: {} // Track attempts per note index
  });
  const isPlayingRef = React.useRef(false);
  const currentMelodyRef = React.useRef(null);

  // Load new melody
  const loadNewMelody = React.useCallback((autoPlay = true, questionNumber = null) => {
    try {
      // Use questionNumber if provided, otherwise use current state
      const melodyIndex = questionNumber !== null
        ? questionNumber - 1
        : sessionState.currentQuestion - 1;

      const newMelody = getMelody(
        settings.source,
        settings,
        melodyIndex
      );

      // Store melody in ref to prevent double-playing
      currentMelodyRef.current = newMelody;

      setSessionState(prev => ({
        ...prev,
        currentMelody: newMelody,
        currentNoteIndex: 0,
        selectedNoteIndex: 0,
        markedNotes: [],
        highlightedNote: null,
        noteAttempts: {} // Reset attempts for new melody
      }));

      // Play melody automatically only if autoPlay is true
      if (autoPlay) {
        setTimeout(() => {
          // Only play if not already playing
          if (!isPlayingRef.current && currentMelodyRef.current) {
            isPlayingRef.current = true;
            playMelody(currentMelodyRef.current).finally(() => {
              isPlayingRef.current = false;
            });
          }
        }, 500);
      }
    } catch (error) {
      alert(error.message);
    }
  }, [settings.source, settings, sessionState.currentQuestion]);

  // Initialize first melody
  useEffect(() => {
    // Initialize AudioPlayer first, then load melody
    AudioPlayer.setInstrument(settings.instrument || 'guitar').then(() => {
      loadNewMelody();
    });
    // eslint-disable-next-line
  }, []);

  // Update instrument when settings change
  useEffect(() => {
    AudioPlayer.setInstrument(settings.instrument || 'guitar');
  }, [settings.instrument]);

  // Play the melody
  const playMelody = async (melody) => {
    if (!melody) return;

    const notes = melody.notes.map(note => note.fullNote);

    await AudioPlayer.playSequence(notes, 100, (index) => {
      // Highlight the note if it's marked
      const markedNote = sessionState.markedNotes.find(note =>
        note.noteIndices.includes(index + 1)
      );

      if (markedNote) {
        setSessionState(prev => ({
          ...prev,
          highlightedNote: {
            string: markedNote.string,
            fret: markedNote.fret
          }
        }));

        setTimeout(() => {
          setSessionState(prev => ({ ...prev, highlightedNote: null }));
        }, 1000);
      }
    });
  };

  const handlePlayMelody = () => {
    if (sessionState.currentMelody) {
      playMelody(sessionState.currentMelody);
    }
  };

  const handleFretClick = (string, fret) => {
    const currentNoteIndex =
      settings.marking === 'inOrder'
        ? sessionState.currentNoteIndex
        : sessionState.selectedNoteIndex;

    const correctNote = sessionState.currentMelody.notes[currentNoteIndex];

    if (checkNotePosition(string, fret, correctNote)) {
      // Correct! Mark the note
      AudioPlayer.playNote(correctNote.fullNote, 1);

      // Check if this is first try for this note
      const isFirstTry = !sessionState.noteAttempts[currentNoteIndex];

      // Check if this position already has marks
      const existingNote = sessionState.markedNotes.find(
        note => note.string === string && note.fret === fret
      );

      let newMarkedNotes;
      if (existingNote) {
        // Add this note index to existing position
        newMarkedNotes = sessionState.markedNotes.map(note =>
          note.string === string && note.fret === fret
            ? { ...note, noteIndices: [...note.noteIndices, currentNoteIndex + 1] }
            : note
        );
      } else {
        // Create new marked note
        newMarkedNotes = [
          ...sessionState.markedNotes,
          {
            string,
            fret,
            noteIndices: [currentNoteIndex + 1]
          }
        ];
      }

      setSessionState(prev => ({
        ...prev,
        markedNotes: newMarkedNotes,
        correctFirstTry: isFirstTry ? prev.correctFirstTry + 1 : prev.correctFirstTry,
        totalNotes: prev.totalNotes + 1
      }));

      // Check if all notes are marked
      const allMarked = newMarkedNotes.reduce(
        (sum, note) => sum + note.noteIndices.length,
        0
      ) >= sessionState.currentMelody.notes.length;

      if (allMarked) {
        // Melody complete
        setTimeout(() => {
          if (sessionState.currentQuestion >= settings.numQuestions) {
            setSessionState(prev => ({ ...prev, isComplete: true }));
          } else {
            const nextQuestion = sessionState.currentQuestion + 1;
            setSessionState(prev => ({
              ...prev,
              currentQuestion: nextQuestion
            }));
            setTimeout(() => loadNewMelody(true, nextQuestion), 100);
          }
        }, 1000);
      } else {
        // Move to next note in "inOrder" mode
        if (settings.marking === 'inOrder') {
          setSessionState(prev => ({
            ...prev,
            currentNoteIndex: prev.currentNoteIndex + 1
          }));
        }
      }
    } else {
      // Incorrect - mark that this note had an attempt
      setSessionState(prev => ({
        ...prev,
        noteAttempts: {
          ...prev.noteAttempts,
          [currentNoteIndex]: true
        }
      }));
    }
  };

  const handleNoteSelect = (index) => {
    setSessionState(prev => ({
      ...prev,
      selectedNoteIndex: index
    }));
  };

  const handleSettingsChange = (newSettings) => {
    setSettings(newSettings);
    Storage.saveSettings(2, newSettings);
  };

  const handleReset = () => {
    setIsSettingsOpen(false);
    setSessionState({
      currentQuestion: 1,
      currentMelody: null,
      currentNoteIndex: 0,
      selectedNoteIndex: 0,
      markedNotes: [],
      correctFirstTry: 0,
      totalNotes: 0,
      isComplete: false,
      highlightedNote: null,
      noteAttempts: {}
    });
    setTimeout(() => loadNewMelody(), 100);
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
        totalQuestions={sessionState.totalNotes}
        correctFirstTry={sessionState.correctFirstTry}
        onRestart={handleRestart}
        itemName="notes"
      />
    );
  }

  return (
    <div className="exercise2">
      <Header
        title="Exercise 2 - Fretboard Mapping"
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

      <div className="exercise2-content">
        <div className="audio-controls">
          <button className="audio-button" onClick={handlePlayMelody}>
            🔊 Play Melody
          </button>
        </div>

        {sessionState.currentMelody && (
          <>
            {settings.marking === 'inOrder' ? (
              <NoteIndicator
                totalNotes={sessionState.currentMelody.notes.length}
                currentNoteIndex={sessionState.currentNoteIndex}
                markedNotes={sessionState.markedNotes}
              />
            ) : (
              <NoteSelector
                totalNotes={sessionState.currentMelody.notes.length}
                selectedNoteIndex={sessionState.selectedNoteIndex}
                onNoteSelect={handleNoteSelect}
                markedNotes={sessionState.markedNotes}
              />
            )}

            <Fretboard
              fretRange={settings.frets}
              strings={settings.strings}
              showNoteNames={settings.display.noteNames}
              showDots={settings.display.dots}
              markedNotes={sessionState.markedNotes}
              currentNoteIndex={sessionState.currentNoteIndex}
              onFretClick={handleFretClick}
              highlightedNote={sessionState.highlightedNote}
              marking={settings.marking}
              selectedNoteIndex={sessionState.selectedNoteIndex}
            />
          </>
        )}
      </div>

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Exercise 2 Settings"
      >
        <Exercise2Settings
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onReset={handleReset}
        />
      </SettingsPanel>
    </div>
  );
};

export default Exercise2;
