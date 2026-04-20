import React, { useState, useCallback } from 'react';
import PartialChordCard from './PartialChordCard';
import { CAGED_ORDER, STRING_SETS, findBestShapeForFret } from '../../utils/partialChordShapes';
import './PartialChordsTab.css';

const ROOT_OPTIONS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const DEFAULT_CAGED_IDX = 3; // E shape
const DEFAULT_SET_IDX = 3;   // Strings 3-1

const DISPLAY_MODES = [
  { id: 'dots',  label: 'Dots'  },
  { id: 'tones', label: 'Numbers' },
  { id: 'notes', label: 'Notes' },
];

function chordLabel(chord) {
  return chord.quality === 'minor' ? `${chord.root}m` : chord.root;
}

function wrap(n, len) {
  return ((n % len) + len) % len;
}

function PartialChordsTab({ progression, onProgressionChange, activeIdx, onActiveIdxChange }) {
  const [builderRoot, setBuilderRoot] = useState('A');
  const [builderQuality, setBuilderQuality] = useState('minor');
  const [displayMode, setDisplayMode] = useState('tones');
  const [targetFret, setTargetFret] = useState(5);

  const handleAdd = useCallback(() => {
    const { cagedIdx, setIdx } = findBestShapeForFret(builderRoot, builderQuality, targetFret);
    const next = [...progression, { root: builderRoot, quality: builderQuality, cagedIdx, setIdx }];
    onProgressionChange(next);
    onActiveIdxChange(next.length - 1);
  }, [builderRoot, builderQuality, targetFret, progression, onProgressionChange, onActiveIdxChange]);

  const handleFretChange = useCallback((fret) => {
    setTargetFret(fret);
    if (progression.length > 0) {
      const next = progression.map(chord => ({
        ...chord,
        ...findBestShapeForFret(chord.root, chord.quality, fret),
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
    updateChord(idx, { setIdx: wrap(chord.setIdx + dir, STRING_SETS.length) });
  }, [progression, updateChord]);

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
    </div>
  );
}

export default PartialChordsTab;
