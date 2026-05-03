import React, { useRef, useCallback, useMemo } from 'react';
import { CHROMATIC_SCALE, STRING_TUNING, FRETBOARD_CONFIG } from '../../constants/positionData';
import { INTERVAL_NAMES } from '../../constants/allScalesData';
import './AllScalesFretboard.css';

const { frets, positionMarkers, doubleMarkers } = FRETBOARD_CONFIG;
const LONG_PRESS_MS = 500;
const BG = '#f5f5f5';

const RING_SLOTS = [
  { color: 4, bg: 0 },
  { color: 8, bg: 4 },
  { color: 12, bg: 8 },
  { color: 16, bg: 12 },
];

function getNoteAt(stringNum, fret) {
  const openIdx = CHROMATIC_SCALE.indexOf(STRING_TUNING[stringNum - 1]);
  return CHROMATIC_SCALE[(openIdx + fret) % 12];
}

const AllScalesFretboard = ({
  activeNoteClasses,   // Set<string>
  selectedRoot,
  highlightColors,     // { noteName: colorHex }
  fretRangeStart,      // number | null
  fretRangeEnd,        // number | null
  chordOverlays,       // [{ id, notesSet: Set, color }]
  displayMode,         // 'dots' | 'notes' | 'degrees'
  activeStrings,       // Set<number> | null  (null = all visible)
  onNoteClick,
  onNoteLongPress,
  onFretClick,
  onStringClick,       // (stringNum) => void
  onCellClick,         // (stringNum, fret, noteName) => void  — overrides onNoteClick when present
  markedCells,         // Map<`${stringNum}-${fret}`, { label: string, color?: string }> | null
  disableInactiveStringClicks,  // boolean — dimmed strings not clickable
}) => {
  const timers = useRef({});
  const longPressed = useRef({});
  const pointerStart = useRef({});

  const handlePD = useCallback((noteName, key, e) => {
    longPressed.current[key] = false;
    pointerStart.current[key] = { x: e.clientX, y: e.clientY };
    timers.current[key] = setTimeout(() => {
      longPressed.current[key] = true;
      onNoteLongPress(noteName);
    }, LONG_PRESS_MS);
  }, [onNoteLongPress]);

  const handlePU = useCallback((noteName, key, stringNum, fret) => {
    if (timers.current[key]) {
      clearTimeout(timers.current[key]);
      delete timers.current[key];
    }
    if (!longPressed.current[key]) {
      if (onCellClick) {
        onCellClick(stringNum, fret, noteName);
      } else {
        onNoteClick(noteName);
      }
    }
    delete longPressed.current[key];
    delete pointerStart.current[key];
  }, [onNoteClick, onCellClick]);

  const handlePM = useCallback((key, e) => {
    const start = pointerStart.current[key];
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.sqrt(dx * dx + dy * dy) > 8) {
      if (timers.current[key]) {
        clearTimeout(timers.current[key]);
        delete timers.current[key];
      }
    }
  }, []);

  const handlePL = useCallback((key) => {
    if (timers.current[key]) {
      clearTimeout(timers.current[key]);
      delete timers.current[key];
    }
    delete longPressed.current[key];
    delete pointerStart.current[key];
  }, []);

  // Fret range logic
  const hasRange = fretRangeStart !== null && fretRangeEnd !== null;
  const rangeMin = hasRange ? Math.min(fretRangeStart, fretRangeEnd) : null;
  const rangeMax = hasRange ? Math.max(fretRangeStart, fretRangeEnd) : null;
  const pendingRange = fretRangeStart !== null && fretRangeEnd === null;

  const isFretDimmed = useCallback((fret) => {
    if (!hasRange) return false;
    return fret < rangeMin || fret > rangeMax;
  }, [hasRange, rangeMin, rangeMax]);

  const getFretRangeClass = useCallback((fret) => {
    if (pendingRange && fret === fretRangeStart) return 'range-pending';
    if (!hasRange) return '';
    if (fret === rangeMin || fret === rangeMax) return 'range-edge';
    if (fret > rangeMin && fret < rangeMax) return 'range-inner';
    return '';
  }, [hasRange, pendingRange, rangeMin, rangeMax, fretRangeStart]);

  // Get note label based on display mode
  const getLabel = useCallback((noteName) => {
    if (displayMode === 'dots') return '';
    if (displayMode === 'notes') return noteName;
    if (displayMode === 'degrees') {
      const rootIdx = CHROMATIC_SCALE.indexOf(selectedRoot);
      const noteIdx = CHROMATIC_SCALE.indexOf(noteName);
      const semitones = (noteIdx - rootIdx + 12) % 12;
      return INTERVAL_NAMES[semitones] ?? '?';
    }
    return '';
  }, [displayMode, selectedRoot]);

  // Build chord ring shadows for a note
  const getChordRingStyle = useCallback((noteName) => {
    if (!chordOverlays.length) return undefined;
    const matching = chordOverlays.filter(c => c.notesSet.has(noteName));
    if (!matching.length) return undefined;
    const shadows = [];
    matching.forEach((ov, i) => {
      const slot = RING_SLOTS[Math.min(i, RING_SLOTS.length - 1)];
      if (slot.bg > 0) shadows.push(`0 0 0 ${slot.bg}px ${BG}`);
      shadows.push(`0 0 0 ${slot.color}px ${ov.color}`);
    });
    return { boxShadow: shadows.join(', ') };
  }, [chordOverlays]);

  const isStringDimmed = useCallback((stringNum) => {
    if (!activeStrings) return false;
    return !activeStrings.has(stringNum);
  }, [activeStrings]);

  const fretNumbers = useMemo(() => Array.from({ length: frets + 1 }, (_, i) => i), []);
  const strings = [1, 2, 3, 4, 5, 6];

  const renderCell = (stringNum, fret) => {
    const noteName = getNoteAt(stringNum, fret);
    const isActive = activeNoteClasses.has(noteName);
    const isRoot = isActive && noteName === selectedRoot;
    const highlightColor = isActive ? highlightColors[noteName] : null;
    const dimmed = isFretDimmed(fret);
    const key = `${stringNum}-${fret}`;
    const ringStyle = getChordRingStyle(noteName); // check overlays regardless of isActive
    const isChordOnly = !isActive && !!ringStyle;   // in chord overlay but not in scale
    const marked = markedCells?.get(key);
    const stringDimmed = isStringDimmed(stringNum);
    const clickDisabled = disableInactiveStringClicks && stringDimmed;

    const noteClasses = [
      'asf-note',
      marked ? 'marked' : isRoot ? 'root' : isActive ? 'active' : isChordOnly ? 'chord-only' : 'inactive',
      highlightColor && !marked ? 'highlighted' : '',
      displayMode === 'dots' && !marked ? 'dot-mode' : '',
    ].filter(Boolean).join(' ');

    const noteStyle = marked
      ? (marked.color ? { backgroundColor: marked.color } : undefined)
      : (highlightColor && isActive && !isRoot
          ? { backgroundColor: highlightColor, color: '#1a1a2e', ...(ringStyle || {}) }
          : ringStyle || undefined);

    const pointerHandlers = clickDisabled ? {} : {
      onPointerDown: (e) => handlePD(noteName, key, e),
      onPointerUp: () => handlePU(noteName, key, stringNum, fret),
      onPointerMove: (e) => handlePM(key, e),
      onPointerLeave: () => handlePL(key),
      onContextMenu: (e) => { e.preventDefault(); if (isActive) onNoteLongPress(noteName); },
    };

    return (
      <div
        key={fret}
        className={`asf-fret-cell${dimmed ? ' dimmed' : ''}${clickDisabled ? ' click-disabled' : ''}`}
        {...pointerHandlers}
      >
        <div className="asf-string-line" />
        <div className="asf-fret-line" />
        <div className={noteClasses} style={noteStyle}>
          {marked ? marked.label : ((isActive || isChordOnly) ? getLabel(noteName) : '')}
        </div>
      </div>
    );
  };

  const renderNutCell = (stringNum) => {
    const noteName = getNoteAt(stringNum, 0);
    const isActive = activeNoteClasses.has(noteName);
    const isRoot = isActive && noteName === selectedRoot;
    const highlightColor = isActive ? highlightColors[noteName] : null;
    const dimmed = isFretDimmed(0);
    const key = `${stringNum}-0`;
    const ringStyle = getChordRingStyle(noteName);
    const isChordOnly = !isActive && !!ringStyle;
    const marked = markedCells?.get(key);
    const stringDimmed = isStringDimmed(stringNum);
    const clickDisabled = disableInactiveStringClicks && stringDimmed;

    const noteClasses = [
      'asf-note',
      marked ? 'marked' : isRoot ? 'root' : isActive ? 'active' : isChordOnly ? 'chord-only' : 'inactive',
      highlightColor && !marked ? 'highlighted' : '',
      displayMode === 'dots' && !marked ? 'dot-mode' : '',
    ].filter(Boolean).join(' ');

    const noteStyle = marked
      ? (marked.color ? { backgroundColor: marked.color } : undefined)
      : (highlightColor && isActive && !isRoot
          ? { backgroundColor: highlightColor, color: '#1a1a2e', ...(ringStyle || {}) }
          : ringStyle || undefined);

    const stringActive = !activeStrings || activeStrings.has(stringNum);

    const pointerHandlers = clickDisabled ? {} : {
      onPointerDown: (e) => handlePD(noteName, key, e),
      onPointerUp: () => handlePU(noteName, key, stringNum, 0),
      onPointerMove: (e) => handlePM(key, e),
      onPointerLeave: () => handlePL(key),
      onContextMenu: (e) => { e.preventDefault(); if (isActive) onNoteLongPress(noteName); },
    };

    return (
      <div
        className={`asf-nut-cell${dimmed ? ' dimmed' : ''}${clickDisabled ? ' click-disabled' : ''}`}
        {...pointerHandlers}
      >
        <button
          className={`asf-string-label${stringActive ? ' active' : ''}`}
          onClick={(e) => { e.stopPropagation(); onStringClick?.(stringNum); }}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
        >
          {STRING_TUNING[stringNum - 1]}
        </button>
        <div className={noteClasses} style={noteStyle}>
          {marked ? marked.label : ((isActive || isChordOnly) ? getLabel(noteName) : '')}
        </div>
      </div>
    );
  };

  return (
    <div className="asf-container">
      {/* Fret numbers (top) */}
      <div className="asf-fret-numbers">
        <div className="asf-fret-num nut-spacer" />
        {fretNumbers.slice(1).map(fret => (
          <div
            key={fret}
            className={`asf-fret-num${positionMarkers.includes(fret) ? ' marked' : ''}`}
          >
            {fret}
          </div>
        ))}
      </div>

      {/* Fretboard */}
      <div className="asf-fretboard">
        {/* Position marker dots */}
        <div className="asf-markers">
          {fretNumbers.slice(1).map(fret => (
            <div key={fret} className="asf-marker-slot">
              {positionMarkers.includes(fret) && (
                <div className={`asf-marker-dot${doubleMarkers.includes(fret) ? ' double' : ''}`}>
                  {doubleMarkers.includes(fret) && <div className="asf-marker-dot second" />}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Strings */}
        {strings.map(stringNum => (
          <div key={stringNum} className={`asf-string-row${isStringDimmed(stringNum) ? ' string-dimmed' : ''}`}>
            {renderNutCell(stringNum)}
            {fretNumbers.slice(1).map(fret => renderCell(stringNum, fret))}
          </div>
        ))}
      </div>

      {/* Fret range selector (below fretboard) */}
      <div className="asf-range-bar">
        {fretNumbers.map(fret => (
          <button
            key={fret}
            className={`asf-range-btn${fret === 0 ? ' nut' : ''} ${getFretRangeClass(fret)}`}
            onClick={() => onFretClick(fret)}
          >
            {fret}
          </button>
        ))}
      </div>
    </div>
  );
};

export default React.memo(AllScalesFretboard);
