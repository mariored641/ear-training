import React, { useState, useMemo, useCallback } from 'react';
import AllScalesFretboard from '../positions/AllScalesFretboard';
import {
  SCALE_CATEGORIES,
  ALL_SCALES_MAP,
  computeNotes,
} from '../../constants/allScalesData';
import { parseChordSymbol, PITCH_NAMES, getChordData } from '../../lib/style-engine/YamChordMap';
import { chordDisplayName, prettifyChord } from './useBackingTrackEngine';
import { ChordPreviewStrip } from './ChordPreviewStrip';
import './LiveFretboard.css';

// PITCH_NAMES uses flats (Eb, Ab, Bb); CHROMATIC_SCALE uses sharps — normalize
const ENHARMONIC = { 'Eb': 'D#', 'Ab': 'G#', 'Bb': 'A#', 'Db': 'C#', 'Gb': 'F#' };
const toSharp = (n) => ENHARMONIC[n] || n;

const CHORD_COLOR = '#4fc3f7';
const CHROMATIC = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];

// polyscaleMap shape: { barIndex: { scaleId: string|null, root: 'auto'|noteName } }
const defaultEntry = () => ({ scaleId: null, root: 'auto' });

export default function LiveFretboard({
  chords,
  currentBar,
  currentChordSymbol,
  isPlaying,
  isOpen: isOpenProp,
  onToggle,
  embedded = false,
  polyscaleEnabled: polyscaleEnabledProp,
  polyscaleMap: polyscaleMapProp,
  onPolyscaleChange,
  onOpenPolyscale,
}) {
  const [isOpenInternal, setIsOpenInternal] = useState(false);
  const isOpen = embedded ? true : (isOpenProp !== undefined ? isOpenProp : isOpenInternal);
  const handleToggle = onToggle || (() => setIsOpenInternal(p => !p));
  const [displayMode, setDisplayMode] = useState('dots');
  const [globalScaleId, setGlobalScaleId] = useState(null);
  const [globalRoot, setGlobalRoot] = useState('auto'); // 'auto' or note name
  const [polyscaleEnabledInternal, setPolyscaleEnabledInternal] = useState(false);
  const [polyscaleMapInternal, setPolyscaleMapInternal] = useState({}); // { barIndex: { scaleId, root } }
  // When embedded, accept polyscale state from parent so a separate popup can edit it.
  const polyscaleEnabled = polyscaleEnabledProp !== undefined ? polyscaleEnabledProp : polyscaleEnabledInternal;
  const polyscaleMap = polyscaleMapProp !== undefined ? polyscaleMapProp : polyscaleMapInternal;
  const setPolyscaleEnabled = (v) => {
    if (polyscaleEnabledProp !== undefined && onPolyscaleChange) {
      onPolyscaleChange({ enabled: typeof v === 'function' ? v(polyscaleEnabled) : v, map: polyscaleMap });
    } else {
      setPolyscaleEnabledInternal(v);
    }
  };
  const setPolyscaleMap = (updater) => {
    const newMap = typeof updater === 'function' ? updater(polyscaleMap) : updater;
    if (polyscaleMapProp !== undefined && onPolyscaleChange) {
      onPolyscaleChange({ enabled: polyscaleEnabled, map: newMap });
    } else {
      setPolyscaleMapInternal(newMap);
    }
  };
  const [fretRangeStart, setFretRangeStart] = useState(null);
  const [fretRangeEnd, setFretRangeEnd] = useState(null);
  const [activeStrings, setActiveStrings] = useState(null);

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

  const handleStringClick = useCallback((stringNum) => {
    setActiveStrings(prev => {
      if (!prev) return new Set([stringNum]);
      const next = new Set(prev);
      if (next.has(stringNum)) next.delete(stringNum);
      else next.add(stringNum);
      return next.size === 0 || next.size === 6 ? null : next;
    });
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
    <div className={`lf-root${embedded ? ' embedded' : ''}`}>

      {/* Toggle button — only when not embedded */}
      {!embedded && (
        <button className="lf-toggle-btn" onClick={handleToggle}>
          <span className="lf-toggle-icon">🎸</span>
          Live Fretboard
          <span className="lf-toggle-arrow">{isOpen ? '▲' : '▼'}</span>
        </button>
      )}

      {isOpen && (
        <div className="lf-panel">

          {/* Current chord + scale info */}
          <div className="lf-chord-header">
            <span className="lf-chord-now">
              {prettifyChord(isPlaying ? (currentChordSymbol ?? '…') : (displaySymbol ?? '—'))}
            </span>
            {!isPlaying && <span className="lf-stopped-badge">stopped</span>}
            {scaleId && (
              <span className="lf-scale-badge">
                {selectedRoot} {ALL_SCALES_MAP[scaleId]?.name}
              </span>
            )}
          </div>

          {/* Upcoming chords ribbon */}
          <ChordPreviewStrip
            chords={chords}
            currentBar={currentBar}
            isPlaying={isPlaying}
          />

          {/* Fretboard */}
          <AllScalesFretboard
            activeNoteClasses={scaleNotes}
            selectedRoot={selectedRoot}
            highlightColors={{}}
            fretRangeStart={fretRangeStart}
            fretRangeEnd={fretRangeEnd}
            chordOverlays={chordOverlays}
            displayMode={displayMode}
            activeStrings={activeStrings}
            onNoteClick={() => {}}
            onNoteLongPress={() => {}}
            onFretClick={handleFretClick}
            onStringClick={handleStringClick}
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

            {/* Polyscale toggle — in embedded mode, opens a separate popup-on-popup */}
            <button
              className={`lf-poly-btn${polyscaleEnabled ? ' active' : ''}`}
              onClick={() => {
                if (embedded && onOpenPolyscale) {
                  onOpenPolyscale();
                } else {
                  setPolyscaleEnabled(p => !p);
                }
              }}
              title="Assign a different scale/root to each chord"
            >
              Polyscale {polyscaleEnabled ? '●' : ''}
            </button>

            {/* Clear fret range */}
            {hasRange && (
              <button className="lf-action-btn" onClick={clearRange}>
                Clear range
              </button>
            )}

          </div>

          {/* Polyscale per-chord settings — hidden in embedded mode (lives in its own popup) */}
          {polyscaleEnabled && !embedded && (
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
                      <span className="lf-poly-chord-name">{prettifyChord(chordDisplayName(chord))}</span>

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
