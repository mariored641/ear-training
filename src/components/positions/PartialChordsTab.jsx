import React, { useState, useCallback } from 'react';
import PartialChordCard from './PartialChordCard';
import QualityPickerModal from './QualityPickerModal';
import {
  CAGED_ORDER,
  STRING_SETS,
  STRING_SETS_BY_WIDTH,
  DEFAULT_SET_IDX_BY_WIDTH,
  CHORD_QUALITIES,
  isBasicTriad,
  formatChordName,
  findBestShapeForFret,
} from '../../utils/partialChordShapes';
import './PartialChordsTab.css';

const ROOT_OPTIONS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const WIDTH_OPTIONS = [3, 4, 5, 6];

const DISPLAY_MODES = [
  { id: 'dots',  label: 'Dots'  },
  { id: 'tones', label: 'Numbers' },
  { id: 'notes', label: 'Notes' },
];

function chordLabel(chord) {
  return formatChordName(chord.root, chord.quality);
}

function wrap(n, len) {
  return ((n % len) + len) % len;
}

// Pick a set in the desired width whose lowest-string index matches the
// current set as closely as possible. Keeps voicing visually anchored.
function setIdxForWidth(currentSetIdx, newWidth) {
  const list = STRING_SETS_BY_WIDTH[newWidth] || [];
  if (list.length === 0) return DEFAULT_SET_IDX_BY_WIDTH[newWidth] ?? 3;
  const current = STRING_SETS[currentSetIdx];
  if (!current) return list[0];
  const curLow = current.shapeIndices[0];
  let best = list[0];
  let bestDist = Infinity;
  list.forEach((idx) => {
    const dist = Math.abs(STRING_SETS[idx].shapeIndices[0] - curLow);
    if (dist < bestDist) {
      bestDist = dist;
      best = idx;
    }
  });
  return best;
}

function PartialChordsTab({ progression, onProgressionChange, activeIdx, onActiveIdxChange }) {
  const [builderRoot, setBuilderRoot] = useState('A');
  const [builderQuality, setBuilderQuality] = useState('minor');
  const [displayMode, setDisplayMode] = useState('tones');
  const [targetFret, setTargetFret] = useState(5);
  const [width, setWidth] = useState(3);
  const [isQualityModalOpen, setIsQualityModalOpen] = useState(false);

  const handleAdd = useCallback(() => {
    const { cagedIdx, setIdx } = findBestShapeForFret(builderRoot, builderQuality, targetFret, width);
    const next = [...progression, { root: builderRoot, quality: builderQuality, cagedIdx, setIdx }];
    onProgressionChange(next);
    onActiveIdxChange(next.length - 1);
  }, [builderRoot, builderQuality, targetFret, width, progression, onProgressionChange, onActiveIdxChange]);

  const handleFretChange = useCallback((fret) => {
    setTargetFret(fret);
    if (progression.length > 0) {
      const next = progression.map((chord) => ({
        ...chord,
        ...findBestShapeForFret(chord.root, chord.quality, fret, width),
      }));
      onProgressionChange(next);
    }
  }, [progression, onProgressionChange, width]);

  const handleWidthChange = useCallback((newWidth) => {
    setWidth(newWidth);
    if (progression.length > 0) {
      const next = progression.map((chord) => ({
        ...chord,
        setIdx: setIdxForWidth(chord.setIdx, newWidth),
      }));
      onProgressionChange(next);
    }
  }, [progression, onProgressionChange]);

  const handleClear = useCallback(() => {
    onProgressionChange([]);
    onActiveIdxChange(0);
  }, [onProgressionChange, onActiveIdxChange]);

  const handleRemove = useCallback((idx) => {
    const next = progression.filter((_, i) => i !== idx);
    onProgressionChange(next);
    if (activeIdx >= next.length) {
      onActiveIdxChange(Math.max(0, next.length - 1));
    }
  }, [progression, activeIdx, onProgressionChange, onActiveIdxChange]);

  const updateChord = useCallback((idx, patch) => {
    const next = progression.map((c, i) => (i === idx ? { ...c, ...patch } : c));
    onProgressionChange(next);
  }, [progression, onProgressionChange]);

  const handleNavCaged = useCallback((idx, dir) => {
    const chord = progression[idx];
    updateChord(idx, { cagedIdx: wrap(chord.cagedIdx + dir, CAGED_ORDER.length) });
  }, [progression, updateChord]);

  const handleNavSet = useCallback((idx, dir) => {
    const chord = progression[idx];
    const list = STRING_SETS_BY_WIDTH[width] || [];
    if (list.length === 0) return;
    const currentPos = list.indexOf(chord.setIdx);
    const startPos = currentPos < 0 ? 0 : currentPos;
    const nextPos = wrap(startPos + dir, list.length);
    updateChord(idx, { setIdx: list[nextPos] });
  }, [progression, width, updateChord]);

  const moreBtnLabel = isBasicTriad(builderQuality)
    ? 'More…'
    : (CHORD_QUALITIES[builderQuality]?.label || 'More…');

  return (
    <div className="pct-root">
      <div className="pct-builder">
        <div className="pct-group">
          <label className="pct-label">Root</label>
          <select
            className="pct-select"
            value={builderRoot}
            onChange={(e) => setBuilderRoot(e.target.value)}
          >
            {ROOT_OPTIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div className="pct-group">
          <label className="pct-label">Quality</label>
          <div className="pct-quality-toggle">
            <button
              className={`pct-quality-btn ${builderQuality === 'major' ? 'active' : ''}`}
              onClick={() => setBuilderQuality('major')}
            >
              Maj
            </button>
            <button
              className={`pct-quality-btn ${builderQuality === 'minor' ? 'active' : ''}`}
              onClick={() => setBuilderQuality('minor')}
            >
              Min
            </button>
            <button
              className={`pct-quality-btn pct-more-btn ${!isBasicTriad(builderQuality) ? 'active' : ''}`}
              onClick={() => setIsQualityModalOpen(true)}
              title="Choose extended quality"
            >
              {moreBtnLabel}
            </button>
          </div>
        </div>

        <button className="pct-add-btn" onClick={handleAdd}>+ Add</button>
        <button className="pct-clear-btn" onClick={handleClear} disabled={progression.length === 0}>
          Clear
        </button>

        <div className="pct-group pct-fret-group">
          <label className="pct-label">Position — <b className="pct-fret-val">{targetFret}fr</b></label>
          <input
            type="range"
            className="pct-fret-slider"
            min="1" max="12"
            value={targetFret}
            onChange={(e) => handleFretChange(Number(e.target.value))}
          />
        </div>

        <div className="pct-group">
          <label className="pct-label">Strings</label>
          <div className="pct-width-toggle">
            {WIDTH_OPTIONS.map((w) => (
              <button
                key={w}
                className={`pct-width-btn ${width === w ? 'active' : ''}`}
                onClick={() => handleWidthChange(w)}
                title={`${w} strings`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        <div className="pct-group pct-display-group">
          <label className="pct-label">Show</label>
          <div className="pct-display-toggle">
            {DISPLAY_MODES.map((m) => (
              <button
                key={m.id}
                className={`pct-display-btn ${displayMode === m.id ? 'active' : ''}`}
                onClick={() => setDisplayMode(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {progression.length > 0 && (
        <div className="pct-pills">
          {progression.map((chord, idx) => (
            <button
              key={idx}
              className={`pct-pill ${idx === activeIdx ? 'active' : ''}`}
              onClick={() => onActiveIdxChange(idx)}
            >
              {chordLabel(chord)}
            </button>
          ))}
        </div>
      )}

      {progression.length === 0 ? (
        <div className="pct-empty">
          Pick a root and quality, then press <b>+ Add</b> to start a progression.
        </div>
      ) : (
        <div className="pct-cards">
          {progression.map((chord, idx) => (
            <PartialChordCard
              key={idx}
              chord={chord}
              isActive={idx === activeIdx}
              onSelect={() => onActiveIdxChange(idx)}
              onNavCaged={(dir) => handleNavCaged(idx, dir)}
              onNavSet={(dir) => handleNavSet(idx, dir)}
              onRemove={() => handleRemove(idx)}
              displayMode={displayMode}
            />
          ))}
        </div>
      )}

      {isQualityModalOpen && (
        <QualityPickerModal
          value={builderQuality}
          onSelect={(q) => setBuilderQuality(q)}
          onClose={() => setIsQualityModalOpen(false)}
        />
      )}
    </div>
  );
}

export default PartialChordsTab;
