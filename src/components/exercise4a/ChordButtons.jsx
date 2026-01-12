import React from 'react';
import { MAJOR_CHORDS, MINOR_CHORDS } from '../../constants/harmonicDefaults';
import './ChordButtons.css';

const ChordButtons = ({
  availableChords,
  selectedChord,
  isCorrect,
  onChordSelect
}) => {
  const renderChordButton = (chord) => {
    const isAvailable = availableChords[chord];
    const isSelected = selectedChord === chord;

    let buttonClass = 'chord-btn';
    if (!isAvailable) {
      buttonClass += ' disabled';
    }
    if (isSelected && isCorrect === true) {
      buttonClass += ' correct';
    }
    if (isSelected && isCorrect === false) {
      buttonClass += ' incorrect';
    }

    return (
      <button
        key={chord}
        className={buttonClass}
        onClick={() => isAvailable && onChordSelect(chord)}
        disabled={!isAvailable || isCorrect === true}
      >
        {chord}
      </button>
    );
  };

  return (
    <div className="chord-buttons-container">
      {/* Major Chords */}
      <div className="chord-section">
        <h3 className="section-title">Major Chords:</h3>
        <div className="chord-grid">
          {MAJOR_CHORDS.slice(0, 6).map(renderChordButton)}
        </div>
        <div className="chord-grid">
          {MAJOR_CHORDS.slice(6, 12).map(renderChordButton)}
        </div>
      </div>

      {/* Minor Chords */}
      <div className="chord-section">
        <h3 className="section-title">Minor Chords:</h3>
        <div className="chord-grid">
          {MINOR_CHORDS.slice(0, 6).map(renderChordButton)}
        </div>
        <div className="chord-grid">
          {MINOR_CHORDS.slice(6, 12).map(renderChordButton)}
        </div>
      </div>
    </div>
  );
};

export default ChordButtons;
