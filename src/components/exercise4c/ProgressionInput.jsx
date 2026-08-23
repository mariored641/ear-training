import React from 'react';
import { useTranslation } from 'react-i18next';
import { MAJOR_CHORDS, MINOR_CHORDS, NOTE_NAMES } from '../../constants/harmonicDefaults';
import { formatNoteName } from '../../i18n/musicTerms.js';
import './ProgressionInput.css';

const ProgressionInput = ({
  progression,
  currentChordIndex,
  selectedChords,
  selectedBassNotes,
  withInversions,
  availableChords,
  onChordSelect,
  onBassNoteSelect
}) => {
  const { t, i18n } = useTranslation();
  const renderChordSection = (chordIndex) => {
    const isActive = chordIndex === currentChordIndex;
    const isCompleted = chordIndex < currentChordIndex;
    const isLocked = chordIndex > currentChordIndex;
    const selectedChord = selectedChords[chordIndex];
    const selectedBass = selectedBassNotes[chordIndex];

    // For with inversions mode: bass input only active after chord is selected
    const isBassActive = withInversions && isActive && selectedChord;

    let containerClass = 'progression-input-section';
    if (isActive) containerClass += ' active';
    if (isCompleted) containerClass += ' completed';
    if (isLocked) containerClass += ' locked';

    return (
      <div key={chordIndex} className={containerClass}>
        <div className="section-header">
          <h3>{t('legacy.chordNumber', { number: chordIndex + 1 })}:</h3>
          {isCompleted && <span className="completed-badge">✓</span>}
          {isLocked && <span className="locked-badge">🔒</span>}
        </div>

        {/* Chord buttons */}
        <div className="chord-buttons-section">
          <div className="chord-group">
            <h4>{t('legacy.major')}:</h4>
            <div className="chord-grid">
              {MAJOR_CHORDS.filter(c => availableChords[c]).map(chord => {
                const isSelected = selectedChord === chord;
                let btnClass = 'chord-btn';
                if (isLocked || isCompleted) btnClass += ' disabled';
                if (isSelected) btnClass += ' selected';

                return (
                  <button
                    key={chord}
                    className={btnClass}
                    onClick={() => isActive && onChordSelect(chordIndex, chord)}
                    disabled={isLocked || isCompleted}
                  >
                    <span className="music-term">{formatNoteName(chord, i18n.language)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="chord-group">
            <h4>{t('legacy.minor')}:</h4>
            <div className="chord-grid">
              {MINOR_CHORDS.filter(c => availableChords[c]).map(chord => {
                const isSelected = selectedChord === chord;
                let btnClass = 'chord-btn';
                if (isLocked || isCompleted) btnClass += ' disabled';
                if (isSelected) btnClass += ' selected';

                return (
                  <button
                    key={chord}
                    className={btnClass}
                    onClick={() => isActive && onChordSelect(chordIndex, chord)}
                    disabled={isLocked || isCompleted}
                  >
                    <span className="music-term">{formatNoteName(chord, i18n.language)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bass note buttons (only in with inversions mode) */}
        {withInversions && (
          <div className="bass-buttons-section">
            <h4>{t('legacy.bassNoteNumber', { number: chordIndex + 1 })}:</h4>
            <div className="bass-grid">
              {NOTE_NAMES.map(note => {
                const isSelected = selectedBass === note;
                let btnClass = 'bass-btn';
                if (!isBassActive || isCompleted) btnClass += ' disabled';
                if (isSelected) btnClass += ' selected';

                return (
                  <button
                    key={note}
                    className={btnClass}
                    onClick={() => isBassActive && onBassNoteSelect(chordIndex, note)}
                    disabled={!isBassActive || isCompleted}
                  >
                    <span className="music-term">{formatNoteName(note, i18n.language)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="progression-input-container">
      {progression.map((_, index) => renderChordSection(index))}
    </div>
  );
};

export default ProgressionInput;
