import React, { useMemo } from 'react';
import { FRETBOARD_CONFIG, STRING_TUNING } from '../../constants/positionData';
import './FretboardDisplay.css';

const FretboardDisplay = ({ notes, displayMode, showAll, selectedPositions }) => {
  const { frets, positionMarkers, doubleMarkers } = FRETBOARD_CONFIG;

  // Build a lookup map for quick access: "string-fret" -> note
  const noteMap = useMemo(() => {
    const map = new Map();
    for (const note of notes) {
      map.set(`${note.string}-${note.fret}`, note);
    }
    return map;
  }, [notes]);

  const fretNumbers = Array.from({ length: frets + 1 }, (_, i) => i); // 0-15
  const strings = [1, 2, 3, 4, 5, 6]; // high E to low E

  const getNoteLabel = (note) => {
    if (displayMode === 'dots') return '';
    if (displayMode === 'notes') return note.note;
    if (displayMode === 'degrees') return note.scaleDegree;
    return '';
  };

  const getNoteClass = (note) => {
    const classes = ['fretboard-note'];
    if (note.isMajorRoot) classes.push('major-root');
    else if (note.isMinorRoot) classes.push('minor-root');
    else classes.push('scale-tone');

    if (showAll && note.isHighlighted) classes.push('highlighted');
    if (displayMode === 'dots') classes.push('dot-only');

    return classes.join(' ');
  };

  return (
    <div className="fretboard-container">
      {/* Fret numbers */}
      <div className="fret-numbers">
        <div className="fret-number nut-label"></div>
        {fretNumbers.slice(1).map(fret => (
          <div key={fret} className={`fret-number ${positionMarkers.includes(fret) ? 'marked' : ''}`}>
            {fret}
          </div>
        ))}
      </div>

      {/* Fretboard */}
      <div className="fretboard">
        {/* Position markers (dots on fretboard) */}
        <div className="position-markers">
          {fretNumbers.slice(1).map(fret => (
            <div key={fret} className="marker-slot">
              {positionMarkers.includes(fret) && (
                <div className={`marker-dot ${doubleMarkers.includes(fret) ? 'double' : ''}`}>
                  {doubleMarkers.includes(fret) && <div className="marker-dot second" />}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Strings */}
        {strings.map(stringNum => (
          <div key={stringNum} className="guitar-string-row">
            {/* Open string / nut */}
            <div className="nut-cell">
              <div className="string-label">{STRING_TUNING[stringNum - 1]}</div>
              {noteMap.has(`${stringNum}-0`) && (
                <div className={getNoteClass(noteMap.get(`${stringNum}-0`))}>
                  {getNoteLabel(noteMap.get(`${stringNum}-0`))}
                </div>
              )}
            </div>

            {/* Fret cells */}
            {fretNumbers.slice(1).map(fret => {
              const note = noteMap.get(`${stringNum}-${fret}`);
              return (
                <div key={fret} className="fret-cell">
                  <div className="string-line" />
                  <div className="fret-line" />
                  {note && (
                    <div className={getNoteClass(note)}>
                      {getNoteLabel(note)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(FretboardDisplay);
