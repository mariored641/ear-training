import React from 'react';
import { useTranslation } from 'react-i18next';
import './DisplayOptionsBar.css';

const DISPLAY_MODES = [
  { value: 'dots', label: 'Dots Only' },
  { value: 'notes', label: 'Note Names' },
  { value: 'degrees', label: 'Scale Degrees' },
];

const DisplayOptionsBar = ({
  selectedMode,
  onModeChange,
  showPentatonic,
  onPentatonicChange,
  noteLang = 'latin',
  onNoteLangChange,
}) => {
  const { t } = useTranslation();
  return (
    <div className="display-options-bar">
      {DISPLAY_MODES.map(mode => (
        <button
          key={mode.value}
          className={`display-mode-btn ${selectedMode === mode.value ? 'active' : ''}`}
          onClick={() => onModeChange(mode.value)}
        >
          {t(`positions.${mode.value === 'dots' ? 'dotsOnly' : mode.value === 'notes' ? 'noteNames' : 'scaleDegrees'}`)}
        </button>
      ))}
      <button
        className={`display-mode-btn pentatonic-btn ${showPentatonic ? 'active' : ''}`}
        onClick={() => onPentatonicChange(!showPentatonic)}
      >
        {t('positions.pentatonic')}
      </button>
      {selectedMode === 'notes' && onNoteLangChange && (
        <div className="note-lang-toggle">
          <button
            className={`display-mode-btn note-lang-btn ${noteLang === 'latin' ? 'active' : ''}`}
            onClick={() => onNoteLangChange('latin')}
          >
            A B C
          </button>
          <button
            className={`display-mode-btn note-lang-btn ${noteLang === 'hebrew' ? 'active' : ''}`}
            onClick={() => onNoteLangChange('hebrew')}
          >
            דו רה מי
          </button>
        </div>
      )}
    </div>
  );
};

export default React.memo(DisplayOptionsBar);
