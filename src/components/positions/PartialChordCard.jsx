import React from 'react';
import {
  getPartialChordShape,
  getBarreFret,
  getNoteNameForTone,
  STRING_SETS,
  CAGED_ORDER,
} from '../../utils/partialChordShapes';
import './PartialChordCard.css';

// SVG layout — wider on the right to leave room for the "Nfr" fret label.
const PAD_LEFT = 12;
const PAD_RIGHT = 34;
const STRING_SPACING = 16;
const NUM_STRINGS = 6;
const STRINGS_WIDTH = (NUM_STRINGS - 1) * STRING_SPACING;
const WIDTH = PAD_LEFT + STRINGS_WIDTH + PAD_RIGHT; // = 12 + 80 + 34 = 126
const NUT_Y = 22;
const FRET_SPACING = 22;
const NUM_FRETS = 4;
const HEIGHT = NUT_Y + NUM_FRETS * FRET_SPACING + 6; // = 116
const TOP_MARKER_Y = 10;

const stringX = (i) => PAD_LEFT + i * STRING_SPACING;
const fretDotY = (offset) => NUT_Y + (offset - 0.5) * FRET_SPACING;

function displayChordName(root, quality) {
  return quality === 'minor' ? `${root}m` : root;
}

function markerLabel(entry, displayMode, root) {
  if (!entry) return '';
  switch (displayMode) {
    case 'dots':
      return '';
    case 'fingers':
      return entry.finger === 0 ? '' : String(entry.finger);
    case 'notes':
      return getNoteNameForTone(root, entry.tone);
    case 'tones':
    default:
      return entry.tone;
  }
}

function Diagram({ shape, activeShapeIndices, displayMode, root, barreFret }) {
  const activeSet = new Set(activeShapeIndices);
  const stringsLeft = stringX(0);
  const stringsRight = stringX(NUM_STRINGS - 1);
  const fretsBottom = NUT_Y + NUM_FRETS * FRET_SPACING;

  return (
    <svg
      className="pcc-diagram"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Fret lines (below the nut) */}
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

      {/* Nut line (thick if barreFret === 0, thin otherwise) */}
      <line
        x1={stringsLeft - 1}
        y1={NUT_Y}
        x2={stringsRight + 1}
        y2={NUT_Y}
        stroke="#333333"
        strokeWidth={barreFret === 0 ? 3 : 1.5}
      />

      {/* Fret position label — to the right of the top fret space */}
      {barreFret > 0 && (
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
          x1={stringX(i)}
          y1={NUT_Y}
          x2={stringX(i)}
          y2={fretsBottom}
          stroke="#c0c0c0"
          strokeWidth="1"
        />
      ))}

      {/* Note markers */}
      {shape.map((entry, i) => {
        const x = stringX(i);
        const isActive = activeSet.has(i);
        const isRoot = entry !== null && entry.tone === '1';
        const color = isRoot
          ? (isActive ? '#e74c3c' : '#7a3535')
          : (isActive ? '#3498DB' : '#bdbdbd');
        const label = markerLabel(entry, displayMode, root);

        if (entry === null) {
          return (
            <text
              key={`mark-${i}`}
              x={x}
              y={TOP_MARKER_Y + 4}
              textAnchor="middle"
              fontSize="11"
              fill="#757575"
              fontWeight="bold"
            >
              ×
            </text>
          );
        }

        if (entry.fretOffset === 0 && barreFret === 0) {
          // True open string (open-position chord)
          return (
            <g key={`mark-${i}`}>
              <circle
                cx={x}
                cy={TOP_MARKER_Y}
                r="5.5"
                fill={isActive ? color : 'none'}
                stroke={isActive ? color : '#9e9e9e'}
                strokeWidth="1.5"
              />
              {isActive && label && (
                <text
                  x={x}
                  y={TOP_MARKER_Y + 2.5}
                  textAnchor="middle"
                  fontSize="7"
                  fill="#ffffff"
                  fontWeight="bold"
                >
                  {label}
                </text>
              )}
            </g>
          );
        }

        // Fretted note.
        // For barre chords, shift everything down by one space so that
        // fretOffset=0 (barre position) lands in the first fret cell,
        // not above the nut (which would visually imply an open string).
        const spaceIdx = barreFret > 0 ? entry.fretOffset + 1 : entry.fretOffset;
        const y = fretDotY(spaceIdx);
        return (
          <g key={`mark-${i}`}>
            <circle cx={x} cy={y} r="7" fill={color} />
            {isActive && label && (
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
  const shape = getPartialChordShape(cagedLetter, quality);
  const stringSet = STRING_SETS[setIdx];
  const barreFret = getBarreFret(cagedLetter, root);

  // Tone line — ordered low-to-high across the active set
  const toneLine = stringSet.shapeIndices
    .map((i) => (shape[i] ? shape[i].tone : '—'))
    .join(' + ');

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

      <div className="pcc-name">{displayChordName(root, quality)}</div>

      <div className="pcc-nav pcc-nav-caged">
        <button className="pcc-arrow" onClick={stopAnd(() => onNavCaged(-1))} aria-label="Previous CAGED shape">‹</button>
        <span className="pcc-nav-label">CAGED: <b>{cagedLetter}</b></span>
        <button className="pcc-arrow" onClick={stopAnd(() => onNavCaged(1))} aria-label="Next CAGED shape">›</button>
      </div>

      <Diagram
        shape={shape}
        activeShapeIndices={stringSet.shapeIndices}
        displayMode={displayMode}
        root={root}
        barreFret={barreFret}
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
