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
    highlightedNote: null
  });

  // Load new melody
  const loadNewMelody = () => {
    try {
      const melody = getMelody(
        settings.source,
        settings,
        sessionState.currentQuestion - 1
      );

      setSessionState(prev => ({
        ...prev,
        currentMelody: melody,
        currentNoteIndex: 0,
        selectedNoteIndex: 0,
        markedNotes: [],
        highlightedNote: null
      }));

      // Play melody automatically
      setTimeout(() => {
        playMelody(melody);
      }, 500);
    } catch (error) {
      alert(error.message);
    }
  };

  // Initialize first melody
  useEffect(() => {
    loadNewMelody();
    // eslint-disable-next-line
  }, []);

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
        correctFirstTry: prev.correctFirstTry + 1,
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
            setSessionState(prev => ({
              ...prev,
              currentQuestion: prev.currentQuestion + 1
            }));
            setTimeout(() => loadNewMelody(), 100);
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
      // Incorrect
      setSessionState(prev => ({
        ...prev,
        totalNotes: prev.totalNotes + 1
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
      highlightedNote: null
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
