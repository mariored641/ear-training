import React from 'react';
import './DisplayOptionsBar.css';

const DISPLAY_MODES = [
  { value: 'dots', label: 'Dots Only' },
  { value: 'notes', label: 'Note Names' },
  { value: 'degrees', label: 'Scale Degrees' },
];

const DisplayOptionsBar = ({ selectedMode, onModeChange }) => {
  return (
    <div className="display-options-bar">
      {DISPLAY_MODES.map(mode => (
        <button
          key={mode.value}
          className={`display-mode-btn ${selectedMode === mode.value ? 'active' : ''}`}
          onClick={() => onModeChange(mode.value)}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
};

export default React.memo(DisplayOptionsBar);
