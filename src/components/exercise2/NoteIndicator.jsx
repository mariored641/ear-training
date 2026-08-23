import React from 'react';
import { useTranslation } from 'react-i18next';
import './NoteIndicator.css';

/**
 * Note indicator component showing progress through a melody
 * @param {Object} props
 * @param {number} props.totalNotes - Total notes in melody
 * @param {number} props.currentNoteIndex - Current note index (0-based)
 * @param {Array} props.markedNotes - Array of marked notes
 */
const NoteIndicator = ({ totalNotes, currentNoteIndex, markedNotes }) => {
  const { t } = useTranslation();
  const notes = Array.from({ length: totalNotes }, (_, i) => i);

  return (
    <div className="note-indicator">
      <p className="note-indicator-text">{t('legacy.findNotes')}:</p>
      <div className="note-indicator-grid">
        {notes.map(index => {
          const isMarked = markedNotes.some(note =>
            note.noteIndices.includes(index + 1)
          );
          const isCurrent = index === currentNoteIndex;

          return (
            <div
              key={index}
              className={`note-indicator-item ${isCurrent ? 'current' : ''} ${
                isMarked ? 'marked' : ''
              }`}
            >
              <span className="note-label">{t('legacy.noteNumber', { current: index + 1, total: totalNotes })}:</span>
              <span className="note-status">{isMarked ? '✓' : '●'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NoteIndicator;
