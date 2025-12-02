import React from 'react';
import './Exercise2Settings.css';

/**
 * Settings component for Exercise 2
 * @param {Object} props
 * @param {Object} props.settings - Current settings
 * @param {Function} props.onSettingsChange - Settings change handler
 * @param {Function} props.onReset - Reset exercise handler
 */
const Exercise2Settings = ({ settings, onSettingsChange, onReset }) => {
  const handleStringToggle = (stringKey) => {
    const newStrings = { ...settings.strings };
    const selectedCount = Object.values(newStrings).filter(Boolean).length;

    if (newStrings[stringKey] && selectedCount <= 1) {
      alert('You must have at least 1 string selected');
      return;
    }

    newStrings[stringKey] = !newStrings[stringKey];
    onSettingsChange({ ...settings, strings: newStrings });
  };

  return (
    <div className="exercise2-settings">
      <div className="settings-section">
        <h4 className="settings-section-title">Source:</h4>
        <label className="radio-label">
          <input
            type="radio"
            name="source"
            value="library"
            checked={settings.source === 'library'}
            onChange={(e) =>
              onSettingsChange({ ...settings, source: e.target.value })
            }
          />
          <span>Library (Pre-made melodies)</span>
        </label>
        <label className="radio-label">
          <input
            type="radio"
            name="source"
            value="random"
            checked={settings.source === 'random'}
            onChange={(e) =>
              onSettingsChange({ ...settings, source: e.target.value })
            }
          />
          <span>Random Generation</span>
        </label>
      </div>

      {settings.source === 'random' && (
        <div className="settings-section">
          <h4 className="settings-section-title">Number of Notes:</h4>
          <input
            type="range"
            min="1"
            max="10"
            value={settings.numNotes}
            onChange={(e) =>
              onSettingsChange({ ...settings, numNotes: parseInt(e.target.value) })
            }
          />
          <span className="range-value">{settings.numNotes}</span>
        </div>
      )}

      <div className="settings-section">
        <h4 className="settings-section-title">Fretboard Range:</h4>
        <div className="range-inputs">
          <label>
            From:
            <input
              type="number"
              min="0"
              max="23"
              value={settings.frets.from}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  frets: { ...settings.frets, from: parseInt(e.target.value) }
                })
              }
            />
          </label>
          <label>
            To:
            <input
              type="number"
              min="1"
              max="24"
              value={settings.frets.to}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  frets: { ...settings.frets, to: parseInt(e.target.value) }
                })
              }
            />
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h4 className="settings-section-title">Strings:</h4>
        <div className="string-checkboxes">
          {Object.keys(settings.strings).map(stringKey => (
            <label key={stringKey} className="string-checkbox">
              <input
                type="checkbox"
                checked={settings.strings[stringKey]}
                onChange={() => handleStringToggle(stringKey)}
              />
              <span>{stringKey}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <h4 className="settings-section-title">Display:</h4>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.display.noteNames}
            onChange={(e) =>
              onSettingsChange({
                ...settings,
                display: { ...settings.display, noteNames: e.target.checked }
              })
            }
          />
          <span>Show Note Names</span>
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.display.dots}
            onChange={(e) =>
              onSettingsChange({
                ...settings,
                display: { ...settings.display, dots: e.target.checked }
              })
            }
          />
          <span>Show Fret Dots</span>
        </label>
      </div>

      <div className="settings-section">
        <h4 className="settings-section-title">Marking Mode:</h4>
        <label className="radio-label">
          <input
            type="radio"
            name="marking"
            value="inOrder"
            checked={settings.marking === 'inOrder'}
            onChange={(e) =>
              onSettingsChange({ ...settings, marking: e.target.value })
            }
          />
          <span>In Order (must mark 1, 2, 3...)</span>
        </label>
        <label className="radio-label">
          <input
            type="radio"
            name="marking"
            value="free"
            checked={settings.marking === 'free'}
            onChange={(e) =>
              onSettingsChange({ ...settings, marking: e.target.value })
            }
          />
          <span>Free (mark in any order)</span>
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
        <button className="settings-button reset-button" onClick={onReset}>
          Reset Exercise
        </button>
      </div>
    </div>
  );
};

export default Exercise2Settings;
