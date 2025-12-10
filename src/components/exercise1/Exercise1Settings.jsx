import React from 'react';
import { NOTES } from '../../constants/notes';
import './Exercise1Settings.css';

/**
 * Settings component for Exercise 1
 * @param {Object} props
 * @param {Object} props.settings - Current settings
 * @param {Function} props.onSettingsChange - Settings change handler
 * @param {Function} props.onReset - Reset exercise handler
 */
const Exercise1Settings = ({ settings, onSettingsChange, onReset }) => {
  const handleNoteToggle = (note) => {
    const newAvailableNotes = { ...settings.availableNotes };

    // Count currently selected notes
    const selectedCount = Object.values(newAvailableNotes).filter(Boolean).length;

    // Prevent unchecking if this is the last note
    if (newAvailableNotes[note] && selectedCount <= 1) {
      alert('You must have at least 2 notes selected');
      return;
    }

    newAvailableNotes[note] = !newAvailableNotes[note];
    onSettingsChange({ ...settings, availableNotes: newAvailableNotes });
  };

  const handleSelectAll = () => {
    const newAvailableNotes = {};
    NOTES.forEach(note => {
      newAvailableNotes[note] = true;
    });
    onSettingsChange({ ...settings, availableNotes: newAvailableNotes });
  };

  const handleClearAll = () => {
    const newAvailableNotes = {};
    NOTES.forEach(note => {
      newAvailableNotes[note] = note === 'C'; // Keep only C
    });
    onSettingsChange({ ...settings, availableNotes: newAvailableNotes });
  };

  return (
    <div className="exercise1-settings">
      <div className="settings-section">
        <h4 className="settings-section-title">Available Notes:</h4>
        <div className="note-checkboxes">
          {NOTES.map(note => (
            <label key={note} className="note-checkbox">
              <input
                type="checkbox"
                checked={settings.availableNotes[note]}
                onChange={() => handleNoteToggle(note)}
              />
              <span>{note}</span>
            </label>
          ))}
        </div>
        <div className="button-group">
          <button className="settings-button" onClick={handleSelectAll}>
            Select All
          </button>
          <button className="settings-button" onClick={handleClearAll}>
            Clear All
          </button>
        </div>
      </div>

      <div className="settings-section">
        <h4 className="settings-section-title">Octaves:</h4>
        <input
          type="range"
          min="1"
          max="4"
          value={settings.octaveRange}
          onChange={(e) =>
            onSettingsChange({ ...settings, octaveRange: parseInt(e.target.value) })
          }
        />
        <span className="range-value">{settings.octaveRange}</span>
      </div>

      <div className="settings-section">
        <h4 className="settings-section-title">Play C:</h4>
        <label className="radio-label">
          <input
            type="radio"
            name="playC"
            value="everyTime"
            checked={settings.playC === 'everyTime'}
            onChange={(e) =>
              onSettingsChange({ ...settings, playC: e.target.value })
            }
          />
          <span>Every Time</span>
        </label>
        <label className="radio-label">
          <input
            type="radio"
            name="playC"
            value="onceAtStart"
            checked={settings.playC === 'onceAtStart'}
            onChange={(e) =>
              onSettingsChange({ ...settings, playC: e.target.value })
            }
          />
          <span>Once at Start</span>
        </label>
      </div>

      <div className="settings-section">
        <h4 className="settings-section-title">Transition Between Questions:</h4>
        <label className="radio-label">
          <input
            type="radio"
            name="transition"
            value="auto"
            checked={settings.transition === 'auto'}
            onChange={(e) =>
              onSettingsChange({ ...settings, transition: e.target.value })
            }
          />
          <span>Auto</span>
        </label>
        <label className="radio-label">
          <input
            type="radio"
            name="transition"
            value="manual"
            checked={settings.transition === 'manual'}
            onChange={(e) =>
              onSettingsChange({ ...settings, transition: e.target.value })
            }
          />
          <span>Manual</span>
        </label>
      </div>

      <div className="settings-section">
        <h4 className="settings-section-title">Number of Questions:</h4>
        <input
          type="range"
          min="5"
          max="50"
          value={settings.numQuestions}
          onChange={(e) =>
            onSettingsChange({ ...settings, numQuestions: parseInt(e.target.value) })
          }
        />
        <span className="range-value">{settings.numQuestions}</span>
      </div>

      <div className="settings-section">
        <h4 className="settings-section-title">Instrument Sound:</h4>
        <label className="radio-label">
          <input
            type="radio"
            name="instrument"
            value="piano"
            checked={settings.instrument === 'piano'}
            onChange={(e) =>
              onSettingsChange({ ...settings, instrument: e.target.value })
            }
          />
          <span>Piano</span>
        </label>
        <label className="radio-label">
          <input
            type="radio"
            name="instrument"
            value="guitar"
            checked={settings.instrument === 'guitar'}
            onChange={(e) =>
              onSettingsChange({ ...settings, instrument: e.target.value })
            }
          />
          <span>Guitar</span>
        </label>
      </div>

      <div className="settings-section">
        <button className="settings-button reset-button" onClick={onReset}>
          Reset Exercise
        </button>
      </div>
    </div>
  );
};

export default Exercise1Settings;
