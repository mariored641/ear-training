import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PROGRESSION_LIBRARY, MAJOR_CHORDS, MINOR_CHORDS } from '../../constants/harmonicDefaults';
import { formatNoteName } from '../../i18n/musicTerms.js';
import '../exercise4a/Settings4APanel.css'; // Reuse 4A styles

const Settings4BPanel = ({
  isOpen,
  settings,
  onSettingsChange,
  onClose,
  onReset
}) => {
  const { t, i18n } = useTranslation();
  const [localSettings, setLocalSettings] = useState(settings);

  const handleChange = (key, value) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const handleChordToggle = (chord) => {
    const newChords = { ...localSettings.availableChords, [chord]: !localSettings.availableChords[chord] };
    const newSettings = { ...localSettings, availableChords: newChords };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const handleSelectAll = () => {
    const newChords = { ...localSettings.availableChords };
    [...MAJOR_CHORDS, ...MINOR_CHORDS].forEach(chord => {
      newChords[chord] = true;
    });
    const newSettings = { ...localSettings, availableChords: newChords };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  if (!isOpen) return null;

  // Filter progressions by available chords
  const availableProgressions = PROGRESSION_LIBRARY.filter(prog => {
    return prog.chords.every(chord => localSettings.availableChords[chord]);
  });

  return (
    <>
      <div className="settings-overlay" onClick={onClose}></div>
      <div className="settings-panel settings4b-panel">
        <div className="settings-header">
          <h2>{t('legacy.settings')}</h2>
          <button className="close-btn" onClick={onClose} aria-label={t('common.close')}>✕</button>
        </div>

        <div className="settings-content">
          {/* Source */}
          <div className="settings-section">
            <h3 className="settings-section-title">{t('legacy.source')}:</h3>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  checked={localSettings.source === 'library'}
                  onChange={() => handleChange('source', 'library')}
                />
                <span>{t('legacy.library')}</span>
              </label>
              <label className="radio-label disabled">
                <input type="radio" disabled />
                <span>{t('legacy.randomComingSoon')}</span>
              </label>
            </div>
          </div>

          {/* Progression Library */}
          {localSettings.source === 'library' && (
            <div className="settings-section">
              <h3 className="settings-section-title">{t('legacy.progressionLibrary')}:</h3>
              <select
                value={localSettings.progressionId}
                onChange={(e) => handleChange('progressionId', e.target.value)}
                className="select-input"
              >
                {availableProgressions.map(prog => (
                  <option key={prog.id} value={prog.id}>
                    {t(`legacy.progressionNames.${prog.id}`, { defaultValue: prog.name })}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notes per Chord */}
          <div className="settings-section">
            <h3 className="settings-section-title">{t('legacy.notesPerChord')}:</h3>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  checked={localSettings.notesPerChord === 1}
                  onChange={() => handleChange('notesPerChord', 1)}
                />
                <span>{t('legacy.noteCount', { count: 1 })}</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  checked={localSettings.notesPerChord === 2}
                  onChange={() => handleChange('notesPerChord', 2)}
                />
                <span>{t('legacy.noteCount', { count: 2 })}</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  checked={localSettings.notesPerChord === 3}
                  onChange={() => handleChange('notesPerChord', 3)}
                />
                <span>{t('legacy.noteCount', { count: 3 })}</span>
              </label>
            </div>
          </div>

          {/* Octave Range */}
          <div className="settings-section">
            <h3 className="settings-section-title">{t('legacy.octaveRange')}:</h3>
            <input
              type="number"
              min="1"
              max="4"
              value={localSettings.octaveRange}
              onChange={(e) => handleChange('octaveRange', parseInt(e.target.value))}
              className="number-input"
            />
          </div>

          {/* Available Chords */}
          <div className="settings-section">
            <h3 className="settings-section-title">{t('legacy.availableChords')}:</h3>

            <div className="chord-selection-section">
              <h4>{t('legacy.major')}:</h4>
              <div className="chord-checkbox-grid">
                {MAJOR_CHORDS.map(chord => (
                  <label key={chord} className="chord-checkbox">
                    <input
                      type="checkbox"
                      checked={localSettings.availableChords[chord]}
                      onChange={() => handleChordToggle(chord)}
                    />
                    <span className="music-term">{formatNoteName(chord, i18n.language)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="chord-selection-section">
              <h4>{t('legacy.minor')}:</h4>
              <div className="chord-checkbox-grid">
                {MINOR_CHORDS.map(chord => (
                  <label key={chord} className="chord-checkbox">
                    <input
                      type="checkbox"
                      checked={localSettings.availableChords[chord]}
                      onChange={() => handleChordToggle(chord)}
                    />
                    <span className="music-term">{formatNoteName(chord, i18n.language)}</span>
                  </label>
                ))}
              </div>
            </div>

            <button className="quick-select-btn" onClick={handleSelectAll}>
              {t('legacy.selectAll')}
            </button>
          </div>

          {/* Show Chord During Play */}
          <div className="settings-section">
            <h3 className="settings-section-title">{t('legacy.showChordDuringPlay')}:</h3>
            <label className="radio-label">
              <input
                type="checkbox"
                checked={localSettings.showChordDuringPlay}
                onChange={(e) => handleChange('showChordDuringPlay', e.target.checked)}
              />
              <span>{t('legacy.highlightCurrentChord')}</span>
            </label>
          </div>

          {/* Instrument */}
          <div className="settings-section">
            <h3 className="settings-section-title">{t('legacy.instrument')}:</h3>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  checked={localSettings.instrument === 'piano'}
                  onChange={() => handleChange('instrument', 'piano')}
                />
                <span>{t('legacy.piano')}</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  checked={localSettings.instrument === 'guitar'}
                  onChange={() => handleChange('instrument', 'guitar')}
                />
                <span>{t('legacy.guitar')}</span>
              </label>
            </div>
          </div>

          {/* Transition */}
          <div className="settings-section">
            <h3 className="settings-section-title">{t('legacy.transition')}:</h3>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  checked={localSettings.transition === 'auto'}
                  onChange={() => handleChange('transition', 'auto')}
                />
                <span>{t('legacy.auto')}</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  checked={localSettings.transition === 'manual'}
                  onChange={() => handleChange('transition', 'manual')}
                />
                <span>{t('legacy.manual')}</span>
              </label>
            </div>
          </div>

          {/* Number of Questions */}
          <div className="settings-section">
            <h3 className="settings-section-title">{t('legacy.questions')}:</h3>
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
              {t('legacy.resetExercise')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Settings4BPanel;
