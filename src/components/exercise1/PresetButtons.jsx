import React from 'react';
import './PresetButtons.css';

const PRESETS = [
  {
    id: 1,
    name: 'B',
    notes: ['C', 'B']
  },
  {
    id: 2,
    name: 'D',
    notes: ['C', 'B', 'D']
  },
  {
    id: 3,
    name: 'G',
    notes: ['C', 'B', 'D', 'G']
  },
  {
    id: 4,
    name: 'E',
    notes: ['C', 'B', 'D', 'G', 'E']
  },
  {
    id: 5,
    name: 'F',
    notes: ['C', 'B', 'D', 'G', 'E', 'F']
  },
  {
    id: 6,
    name: 'A',
    notes: ['C', 'B', 'D', 'G', 'E', 'F', 'A']
  }
];

const PresetButtons = ({ onPresetSelect }) => {
  return (
    <div className="preset-buttons-container">
      <h4 className="preset-title">Quick Start Presets:</h4>
      <div className="preset-buttons-grid">
        {PRESETS.map(preset => (
          <button
            key={preset.id}
            className="preset-btn"
            onClick={() => onPresetSelect(preset)}
          >
            {preset.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PresetButtons;
