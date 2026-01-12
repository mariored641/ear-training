import React from 'react';
import { MAJOR_CHORDS, MINOR_CHORDS, NOTE_NAMES } from '../../constants/harmonicDefaults';
import './ProgressionInput.css';

const ProgressionInput = ({
  progression,
  currentChordIndex,
  selectedChords,
  selectedBassNotes,
  withInversions,
  availableChords,
  onChordSelect,
  onBassNoteSelect
}) => {
  const renderChordSection = (chordIndex) => {
    const isActive = chordIndex === currentChordIndex;
    const isCompleted = chordIndex < currentChordIndex;
    const isLocked = chordIndex > currentChordIndex;
    const selectedChord = selectedChords[chordIndex];
    const selectedBass = selectedBassNotes[chordIndex];

    // For with inversions mode: bass input only active after chord is selected
    const isBassActive = withInversions && isActive && selectedChord;

    let containerClass = 'progression-input-section';
    if (isActive) containerClass += ' active';
    if (isCompleted) containerClass += ' completed';
    if (isLocked) containerClass += ' locked';

    return (
      <div key={chordIndex} className={containerClass}>
        <div className="section-header">
          <h3>Chord {chordIndex + 1}:</h3>
          {isCompleted && <span className="completed-badge">✓</span>}
          {isLocked && <span className="locked-badge">🔒</span>}
        </div>

        {/* Chord buttons */}
        <div className="chord-buttons-section">
          <div className="chord-group">
            <h4>Major:</h4>
            <div className="chord-grid">
              {MAJOR_CHORDS.filter(c => availableChords[c]).map(chord => {
                const isSelected = selectedChord === chord;
                let btnClass = 'chord-btn';
                if (isLocked || isCompleted) btnClass += ' disabled';
                if (isSelected) btnClass += ' selected';

                return (
                  <button
                    key={chord}
                    className={btnClass}
                    onClick={() => isActive && onChordSelect(chordIndex, chord)}
                    disabled={isLocked || isCompleted}
                  >
                    {chord}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="chord-group">
            <h4>Minor:</h4>
            <div className="chord-grid">
              {MINOR_CHORDS.filter(c => availableChords[c]).map(chord => {
                const isSelected = selectedChord === chord;
                let btnClass = 'chord-btn';
                if (isLocked || isCompleted) btnClass += ' disabled';
                if (isSelected) btnClass += ' selected';

                return (
                  <button
                    key={chord}
                    className={btnClass}
                    onClick={() => isActive && onChordSelect(chordIndex, chord)}
                    disabled={isLocked || isCompleted}
                  >
                    {chord}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bass note buttons (only in with inversions mode) */}
        {withInversions && (
          <div className="bass-buttons-section">
            <h4>Bass Note {chordIndex + 1}:</h4>
            <div className="bass-grid">
              {NOTE_NAMES.map(note => {
                const isSelected = selectedBass === note;
                let btnClass = 'bass-btn';
                if (!isBassActive || isCompleted) btnClass += ' disabled';
                if (isSelected) btnClass += ' selected';

                return (
                  <button
                    key={note}
                    className={btnClass}
                    onClick={() => isBassActive && onBassNoteSelect(chordIndex, note)}
                    disabled={!isBassActive || isCompleted}
                  >
                    {note}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="progression-input-container">
      {progression.map((_, index) => renderChordSection(index))}
    </div>
  );
};

export default ProgressionInput;
