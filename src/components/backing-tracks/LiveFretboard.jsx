import React, { useState, useMemo, useCallback } from 'react';
import AllScalesFretboard from '../positions/AllScalesFretboard';
import {
  SCALE_CATEGORIES,
  ALL_SCALES_MAP,
  computeNotes,
} from '../../constants/allScalesData';
import { parseChordSymbol, PITCH_NAMES, getChordData } from '../../lib/style-engine/YamChordMap';
import { chordDisplayName } from './useBackingTrackEngine';
import './LiveFretboard.css';

// PITCH_NAMES uses flats (Eb, Ab, Bb); CHROMATIC_SCALE uses sharps — normalize
const ENHARMONIC = { 'Eb': 'D#', 'Ab': 'G#', 'Bb': 'A#', 'Db': 'C#', 'Gb': 'F#' };
const toSharp = (n) => ENHARMONIC[n] || n;

const CHORD_COLOR = '#4fc3f7';
const CHROMATIC = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];

// polyscaleMap shape: { barIndex: { scaleId: string|null, root: 'auto'|noteName } }
const defaultEntry = () => ({ scaleId: null, root: 'auto' });

export default function LiveFretboard({ chords, currentBar, currentChordSymbol, isPlaying, isOpen: isOpenProp, onToggle }) {
  const [isOpenInternal, setIsOpenInternal] = useState(false);
  const isOpen = isOpenProp !== undefined ? isOpenProp : isOpenInternal;
  const handleToggle = onToggle || (() => setIsOpenInternal(p => !p));
  const [displayMode, setDisplayMode] = useState('dots');
  const [globalScaleId, setGlobalScaleId] = useState(null);
  const [globalRoot, setGlobalRoot] = useState('auto'); // 'auto' or note name
  const [polyscaleEnabled, setPolyscaleEnabled] = useState(false);
  const [polyscaleMap, setPolyscaleMap] = useState({}); // { barIndex: { scaleId, root } }
  const [fretRangeStart, setFretRangeStart] = useState(null);
  const [fretRangeEnd, setFretRangeEnd] = useState(null);

  // Which bar/symbol to display (playing = current, stopped = bar 0)
  const displayBar = isPlaying ? currentBar : 0;
  const displaySymbol = isPlaying
    ? currentChordSymbol
    : (chords && chords.length > 0 ? chordDisplayName(chords[0]) : null);

  // Parse chord symbol → root pitch + type name
  const { rootPitch, typeName } = useMemo(() => {
    if (!displaySymbol) return { rootPitch: 0, typeName: 'Maj' };
    return parseChordSymbol(displaySymbol);
  }, [displaySymbol]);

  // Chord root in sharp notation
  const chordRoot = useMemo(() => toSharp(PITCH_NAMES[rootPitch] ?? 'C'), [rootPitch]);

  // Effective scale root: fixed root if chosen, otherwise follows chord root
  const activeEntry = polyscaleEnabled
    ? (polyscaleMap[displayBar] ?? defaultEntry())
    : null;

  const selectedRoot = polyscaleEnabled
    ? (activeEntry.root !== 'auto' ? activeEntry.root : chordRoot)
    : (globalRoot !== 'auto' ? globalRoot : chordRoot);

  const scaleId = polyscaleEnabled
    ? (activeEntry.scaleId ?? null)
    : globalScaleId;

  // Scale notes (background grey dots)
  const scaleNotes = useMemo(() => {
    if (!scaleId) return new Set();
    const item = ALL_SCALES_MAP[scaleId];
    if (!item) return new Set();
    return new Set(computeNotes(selectedRoot, item.intervals));
  }, [scaleId, selectedRoot]);

  // Chord tone notes — only overlaid while playing (always relative to chord root)
  const chordToneNotes = useMemo(() => {
    if (!isPlaying || !displaySymbol) return new Set();
    const { intervals } = getChordData(typeName);
    return new Set(computeNotes(chordRoot, intervals));
  }, [isPlaying, displaySymbol, typeName, chordRoot]);

  // Chord overlay rings (shown while playing)
  const chordOverlays = useMemo(() => {
    if (!isPlaying || chordToneNotes.size === 0) return [];
    return [{ id: 'chord', notesSet: chordToneNotes, color: CHORD_COLOR }];
  }, [isPlaying, chordToneNotes]);

  // Fret range handler
  const handleFretClick = useCallback((fret) => {
    setFretRangeStart(prev => {
      if (prev === null) return fret;
      if (fretRangeEnd !== null) { setFretRangeEnd(null); return fret; }
      if (fret === prev) { setFretRangeEnd(null); return null; }
      setFretRangeEnd(fret);
      return prev;
    });
  }, [fretRangeEnd]);

  const clearRange = useCallback(() => {
    setFretRangeStart(null);
    setFretRangeEnd(null);
  }, []);

  // Update polyscale entry for a bar
  const setPolyField = useCallback((barIndex, field, value) => {
    setPolyscaleMap(prev => ({
      ...prev,
      [barIndex]: { ...(prev[barIndex] ?? defaultEntry()), [field]: value || (field === 'root' ? 'auto' : null) },
    }));
  }, []);

  const hasRange = fretRangeStart !== null && fretRangeEnd !== null;

  return (
    <div className="lf-root">

      {/* Toggle button */}
      <button className="lf-toggle-btn" onClick={handleToggle}>
        <span className="lf-toggle-icon">🎸</span>
        Live Fretboard
        <span className="lf-toggle-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="lf-panel">

          {/* Current chord + scale info */}
          <div className="lf-chord-header">
            <span className="lf-chord-now">
              {isPlaying ? (currentChordSymbol ?? '…') : (displaySymbol ?? '—')}
            </span>
            <span className="lf-chord-root-note" title="Chord root">{chordRoot}</span>
            {!isPlaying && <span className="lf-stopped-badge">stopped</span>}
            {scaleId && (
              <span className="lf-scale-badge">
                {selectedRoot} {ALL_SCALES_MAP[scaleId]?.name}
              </span>
            )}
          </div>

          {/* Fretboard */}
          <AllScalesFretboard
            activeNoteClasses={scaleNotes}
            selectedRoot={selectedRoot}
            highlightColors={{}}
            fretRangeStart={fretRangeStart}
            fretRangeEnd={fretRangeEnd}
            chordOverlays={chordOverlays}
            displayMode={displayMode}
            onNoteClick={() => {}}
            onNoteLongPress={() => {}}
            onFretClick={handleFretClick}
          />

          {/* Controls bar */}
          <div className="lf-controls">

            {/* Display mode */}
            <div className="lf-ctrl-group">
              <span className="lf-ctrl-label">Display</span>
              <div className="lf-mode-btns">
                {[['dots', '●'], ['notes', 'A'], ['degrees', '1']].map(([m, lbl]) => (
                  <button
                    key={m}
                    className={`lf-mode-btn${displayMode === m ? ' active' : ''}`}
                    onClick={() => setDisplayMode(m)}
                  >{lbl}</button>
                ))}
              </div>
            </div>

            {/* Global root + scale selectors (when polyscale OFF) */}
            {!polyscaleEnabled && (
              <>
                <div className="lf-ctrl-group">
                  <span className="lf-ctrl-label">Root</span>
                  <select
                    className="lf-select lf-select-root"
                    value={globalRoot}
                    onChange={e => setGlobalRoot(e.target.value)}
                  >
                    <option value="auto">Auto</option>
                    {CHROMATIC.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>

                <div className="lf-ctrl-group lf-ctrl-scale">
                  <span className="lf-ctrl-label">Scale</span>
                  <select
                    className="lf-select"
                    value={globalScaleId || ''}
                    onChange={e => setGlobalScaleId(e.target.value || null)}
                  >
                    <option value="">— none —</option>
                    {SCALE_CATEGORIES.map(cat => (
                      <optgroup key={cat.id} label={cat.label}>
                        {cat.items.map(item => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Polyscale toggle */}
            <button
              className={`lf-poly-btn${polyscaleEnabled ? ' active' : ''}`}
              onClick={() => setPolyscaleEnabled(p => !p)}
              title="Assign a different scale/root to each chord"
            >
              Polyscale
            </button>

            {/* Clear fret range */}
            {hasRange && (
              <button className="lf-action-btn" onClick={clearRange}>
                Clear range
              </button>
            )}

          </div>

          {/* Polyscale per-chord settings */}
          {polyscaleEnabled && (
            <div className="lf-polyscale">
              <div className="lf-polyscale-header">
                <span className="lf-ctrl-label">Scale per chord</span>
              </div>
              <div className="lf-polyscale-rows">
                {(chords || []).map((chord, i) => {
                  const entry = polyscaleMap[i] ?? defaultEntry();
                  return (
                    <div
                      key={i}
                      className={`lf-poly-row${isPlaying && currentBar === i ? ' lf-poly-row--active' : ''}`}
                    >
                      <span className="lf-poly-chord-name">{chordDisplayName(chord)}</span>

                      {/* Root per chord */}
                      <select
                        className="lf-select lf-select-root lf-select-sm"
                        value={entry.root ?? 'auto'}
                        onChange={e => setPolyField(i, 'root', e.target.value)}
                      >
                        <option value="auto">Auto</option>
                        {CHROMATIC.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>

                      {/* Scale per chord */}
                      <select
                        className="lf-select lf-select-sm"
                        value={entry.scaleId || ''}
                        onChange={e => setPolyField(i, 'scaleId', e.target.value)}
                      >
                        <option value="">— none —</option>
                        {SCALE_CATEGORIES.map(cat => (
                          <optgroup key={cat.id} label={cat.label}>
                            {cat.items.map(item => (
                              <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
