import React from 'react';
import './ChordSectionDisplay.css';

const ChordSectionDisplay = ({
  chordIndex,
  chord,
  chordTones,
  numNotes,
  isActive,
  isCompleted,
  isLocked,
  identifiedNotes,
  currentNoteInChord,
  onNoteSelect
}) => {
  const renderNoteButtons = (noteIndex) => {
    const isCurrentNote = isActive && noteIndex === currentNoteInChord;
    const isIdentified = identifiedNotes.some(n => n.noteIndex === noteIndex);

    return (
      <div key={noteIndex} className="note-row">
        <span className="note-label">Note {noteIndex + 1}:</span>
        <div className="note-buttons">
          {chordTones.map(tone => {
            const isSelected = isIdentified && identifiedNotes.find(n => n.noteIndex === noteIndex);

            let buttonClass = 'note-btn';
            if (isLocked || isCompleted || !isCurrentNote) {
              buttonClass += ' disabled';
            }
            if (isSelected) {
              buttonClass += ' selected';
            }

            return (
              <button
                key={tone}
                className={buttonClass}
                onClick={() => isCurrentNote && onNoteSelect(noteIndex, tone)}
                disabled={isLocked || isCompleted || !isCurrentNote}
              >
                {tone}
                {isSelected && <span className="number-indicator">①</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  let containerClass = 'chord-section-display';
  if (isActive) containerClass += ' active';
  if (isCompleted) containerClass += ' completed';
  if (isLocked) containerClass += ' locked';

  return (
    <div className={containerClass}>
      <div className="chord-section-header">
        <h3 className="chord-name">
          {chord} ({numNotes} note{numNotes > 1 ? 's' : ''})
          {isActive && ' ← Currently Active'}
          {isLocked && ' 🔒'}
        </h3>
        {isCompleted && <span className="completed-badge">✓ Completed</span>}
      </div>

      <div className="available-tones">
        Available: {chordTones.join(', ')}
      </div>

      <div className="notes-container">
        {Array.from({ length: numNotes }, (_, i) => renderNoteButtons(i))}
      </div>
    </div>
  );
};

export default ChordSectionDisplay;
