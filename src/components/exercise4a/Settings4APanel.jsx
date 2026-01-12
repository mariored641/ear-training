import React, { useState } from 'react';
import { MAJOR_CHORDS, MINOR_CHORDS } from '../../constants/harmonicDefaults';
import './Settings4APanel.css';

const Settings4APanel = ({
  isOpen,
  settings,
  onSettingsChange,
  onClose,
  onReset
}) => {
  const [localSettings, setLocalSettings] = useState(settings);

  const handleChange = (key, value) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const handleChordToggle = (chord) => {
    const newChords = { ...localSettings.availableChords, [chord]: !localSettings.availableChords[chord] };

    // Check if at least 2 chords are selected
    const selectedCount = Object.values(newChords).filter(v => v).length;
    if (selectedCount < 2 && !newChords[chord]) {
      alert('You must select at least 2 chords');
      return;
    }

    const newSettings = { ...localSettings, availableChords: newChords };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const handleSelectCMajorScale = () => {
    const cMajorChords = ['C', 'F', 'G', 'Am', 'Dm', 'Em'];
    const newChords = {};
    [...MAJOR_CHORDS, ...MINOR_CHORDS].forEach(chord => {
      newChords[chord] = cMajorChords.includes(chord);
    });
    const newSettings = { ...localSettings, availableChords: newChords };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const handleSelectCMinorScale = () => {
    const cMinorChords = ['Cm', 'Fm', 'Gm', 'D#', 'G#', 'A#'];
    const newChords = {};
    [...MAJOR_CHORDS, ...MINOR_CHORDS].forEach(chord => {
      newChords[chord] = cMinorChords.includes(chord);
    });
    const newSettings = { ...localSettings, availableChords: newChords };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const handleClearAll = () => {
    const newChords = {};
    [...MAJOR_CHORDS, ...MINOR_CHORDS].forEach(chord => {
      newChords[chord] = false;
    });
    // Keep only C major
    newChords['C'] = true;
    const newSettings = { ...localSettings, availableChords: newChords };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="settings-overlay" onClick={onClose}></div>
      <div className="settings-panel settings4a-panel">
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="settings-content">
          {/* Available Chords */}
          <div className="settings-section">
            <h3 className="settings-section-title">Available Chords:</h3>

            <div className="chord-selection-section">
              <h4>Major:</h4>
              <div className="chord-checkbox-grid">
                {MAJOR_CHORDS.map(chord => (
                  <label key={chord} className="chord-checkbox">
                    <input
                      type="checkbox"
                      checked={localSettings.availableChords[chord]}
                      onChange={() => handleChordToggle(chord)}
                    />
                    <span>{chord}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="chord-selection-section">
              <h4>Minor:</h4>
              <div className="chord-checkbox-grid">
                {MINOR_CHORDS.map(chord => (
                  <label key={chord} className="chord-checkbox">
                    <input
                      type="checkbox"
                      checked={localSettings.availableChords[chord]}
                      onChange={() => handleChordToggle(chord)}
                    />
                    <span>{chord}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="quick-select-buttons">
              <button className="quick-select-btn" onClick={handleSelectCMajorScale}>
                C Major Scale
              </button>
              <button className="quick-select-btn" onClick={handleSelectCMinorScale}>
                C Minor Scale
              </button>
              <button className="quick-select-btn" onClick={handleClearAll}>
                Clear All
              </button>
            </div>
          </div>

          {/* Source */}
          <div className="settings-section">
            <h3 className="settings-section-title">Source:</h3>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  checked={localSettings.source === 'random'}
                  onChange={() => handleChange('source', 'random')}
                />
                <span>Random</span>
              </label>
              <label className="radio-label disabled">
                <input type="radio" disabled />
                <span>Library (Coming Soon)</span>
              </label>
            </div>
          </div>

          {/* Instrument */}
          <div className="settings-section">
            <h3 className="settings-section-title">Instrument:</h3>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  checked={localSettings.instrument === 'piano'}
                  onChange={() => handleChange('instrument', 'piano')}
                />
                <span>Piano</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  checked={localSettings.instrument === 'guitar'}
                  onChange={() => handleChange('instrument', 'guitar')}
                />
                <span>Guitar</span>
              </label>
            </div>
          </div>

          {/* Voicing */}
          <div className="settings-section">
            <h3 className="settings-section-title">Voicing:</h3>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  checked={localSettings.voicing === 'strummed'}
                  onChange={() => handleChange('voicing', 'strummed')}
                />
                <span>Strummed</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  checked={localSettings.voicing === 'arpeggiated'}
                  onChange={() => handleChange('voicing', 'arpeggiated')}
                />
                <span>Arpeggiated</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  checked={localSettings.voicing === 'mixed'}
                  onChange={() => handleChange('voicing', 'mixed')}
                />
                <span>Mixed</span>
              </label>
            </div>
          </div>

          {/* Play C */}
          <div className="settings-section">
            <h3 className="settings-section-title">Play C:</h3>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  checked={localSettings.playC === 'everyTime'}
                  onChange={() => handleChange('playC', 'everyTime')}
                />
                <span>Every Time</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  checked={localSettings.playC === 'onceAtStart'}
                  onChange={() => handleChange('playC', 'onceAtStart')}
                />
                <span>Once at Start</span>
              </label>
            </div>
          </div>

          {/* Transition */}
          <div className="settings-section">
            <h3 className="settings-section-title">Transition:</h3>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  checked={localSettings.transition === 'auto'}
                  onChange={() => handleChange('transition', 'auto')}
                />
                <span>Auto</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  checked={localSettings.transition === 'manual'}
                  onChange={() => handleChange('transition', 'manual')}
                />
                <span>Manual</span>
              </label>
            </div>
          </div>

          {/* Number of Questions */}
          <div className="settings-section">
            <h3 className="settings-section-title">Questions:</h3>
            <input
              type="number"
              min="5"
              max="50"
              value={localSettings.numQuestions}
              onChange={(e) => handleChange('numQuestions', parseInt(e.target.value))}
              className="number-input"
            />
          </div>

          {/* Reset Button */}
          <div className="settings-section">
            <button className="reset-btn" onClick={onReset}>
              Reset Exercise
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Settings4APanel;
