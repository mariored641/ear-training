import React from 'react';
import { useTranslation } from 'react-i18next';
import { MAJOR_CHORDS, MINOR_CHORDS } from '../../constants/harmonicDefaults';
import { formatNoteName } from '../../i18n/musicTerms.js';
import './ChordButtons.css';

const ChordButtons = ({
  availableChords,
  selectedChord,
  isCorrect,
  onChordSelect
}) => {
  const { t, i18n } = useTranslation();
  const renderChordButton = (chord) => {
    const isAvailable = availableChords[chord];
    const isSelected = selectedChord === chord;

    let buttonClass = 'chord-btn';
    if (!isAvailable) {
      buttonClass += ' disabled';
    }
    if (isSelected && isCorrect === null) {
      buttonClass += ' selected';
    }
    if (isSelected && isCorrect === true) {
      buttonClass += ' correct';
    }
    if (isSelected && isCorrect === false) {
      buttonClass += ' incorrect';
    }

    return (
      <button
        key={chord}
        className={buttonClass}
        onClick={() => isAvailable && onChordSelect(chord)}
        disabled={!isAvailable || isCorrect === true}
      >
        <span className="music-term">{formatNoteName(chord, i18n.language)}</span>
      </button>
    );
  };

  return (
    <div className="chord-buttons-container">
      {/* Major Chords — chromatic order, fills left-to-right then wraps */}
      <div className="chord-section">
        <h3 className="section-title">{t('legacy.majorChords')}:</h3>
        <div className="chord-grid">
          {MAJOR_CHORDS.map(renderChordButton)}
        </div>
      </div>

      {/* Minor Chords */}
      <div className="chord-section">
        <h3 className="section-title">{t('legacy.minorChords')}:</h3>
        <div className="chord-grid">
          {MINOR_CHORDS.map(renderChordButton)}
        </div>
      </div>
    </div>
  );
};

export default ChordButtons;
