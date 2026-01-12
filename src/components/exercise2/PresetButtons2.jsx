import React from 'react';
import './PresetButtons2.css';

const PRESETS = [
  {
    id: 1,
    name: 'G1',
    config: {
      source: 'random',
      numNotes: 1,
      availableNotes: {
        C: true, D: true, E: true, F: true, G: true, A: true, B: true,
        'C#': false, 'D#': false, 'F#': false, 'G#': false, 'A#': false
      },
      movement: 'steps',
      octaveRange: 2,
      frets: { from: 0, to: 12 },
      strings: { E: false, A: false, D: false, G: true, B: false, e: false },
      numQuestions: 10,
      instrument: 'guitar'
    }
  },
  {
    id: 2,
    name: 'G2',
    config: {
      source: 'random',
      numNotes: 2,
      availableNotes: {
        C: true, D: true, E: true, F: true, G: true, A: true, B: true,
        'C#': false, 'D#': false, 'F#': false, 'G#': false, 'A#': false
      },
      movement: 'steps',
      octaveRange: 2,
      frets: { from: 0, to: 12 },
      strings: { E: false, A: false, D: false, G: true, B: false, e: false },
      numQuestions: 10,
      instrument: 'guitar'
    }
  },
  {
    id: 3,
    name: 'C',
    config: {
      source: 'random',
      numNotes: 2,
      availableNotes: {
        C: true, D: true, E: true, F: true, G: true, A: true, B: true,
        'C#': false, 'D#': false, 'F#': false, 'G#': false, 'A#': false
      },
      movement: 'steps',
      octaveRange: 2,
      frets: { from: 0, to: 3 },
      strings: { E: true, A: true, D: true, G: true, B: true, e: true },
      numQuestions: 10,
      instrument: 'guitar'
    }
  },
  {
    id: 4,
    name: 'A',
    config: {
      source: 'random',
      numNotes: 2,
      availableNotes: {
        C: true, D: true, E: true, F: true, G: true, A: true, B: true,
        'C#': false, 'D#': false, 'F#': false, 'G#': false, 'A#': false
      },
      movement: 'steps',
      octaveRange: 2,
      frets: { from: 2, to: 6 },
      strings: { E: true, A: true, D: true, G: true, B: true, e: true },
      numQuestions: 10,
      instrument: 'guitar'
    }
  },
  {
    id: 5,
    name: 'G',
    config: {
      source: 'random',
      numNotes: 2,
      availableNotes: {
        C: true, D: true, E: true, F: true, G: true, A: true, B: true,
        'C#': false, 'D#': false, 'F#': false, 'G#': false, 'A#': false
      },
      movement: 'steps',
      octaveRange: 2,
      frets: { from: 4, to: 8 },
      strings: { E: true, A: true, D: true, G: true, B: true, e: true },
      numQuestions: 10,
      instrument: 'guitar'
    }
  },
  {
    id: 6,
    name: 'E',
    config: {
      source: 'random',
      numNotes: 2,
      availableNotes: {
        C: true, D: true, E: true, F: true, G: true, A: true, B: true,
        'C#': false, 'D#': false, 'F#': false, 'G#': false, 'A#': false
      },
      movement: 'steps',
      octaveRange: 2,
      frets: { from: 7, to: 10 },
      strings: { E: true, A: true, D: true, G: true, B: true, e: true },
      numQuestions: 10,
      instrument: 'guitar'
    }
  },
  {
    id: 7,
    name: 'D',
    config: {
      source: 'random',
      numNotes: 2,
      availableNotes: {
        C: true, D: true, E: true, F: true, G: true, A: true, B: true,
        'C#': false, 'D#': false, 'F#': false, 'G#': false, 'A#': false
      },
      movement: 'steps',
      octaveRange: 2,
      frets: { from: 9, to: 13 },
      strings: { E: true, A: true, D: true, G: true, B: true, e: true },
      numQuestions: 10,
      instrument: 'guitar'
    }
  }
];

const PresetButtons2 = ({ onPresetSelect }) => {
  return (
    <div className="preset-buttons-container-2">
      <h4 className="preset-title-2">Quick Start Presets:</h4>
      <div className="preset-buttons-grid-2">
        {PRESETS.map(preset => (
          <button
            key={preset.id}
            className="preset-btn-2"
            onClick={() => onPresetSelect(preset)}
          >
            {preset.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PresetButtons2;
