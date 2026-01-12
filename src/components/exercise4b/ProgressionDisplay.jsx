import React from 'react';
import './ProgressionDisplay.css';

const ProgressionDisplay = ({ progression, currentChordIndex }) => {
  return (
    <div className="progression-display">
      <h3 className="progression-label">Progression:</h3>
      <div className="progression-chords">
        {progression.map((chord, index) => (
          <React.Fragment key={index}>
            <span
              className={`progression-chord ${index === currentChordIndex ? 'current' : ''} ${
                index < currentChordIndex ? 'completed' : ''
              }`}
            >
              {chord}
            </span>
            {index < progression.length - 1 && (
              <span className="progression-arrow">→</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default ProgressionDisplay;
