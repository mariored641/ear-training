import React, { useState, useMemo, useCallback } from 'react';
import AllScalesFretboard from './AllScalesFretboard';
import {
  SCALE_CATEGORIES,
  CHORD_CATEGORIES,
  ALL_SCALES_MAP,
  ALL_CHORDS_MAP,
  NOTE_DISPLAY_LABELS,
  computeNotes,
  detectScale,
} from '../../constants/allScalesData';
import { CHROMATIC_SCALE } from '../../constants/positionData';
import './AllScalesTab.css';

const HIGHLIGHT_PALETTE = ['#FFC107', '#E91E8C', '#00BCD4', '#76FF03', '#FF5722', '#9C27B0'];
const OVERLAY_COLORS    = ['#E91E8C', '#FFC107', '#00BCD4', '#76FF03'];
const MAX_OVERLAYS = 4;

// Combine scale + chord items into one selector list
function buildSelectorGroups() {
  const groups = [];
  SCALE_CATEGORIES.forEach(cat => groups.push({ ...cat, type: 'scale' }));
  groups.push({ id: '_sep', label: '── Chords ──', type: 'sep', items: [] });
  CHORD_CATEGORIES.forEach(cat => groups.push({ ...cat, type: 'chord' }));
  return groups;
}
const SELECTOR_GROUPS = buildSelectorGroups();

const AllScalesTab = () => {
  const [selectedRoot, setSelectedRoot]     = useState('A');
  const [selectedId, setSelectedId]         = useState(null);   // scale or chord id
  const [activeNotes, setActiveNotes]       = useState(new Set()); // pitch class set
  const [displayMode, setDisplayMode]       = useState('notes');
  const [highlightColors, setHighlightColors] = useState({});    // { noteName: colorHex }
  const [colorPickerNote, setColorPickerNote] = useState(null);
  const [fretRangeStart, setFretRangeStart] = useState(null);
  const [fretRangeEnd, setFretRangeEnd]     = useState(null);
  const [overlays, setOverlays]             = useState([]);      // chord overlays

  // ── Scale/Chord selector ────────────────────────────────────
  const handleScaleChange = useCallback((id) => {
    setSelectedId(id || null);
    if (!id) {
      setActiveNotes(new Set());
    } else {
      const item = ALL_SCALES_MAP[id] || ALL_CHORDS_MAP[id];
      if (item) setActiveNotes(new Set(computeNotes(selectedRoot, item.intervals)));
    }
  }, [selectedRoot]);

  const handleRootChange = useCallback((root) => {
    setSelectedRoot(root);
    if (selectedId) {
      const item = ALL_SCALES_MAP[selectedId] || ALL_CHORDS_MAP[selectedId];
      if (item) setActiveNotes(new Set(computeNotes(root, item.intervals)));
    } else {
      setActiveNotes(new Set());
    }
  }, [selectedId]);

  // ── Note toggle ─────────────────────────────────────────────
  const handleNoteClick = useCallback((noteName) => {
    setActiveNotes(prev => {
      const next = new Set(prev);
      if (next.has(noteName)) next.delete(noteName);
      else next.add(noteName);
      const detected = detectScale(next, selectedRoot);
      setSelectedId(detected);
      return next;
    });
  }, [selectedRoot]);

  // ── Long press → color picker ────────────────────────────────
  const handleNoteLongPress = useCallback((noteName) => {
    setColorPickerNote(noteName);
  }, []);

  const applyHighlight = useCallback((noteName, color) => {
    setHighlightColors(prev => {
      if (!color) {
        const next = { ...prev };
        delete next[noteName];
        return next;
      }
      return { ...prev, [noteName]: color };
    });
    setColorPickerNote(null);
  }, []);

  // ── Fret range ───────────────────────────────────────────────
  const handleFretClick = useCallback((fret) => {
    setFretRangeStart(prev => {
      if (prev === null) return fret;
      if (fretRangeEnd !== null) {
        // Range complete → start fresh
        setFretRangeEnd(null);
        return fret;
      }
      // Only start set
      if (fret === prev) {
        setFretRangeEnd(null);
        return null; // clear
      }
      setFretRangeEnd(fret);
      return prev;
    });
  }, [fretRangeEnd]);

  const clearRange = useCallback(() => {
    setFretRangeStart(null);
    setFretRangeEnd(null);
  }, []);

  // ── Chord overlays ───────────────────────────────────────────
  const addOverlay = useCallback(() => {
    if (overlays.length >= MAX_OVERLAYS) return;
    const color = OVERLAY_COLORS[overlays.length];
    setOverlays(prev => [...prev, {
      id: Date.now(),
      root: selectedRoot,
      chordId: 'maj7',
      color,
    }]);
  }, [overlays.length, selectedRoot]);

  const removeOverlay = useCallback((id) => {
    setOverlays(prev => prev.filter(o => o.id !== id));
  }, []);

  const updateOverlay = useCallback((id, key, val) => {
    setOverlays(prev => prev.map(o => o.id === id ? { ...o, [key]: val } : o));
  }, []);

  // Compute note sets for overlays
  const computedOverlays = useMemo(() => overlays.map(o => {
    const item = ALL_CHORDS_MAP[o.chordId] || ALL_SCALES_MAP[o.chordId];
    const notesSet = item ? new Set(computeNotes(o.root, item.intervals)) : new Set();
    return { ...o, notesSet };
  }), [overlays]);

  // Current scale/chord object (for scale intervals used in degrees display)
  const currentItem = useMemo(() => {
    if (!selectedId) return null;
    return ALL_SCALES_MAP[selectedId] || ALL_CHORDS_MAP[selectedId] || null;
  }, [selectedId]);

  const hasRange = fretRangeStart !== null || fretRangeEnd !== null;

  return (
    <div className="ast-root">
      {/* Fretboard */}
      <AllScalesFretboard
        activeNoteClasses={activeNotes}
        selectedRoot={selectedRoot}
        highlightColors={highlightColors}
        fretRangeStart={fretRangeStart}
        fretRangeEnd={fretRangeEnd}
        chordOverlays={computedOverlays}
        displayMode={displayMode}
        onNoteClick={handleNoteClick}
        onNoteLongPress={handleNoteLongPress}
        onFretClick={handleFretClick}
      />

      {/* Controls */}
      <div className="ast-controls">

        {/* Row 1: Root + Scale/Chord + Display mode */}
        <div className="ast-row ast-row-main">
          {/* Root */}
          <div className="ast-group">
            <label className="ast-label">Root</label>
            <select
              className="ast-select ast-select-root"
              value={selectedRoot}
              onChange={e => handleRootChange(e.target.value)}
            >
              {CHROMATIC_SCALE.map(n => (
                <option key={n} value={n}>{NOTE_DISPLAY_LABELS[n]}</option>
              ))}
            </select>
          </div>

          {/* Scale / Chord */}
          <div className="ast-group ast-group-scale">
            <label className="ast-label">Scale / Chord</label>
            <select
              className="ast-select ast-select-scale"
              value={selectedId || ''}
              onChange={e => handleScaleChange(e.target.value)}
            >
              <option value="">— empty —</option>
              {SELECTOR_GROUPS.map(group =>
                group.type === 'sep' ? null : (
                  <optgroup key={group.id} label={group.label}>
                    {group.items.map(item => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </optgroup>
                )
              )}
            </select>
          </div>

          {/* Display mode */}
          <div className="ast-group">
            <label className="ast-label">Display</label>
            <div className="ast-mode-btns">
              {['dots', 'notes', 'degrees'].map(m => (
                <button
                  key={m}
                  className={`ast-mode-btn${displayMode === m ? ' active' : ''}`}
                  onClick={() => setDisplayMode(m)}
                >
                  {m === 'dots' ? '●' : m === 'notes' ? 'A' : '1'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2: Actions — clear notes, clear range, clear colors */}
        <div className="ast-row ast-row-actions">
          <button className="ast-action-btn" onClick={() => { setActiveNotes(new Set()); setSelectedId(null); }}>
            Clear notes
          </button>
          {hasRange && (
            <button className="ast-action-btn" onClick={clearRange}>
              Clear range
            </button>
          )}
          {Object.keys(highlightColors).length > 0 && (
            <button className="ast-action-btn" onClick={() => setHighlightColors({})}>
              Clear colors
            </button>
          )}
          <span className="ast-hint">tap note = show/hide · long press = color</span>
        </div>

        {/* Color picker (when long-pressing a note) */}
        {colorPickerNote && (
          <div className="ast-color-picker">
            <span className="ast-color-label">Color for <strong>{colorPickerNote}</strong>:</span>
            {HIGHLIGHT_PALETTE.map(color => (
              <button
                key={color}
                className={`ast-color-swatch${highlightColors[colorPickerNote] === color ? ' selected' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => applyHighlight(colorPickerNote, color)}
              />
            ))}
            <button
              className="ast-color-swatch ast-color-off"
              onClick={() => applyHighlight(colorPickerNote, null)}
              title="Remove color"
            >✕</button>
            <button className="ast-color-close" onClick={() => setColorPickerNote(null)}>Done</button>
          </div>
        )}

        {/* Chord Overlays */}
        <div className="ast-overlays-section">
          <div className="ast-overlays-header">
            <span className="ast-label">Chord Overlays</span>
            {overlays.length < MAX_OVERLAYS && (
              <button className="ast-add-overlay-btn" onClick={addOverlay}>+ Add</button>
            )}
          </div>

          {overlays.map(ov => (
            <div key={ov.id} className="ast-overlay-row">
              <div className="ast-overlay-color" style={{ backgroundColor: ov.color }} />

              {/* Root */}
              <select
                className="ast-select ast-select-sm"
                value={ov.root}
                onChange={e => updateOverlay(ov.id, 'root', e.target.value)}
              >
                {CHROMATIC_SCALE.map(n => (
                  <option key={n} value={n}>{NOTE_DISPLAY_LABELS[n]}</option>
                ))}
              </select>

              {/* Chord/Scale type */}
              <select
                className="ast-select ast-select-chord"
                value={ov.chordId}
                onChange={e => updateOverlay(ov.id, 'chordId', e.target.value)}
              >
                {CHORD_CATEGORIES.map(cat => (
                  <optgroup key={cat.id} label={cat.label}>
                    {cat.items.map(item => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </optgroup>
                ))}
                {SCALE_CATEGORIES.map(cat => (
                  <optgroup key={'sc-' + cat.id} label={'Scale: ' + cat.label}>
                    {cat.items.map(item => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>

              <button
                className="ast-remove-overlay"
                onClick={() => removeOverlay(ov.id)}
              >✕</button>
            </div>
          ))}

          {overlays.length === 0 && (
            <p className="ast-overlay-hint">Add chord overlays to see colored rings on the fretboard.</p>
          )}
        </div>

      </div>
    </div>
  );
};

export default AllScalesTab;
