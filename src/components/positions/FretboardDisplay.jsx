import React, { useMemo } from 'react';
import { FRETBOARD_CONFIG, STRING_TUNING } from '../../constants/positionData';
import { getArpeggioNoteSet } from '../../utils/positionCalculations';
import { ARPEGGIOS } from './ArpeggioOptionsBar';
import './FretboardDisplay.css';

// Pentatonic scale degrees (1-indexed)
const PENTATONIC_DEGREES = {
  major: [1, 2, 3, 5, 6],
  minor: [1, 3, 4, 5, 7],
};

// How box-shadow rings work:
// Each visible "ring" is made of TWO shadows listed consecutively:
//   1. A BACKGROUND shadow (smaller spread) listed FIRST → drawn ON TOP → punches a hole
//   2. A COLORED shadow (larger spread) listed SECOND → drawn BELOW → the visible ring
//
// Example for one ring of color C at spread 3px, with bg at 1px:
//   "0 0 0 1px BG, 0 0 0 3px C"
//   → C fills 0-3px out from edge; BG covers 0-1px on top → visible color: 1-3px band
//
// For multiple rings, list innermost pair first (drawn on top of outer ones).
// RING_SLOTS[0] = first selected arpeggio = innermost ring (smallest spread).
const BG = '#1a1a2e'; // must match the page background color
const RING_SLOTS = [
  { color: 3, bg: 0 },   // innermost: 0-3px band (no bg hole needed — note itself is the hole)
  { color: 6, bg: 3 },   // middle:    3-6px band (bg at 3px punches hole inside)
  { color: 9, bg: 6 },   // outermost: 6-9px band
];

const FretboardDisplay = ({
  notes,
  displayMode,
  showAll,
  selectedPositions,
  showPentatonic,
  selectedType,
  activeArpeggios = [],
  selectedRoot,
  hideRoots = false,
}) => {
  const { frets, positionMarkers, doubleMarkers } = FRETBOARD_CONFIG;

  // Build a lookup map for quick access: "string-fret" -> note
  const noteMap = useMemo(() => {
    const map = new Map();
    for (const note of notes) {
      map.set(`${note.string}-${note.fret}`, note);
    }
    return map;
  }, [notes]);

  // Build arpeggio note sets for each active arpeggio, in selection order
  const arpeggioSets = useMemo(() => {
    if (!activeArpeggios.length || !selectedRoot) return [];
    return activeArpeggios.map(id => ({
      id,
      color: ARPEGGIOS.find(a => a.id === id)?.color ?? '#fff',
      noteSet: getArpeggioNoteSet(id, selectedRoot, selectedType),
    }));
  }, [activeArpeggios, selectedRoot, selectedType]);

  const fretNumbers = Array.from({ length: frets + 1 }, (_, i) => i);
  const strings = [1, 2, 3, 4, 5, 6]; // high E to low E

  const getNoteLabel = (note) => {
    if (displayMode === 'dots') return '';
    if (displayMode === 'notes') return note.note;
    if (displayMode === 'degrees') return note.scaleDegree;
    return '';
  };

  const getNoteClass = (note) => {
    const classes = ['fretboard-note'];
    if (!hideRoots && note.isMajorRoot) classes.push('major-root');
    else if (!hideRoots && note.isMinorRoot) classes.push('minor-root');
    else classes.push('scale-tone');

    if (showAll && note.isHighlighted) classes.push('highlighted');
    if (displayMode === 'dots') classes.push('dot-only');

    if (showPentatonic && PENTATONIC_DEGREES[selectedType]?.includes(note.scaleDegree)) {
      classes.push('pentatonic');
    }

    return classes.join(' ');
  };

  /**
   * Build an inline style for arpeggio rings.
   * Each active arpeggio that contains this note adds one concentric ring
   * (innermost = first selected, outermost = last selected).
   */
  const getNoteStyle = (note) => {
    if (!arpeggioSets.length) return undefined;

    const matchingArps = arpeggioSets.filter(a => a.noteSet.has(note.note));
    if (!matchingArps.length) return undefined;

    // Build shadow list innermost-first (CSS renders first entry on top).
    // Each arpeggio ring = bg shadow (punches hole) + color shadow (the ring).
    // matchingArps[0] = first selected = innermost ring = RING_SLOTS[0].
    const shadows = [];
    matchingArps.forEach((arp, i) => {
      const slot = RING_SLOTS[i] ?? RING_SLOTS[RING_SLOTS.length - 1];
      // bg shadow punches the hole inside this ring (listed first = on top)
      if (slot.bg > 0) {
        shadows.push(`0 0 0 ${slot.bg}px ${BG}`);
      }
      // colored ring shadow (listed after = underneath the hole)
      shadows.push(`0 0 0 ${slot.color}px ${arp.color}`);
    });

    return { boxShadow: shadows.join(', ') };
  };

  return (
    <div className={`fretboard-container${activeArpeggios.length ? ' arpeggio-active' : ''}`}>
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
              {noteMap.has(`${stringNum}-0`) && (() => {
                const note = noteMap.get(`${stringNum}-0`);
                return (
                  <div
                    className={getNoteClass(note)}
                    style={getNoteStyle(note)}
                  >
                    {getNoteLabel(note)}
                  </div>
                );
              })()}
            </div>

            {/* Fret cells */}
            {fretNumbers.slice(1).map(fret => {
              const note = noteMap.get(`${stringNum}-${fret}`);
              return (
                <div key={fret} className="fret-cell">
                  <div className="string-line" />
                  <div className="fret-line" />
                  {note && (
                    <div
                      className={getNoteClass(note)}
                      style={getNoteStyle(note)}
                    >
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
