import React from 'react';
import { useTranslation } from 'react-i18next';
import { NOTES } from '../../constants/notes';
import { formatNoteName } from '../../i18n/musicTerms.js';
import './Exercise1Settings.css';

/**
 * Settings component for Exercise 1
 * @param {Object} props
 * @param {Object} props.settings - Current settings
 * @param {Function} props.onSettingsChange - Settings change handler
 * @param {Function} props.onReset - Reset exercise handler
 */
const Exercise1Settings = ({ settings, onSettingsChange, onReset }) => {
  const { t, i18n } = useTranslation();
  const handleNoteToggle = (note) => {
    const newAvailableNotes = { ...settings.availableNotes };

    // Count currently selected notes
    const selectedCount = Object.values(newAvailableNotes).filter(Boolean).length;

    // Prevent unchecking if this is the last note
    if (newAvailableNotes[note] && selectedCount <= 1) {
      alert(t('legacy.atLeastTwoNotes'));
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
        <h4 className="settings-section-title">{t('legacy.availableNotes')}:</h4>
        <div className="note-checkboxes">
          {NOTES.map(note => (
            <label key={note} className="note-checkbox">
              <input
                type="checkbox"
                checked={settings.availableNotes[note]}
                onChange={() => handleNoteToggle(note)}
              />
              <span className="music-term">{formatNoteName(note, i18n.language)}</span>
            </label>
          ))}
        </div>
        <div className="button-group">
          <button className="settings-button" onClick={handleSelectAll}>
            {t('legacy.selectAll')}
          </button>
          <button className="settings-button" onClick={handleClearAll}>
            {t('legacy.clearAll')}
          </button>
        </div>
      </div>

      <div className="settings-section">
        <h4 className="settings-section-title">{t('legacy.octaves')}:</h4>
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
        <h4 className="settings-section-title">{t('legacy.playC')}:</h4>
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
          <span>{t('legacy.everyTime')}</span>
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
          <span>{t('legacy.onceAtStart')}</span>
        </label>
      </div>

      <div className="settings-section">
        <h4 className="settings-section-title">{t('legacy.transitionBetween')}:</h4>
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
          <span>{t('legacy.auto')}</span>
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
          <span>{t('legacy.manual')}</span>
        </label>
      </div>

      <div className="settings-section">
        <h4 className="settings-section-title">{t('legacy.numberQuestions')}:</h4>
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
        <h4 className="settings-section-title">{t('legacy.instrumentSound')}:</h4>
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
          <span>{t('legacy.piano')}</span>
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
          <span>{t('legacy.guitar')}</span>
        </label>
      </div>

      <div className="settings-section">
        <button className="settings-button reset-button" onClick={onReset}>
          {t('legacy.resetExercise')}
        </button>
      </div>
    </div>
  );
};

export default Exercise1Settings;
