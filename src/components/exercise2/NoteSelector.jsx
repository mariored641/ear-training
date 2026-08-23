import React from 'react';
import { useTranslation } from 'react-i18next';
import './NoteSelector.css';

/**
 * Note selector component for "free" marking mode
 * @param {Object} props
 * @param {number} props.totalNotes - Total notes in melody
 * @param {number} props.selectedNoteIndex - Currently selected note index (0-based)
 * @param {Function} props.onNoteSelect - Note selection handler
 * @param {Array} props.markedNotes - Array of marked notes
 */
const NoteSelector = ({
  totalNotes,
  selectedNoteIndex,
  onNoteSelect,
  markedNotes
}) => {
  const { t } = useTranslation();
  const notes = Array.from({ length: totalNotes }, (_, i) => i);

  const isMarked = (index) => {
    return markedNotes.some(note => note.noteIndices.includes(index + 1));
  };

  return (
    <div className="note-selector">
      <p className="note-selector-text">{t('legacy.selectNoteToMark')}:</p>
      <div className="note-selector-buttons">
        {notes.map(index => (
          <button
            key={index}
            className={`note-selector-button ${
              selectedNoteIndex === index ? 'active' : ''
            } ${isMarked(index) ? 'marked' : ''}`}
            onClick={() => onNoteSelect(index)}
          >
            {index + 1}
            {isMarked(index) && ' ✓'}
          </button>
        ))}
      </div>
    </div>
  );
};

export default NoteSelector;
