import React from 'react';
import {
  STRING_SETS,
  CAGED_ORDER,
  CHORD_QUALITIES,
  formatChordName,
  getShapeWindow,
  getChordTonesInShape,
  getColorForTone,
  getNoteNameForTone,
} from '../../utils/partialChordShapes';
import './PartialChordCard.css';

// SVG layout — wider on the right to leave room for the "Nfr" fret label.
const PAD_LEFT = 12;
const PAD_RIGHT = 34;
const STRING_SPACING = 16;
const NUM_STRINGS = 6;
const STRINGS_WIDTH = (NUM_STRINGS - 1) * STRING_SPACING;
const WIDTH = PAD_LEFT + STRINGS_WIDTH + PAD_RIGHT; // = 126
const NUT_Y = 22;
const FRET_SPACING = 22;
const NUM_FRETS = 5; // bumped from 4 so a 9 that sits past the shape still fits
const HEIGHT = NUT_Y + NUM_FRETS * FRET_SPACING + 6;
const TOP_MARKER_Y = 10;

// shapeIndex 0 = string 6 (low E) → leftmost. shapeIndex 5 = string 1 → rightmost.
const shapeIndexX = (i) => PAD_LEFT + i * STRING_SPACING;
const stringNumToShapeIndex = (stringNum) => 6 - stringNum;
const fretDotY = (offset) => NUT_Y + (offset - 0.5) * FRET_SPACING;

function markerLabel(displayMode, tone, root) {
  switch (displayMode) {
    case 'dots':  return '';
    case 'notes': return getNoteNameForTone(root, tone);
    case 'tones':
    default:      return tone;
  }
}

function Diagram({ cagedLetter, root, quality, focusedShapeIndices, displayMode }) {
  const activeSet = new Set(focusedShapeIndices);
  const window = getShapeWindow(cagedLetter, root);
  const tones = getChordTonesInShape(cagedLetter, root, quality);
  const stringsLeft = shapeIndexX(0);
  const stringsRight = shapeIndexX(NUM_STRINGS - 1);
  const fretsBottom = NUT_Y + NUM_FRETS * FRET_SPACING;
  const isOpen = window.isOpen;
  const barreFret = window.barreFret;

  // Which strings have at least one chord tone in this window?
  const stringHasTone = new Set();
  tones.forEach((t) => stringHasTone.add(t.stringNum));

  // Convert (stringNum, fret) → SVG (x, y).
  // For open-position shapes (barreFret = 0): fret 0 is an open-circle above
  // the nut; frets 1..NUM_FRETS land in fret cells 1..NUM_FRETS.
  // For movable shapes: barreFret lands in cell 1, barreFret+k → cell 1+k.
  const cellOffsetFor = (fret) => {
    if (isOpen) return fret; // 0 = above nut, 1..N = cells
    return fret - barreFret + 1;
  };

  return (
    <svg
      className="pcc-diagram"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Fret lines */}
      {Array.from({ length: NUM_FRETS }, (_, i) => {
        const y = NUT_Y + (i + 1) * FRET_SPACING;
        return (
          <line
            key={`fret-${i}`}
            x1={stringsLeft}
            y1={y}
            x2={stringsRight}
            y2={y}
            stroke="#d0d0d0"
            strokeWidth="1"
          />
        );
      })}

      {/* Nut */}
      <line
        x1={stringsLeft - 1}
        y1={NUT_Y}
        x2={stringsRight + 1}
        y2={NUT_Y}
        stroke="#333333"
        strokeWidth={isOpen ? 3 : 1.5}
      />

      {/* Fret position label */}
      {!isOpen && (
        <text
          x={stringsRight + 10}
          y={NUT_Y + FRET_SPACING / 2 + 3}
          textAnchor="start"
          fontSize="9"
          fill="#757575"
          fontWeight="600"
        >
          {barreFret}fr
        </text>
      )}

      {/* String lines */}
      {Array.from({ length: NUM_STRINGS }, (_, i) => (
        <line
          key={`str-${i}`}
          x1={shapeIndexX(i)}
          y1={NUT_Y}
          x2={shapeIndexX(i)}
          y2={fretsBottom}
          stroke="#c0c0c0"
          strokeWidth="1"
        />
      ))}

      {/* "×" marker on each string that is OUT of focus and has no chord tone
          to show in the window — communicates "don't play this string". */}
      {Array.from({ length: NUM_STRINGS }, (_, shapeIdx) => {
        const stringNum = 6 - shapeIdx;
        if (activeSet.has(shapeIdx)) return null;
        if (stringHasTone.has(stringNum)) return null;
        return (
          <text
            key={`mute-${shapeIdx}`}
            x={shapeIndexX(shapeIdx)}
            y={TOP_MARKER_Y + 4}
            textAnchor="middle"
            fontSize="11"
            fill="#9e9e9e"
            fontWeight="bold"
          >
            ×
          </text>
        );
      })}

      {/* Chord-tone markers */}
      {tones.map(({ stringNum, fret, tone }, idx) => {
        const shapeIdx = stringNumToShapeIndex(stringNum);
        const x = shapeIndexX(shapeIdx);
        const isActive = activeSet.has(shapeIdx);
        const color = getColorForTone(tone, isActive);
        const label = markerLabel(displayMode, tone, root);

        // Open-string note (fret 0) → small circle above the nut.
        if (fret === 0) {
          return (
            <g key={`tone-${idx}`}>
              <circle
                cx={x}
                cy={TOP_MARKER_Y}
                r="5.5"
                fill={isActive ? color : 'none'}
                stroke={color}
                strokeWidth="1.5"
              />
              {label && (
                <text
                  x={x}
                  y={TOP_MARKER_Y + 2.5}
                  textAnchor="middle"
                  fontSize="7"
                  fill={isActive ? '#ffffff' : color}
                  fontWeight="bold"
                >
                  {label}
                </text>
              )}
            </g>
          );
        }

        // Fretted note inside the window.
        const cellOffset = cellOffsetFor(fret);
        // Guard: cell must fit in the rendered window.
        if (cellOffset < 1 || cellOffset > NUM_FRETS) return null;

        const y = fretDotY(cellOffset);
        return (
          <g key={`tone-${idx}`}>
            <circle cx={x} cy={y} r="7.5" fill={color} />
            {label && (
              <text
                x={x}
                y={y + 2.5}
                textAnchor="middle"
                fontSize="7.5"
                fill="#ffffff"
                fontWeight="bold"
              >
                {label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function PartialChordCard({
  chord,
  isActive,
  onSelect,
  onNavCaged,
  onNavSet,
  onRemove,
  displayMode = 'tones',
}) {
  const { root, quality, cagedIdx, setIdx } = chord;
  const cagedLetter = CAGED_ORDER[cagedIdx];
  const stringSet = STRING_SETS[setIdx] || STRING_SETS[3];
  const qual = CHORD_QUALITIES[quality];

  // Tone line — what intervals fall on the focused strings.
  const tones = getChordTonesInShape(cagedLetter, root, quality);
  const focused = new Set(stringSet.shapeIndices);
  const tonesOnFocus = tones
    .filter((t) => focused.has(stringNumToShapeIndex(t.stringNum)))
    .map((t) => t.tone);
  // De-dup while preserving order.
  const seen = new Set();
  const uniqueTones = tonesOnFocus.filter((t) => (seen.has(t) ? false : (seen.add(t), true)));
  const toneLine = uniqueTones.length > 0 ? uniqueTones.join(' • ') : '—';

  const stopAnd = (fn) => (e) => {
    e.stopPropagation();
    fn();
  };

  return (
    <div
      className={`pcc-card ${isActive ? 'pcc-card-active' : ''}`}
      onClick={onSelect}
    >
      {onRemove && (
        <button
          className="pcc-remove"
          onClick={stopAnd(onRemove)}
          aria-label="Remove chord"
          title="Remove"
        >
          ×
        </button>
      )}

      <div className="pcc-name">{formatChordName(root, quality)}</div>
      {qual && (
        <div className="pcc-quality-sub" title={qual.intervals.join(' ')}>
          {qual.intervals.join(' · ')}
        </div>
      )}

      <div className="pcc-nav pcc-nav-caged">
        <button className="pcc-arrow" onClick={stopAnd(() => onNavCaged(-1))} aria-label="Previous CAGED shape">‹</button>
        <span className="pcc-nav-label">CAGED: <b>{cagedLetter}</b></span>
        <button className="pcc-arrow" onClick={stopAnd(() => onNavCaged(1))} aria-label="Next CAGED shape">›</button>
      </div>

      <Diagram
        cagedLetter={cagedLetter}
        root={root}
        quality={quality}
        focusedShapeIndices={stringSet.shapeIndices}
        displayMode={displayMode}
      />

      <div className="pcc-nav pcc-nav-set">
        <button className="pcc-arrow" onClick={stopAnd(() => onNavSet(-1))} aria-label="Previous string set">‹</button>
        <span className="pcc-nav-label">{stringSet.label}</span>
        <button className="pcc-arrow" onClick={stopAnd(() => onNavSet(1))} aria-label="Next string set">›</button>
      </div>

      <div className="pcc-tones">{toneLine}</div>
    </div>
  );
}

export default PartialChordCard;
