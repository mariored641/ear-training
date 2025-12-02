import React from 'react';
import { NOTES } from '../../constants/notes';
import './NoteButtons.css';

/**
 * Note buttons component for Exercise 1
 * @param {Object} props
 * @param {Object} props.availableNotes - Object mapping note names to boolean
 * @param {string} props.selectedNote - Currently selected note
 * @param {boolean} props.isCorrect - Whether the selection was correct
 * @param {Function} props.onNoteSelect - Note selection handler
 * @param {boolean} props.disabled - Whether buttons are disabled
 */
const NoteButtons = ({
  availableNotes,
  selectedNote,
  isCorrect,
  onNoteSelect,
  disabled = false
}) => {
  const getButtonClass = (note) => {
    let className = 'note-button';

    if (!availableNotes[note]) {
      className += ' disabled';
    }

    if (selectedNote === note) {
      if (isCorrect === true) {
        className += ' correct';
      } else if (isCorrect === false) {
        className += ' incorrect';
      }
    }

    return className;
  };

  return (
    <div className="note-buttons-container">
      <div className="note-buttons-grid">
        {NOTES.map(note => (
          <button
            key={note}
            className={getButtonClass(note)}
            onClick={() => onNoteSelect(note)}
            disabled={disabled || !availableNotes[note]}
            aria-label={`Note ${note}`}
          >
            {note}
          </button>
        ))}
      </div>
    </div>
  );
};

export default NoteButtons;
