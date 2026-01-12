import React from 'react';
import { MAJOR_CHORDS, MINOR_CHORDS } from '../../constants/harmonicDefaults';
import './ChordButtons4C.css';

const ChordButtons4C = ({
  availableChords,
  markedChords, // Array of { chord, positionNumbers: [1, 2, 3...] }
  onChordSelect
}) => {
  const renderChordButton = (chord) => {
    const isAvailable = availableChords[chord];
    const markedChord = markedChords.find(m => m.chord === chord);
    const isMarked = !!markedChord;

    let buttonClass = 'chord-btn-4c';
    if (!isAvailable) {
      buttonClass += ' disabled';
    }
    if (isMarked) {
      buttonClass += ' marked';
    }

    return (
      <button
        key={chord}
        className={buttonClass}
        onClick={() => isAvailable && onChordSelect(chord)}
        disabled={!isAvailable}
      >
        {chord}
        {isMarked && (
          <div className="position-numbers">
            {markedChord.positionNumbers.map((num, idx) => (
              <span key={idx} className="position-number">{num}</span>
            ))}
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="chord-buttons-container-4c">
      {/* Major Chords */}
      <div className="chord-section-4c">
        <h3 className="section-title-4c">Major Chords:</h3>
        <div className="chord-grid-4c">
          {MAJOR_CHORDS.slice(0, 6).map(renderChordButton)}
        </div>
        <div className="chord-grid-4c">
          {MAJOR_CHORDS.slice(6, 12).map(renderChordButton)}
        </div>
      </div>

      {/* Minor Chords */}
      <div className="chord-section-4c">
        <h3 className="section-title-4c">Minor Chords:</h3>
        <div className="chord-grid-4c">
          {MINOR_CHORDS.slice(0, 6).map(renderChordButton)}
        </div>
        <div className="chord-grid-4c">
          {MINOR_CHORDS.slice(6, 12).map(renderChordButton)}
        </div>
      </div>
    </div>
  );
};

export default ChordButtons4C;
