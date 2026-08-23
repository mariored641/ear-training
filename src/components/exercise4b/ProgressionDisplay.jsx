import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatNoteName } from '../../i18n/musicTerms.js';
import './ProgressionDisplay.css';

const ProgressionDisplay = ({ progression, currentChordIndex }) => {
  const { t, i18n } = useTranslation();
  return (
    <div className="progression-display">
      <h3 className="progression-label">{t('legacy.progression')}:</h3>
      <div className="progression-chords">
        {progression.map((chord, index) => (
          <React.Fragment key={index}>
            <span
              className={`progression-chord ${index === currentChordIndex ? 'current' : ''} ${
                index < currentChordIndex ? 'completed' : ''
              }`}
            >
              <span className="music-term">{formatNoteName(chord, i18n.language)}</span>
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
