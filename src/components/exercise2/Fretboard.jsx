import React from 'react';
import { GUITAR_STRINGS, FRET_DOTS, DOUBLE_DOTS } from '../../constants/notes';
import { getNoteAtFret } from '../../utils/fretboardCalculations';
import './Fretboard.css';

/**
 * Interactive fretboard component
 * @param {Object} props
 * @param {Object} props.fretRange - { from, to }
 * @param {Object} props.strings - Which strings are active
 * @param {boolean} props.showNoteNames - Show note names on frets
 * @param {boolean} props.showDots - Show fret dots
 * @param {Array} props.markedNotes - Array of marked notes with {noteIndex, string, fret}
 * @param {number} props.currentNoteIndex - Current note being marked (for "inOrder" mode)
 * @param {Function} props.onFretClick - Click handler (string, fret)
 * @param {Object} props.highlightedNote - Note being highlighted during playback {string, fret}
 * @param {string} props.marking - 'inOrder' or 'free'
 * @param {number} props.selectedNoteIndex - Currently selected note in free mode
 */
const Fretboard = ({
  fretRange,
  strings,
  showNoteNames,
  showDots,
  markedNotes = [],
  currentNoteIndex = 0,
  onFretClick,
  highlightedNote = null,
  marking = 'inOrder',
  selectedNoteIndex = 0
}) => {
  const frets = [];
  for (let i = fretRange.from; i <= fretRange.to; i++) {
    frets.push(i);
  }

  const activeStrings = GUITAR_STRINGS.filter((_, i) => {
    const stringKey = Object.keys(strings)[i];
    return strings[stringKey];
  });

  const getMarkedNote = (stringIndex, fret) => {
    return markedNotes.find(
      note => note.string === stringIndex && note.fret === fret
    );
  };

  const isHighlighted = (stringIndex, fret) => {
    return (
      highlightedNote &&
      highlightedNote.string === stringIndex &&
      highlightedNote.fret === fret
    );
  };

  return (
    <div className="fretboard-container">
      <div className="fretboard">
        {/* String labels */}
        <div className="string-labels">
          {activeStrings.map(string => (
            <div key={string.index} className="string-label">
              {string.name}
            </div>
          ))}
        </div>

        {/* Fretboard grid */}
        <div className="fretboard-grid">
          {activeStrings.map(string => (
            <div key={string.index} className="fretboard-string">
              {frets.map(fret => {
                const markedNote = getMarkedNote(string.index, fret);
                const highlighted = isHighlighted(string.index, fret);
                const noteInfo = getNoteAtFret(string.index, fret);

                return (
                  <div
                    key={fret}
                    className={`fret-cell ${markedNote ? 'marked' : ''} ${
                      highlighted ? 'highlighted' : ''
                    }`}
                    onClick={() => onFretClick(string.index, fret)}
                  >
                    {markedNote && (
                      <div className="marked-note">
                        ●
                        <span className="note-numbers">
                          {markedNote.noteIndices.join(',')}
                        </span>
                      </div>
                    )}
                    {showNoteNames && !markedNote && (
                      <span className="note-name">{noteInfo.note}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Fret numbers */}
        <div className="fret-numbers">
          {frets.map(fret => (
            <div key={fret} className="fret-number">
              {fret}
            </div>
          ))}
        </div>

        {/* Fret dots */}
        {showDots && (
          <div className="fret-dots">
            {frets.map(fret => (
              <div key={fret} className="dot-container">
                {FRET_DOTS.includes(fret) && (
                  <div className={`dot ${DOUBLE_DOTS.includes(fret) ? 'double' : ''}`}>
                    •{DOUBLE_DOTS.includes(fret) && ' •'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Fretboard;
