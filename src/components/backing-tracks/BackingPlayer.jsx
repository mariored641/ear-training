import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useBackingTrackEngine, GENRE_CATALOG } from './useBackingTrackEngine.js'
import { ChordProgressionEditor } from './ChordProgressionEditor.jsx'
import { ChordPickerModal }       from './ChordPickerModal.jsx'
import { Mixer }                  from './Mixer.jsx'
import LiveFretboard              from './LiveFretboard.jsx'
import { PresetLibrary }          from './PresetLibrary.jsx'
import { MyProgressions }         from './MyProgressions.jsx'
import { ChordPreviewStrip }      from './ChordPreviewStrip.jsx'
import { PolyscalePopup }         from './PolyscalePopup.jsx'
import { PentatonicBoxIcon }      from '../icons/AppIcons'

const TRANSPOSE_GRID = ['D','Db','C','F','E','Eb','Ab','G','Gb','B','Bb','A']

/* ═══════════════════════════════════════════════════════
   Popup: Tempo
   ═══════════════════════════════════════════════════════ */
function TempoPopup({ tempo, onTempoChange }) {
  return (
    <div className="bp-popup">
      <div className="bp-popup-title">Tempo</div>
      <div className="bp-popup-big-value">{tempo}</div>
      <div className="bp-popup-actions">
        <button className="bp-popup-round-btn" onClick={() => onTempoChange(Math.min(300, tempo + 1))}>+</button>
        <span className="bp-popup-center-icon">♩</span>
        <button className="bp-popup-round-btn" onClick={() => onTempoChange(Math.max(20, tempo - 1))}>−</button>
      </div>
      <input
        type="range" min="20" max="300" value={tempo}
        onChange={e => onTempoChange(Number(e.target.value))}
        className="bp-popup-slider"
      />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   Popup: Repeats
   ═══════════════════════════════════════════════════════ */
function RepeatsPopup({ maxLoops, onMaxLoopsChange }) {
  return (
    <div className="bp-popup">
      <div className="bp-popup-title">Repeats</div>
      <div className="bp-popup-big-value">{maxLoops === 0 ? '∞' : maxLoops}</div>
      <div className="bp-popup-actions">
        <button className="bp-popup-round-btn" onClick={() => onMaxLoopsChange(maxLoops + 1)}>+</button>
        <span className="bp-popup-center-icon">↻</span>
        <button className="bp-popup-round-btn" onClick={() => onMaxLoopsChange(Math.max(0, maxLoops - 1))}>−</button>
      </div>
      <input
        type="range" min="0" max="20" value={maxLoops}
        onChange={e => onMaxLoopsChange(Number(e.target.value))}
        className="bp-popup-slider"
      />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   Popup: Transposition
   ═══════════════════════════════════════════════════════ */
function TranspositionPopup({ selectedKey, onKeyChange }) {
  return (
    <div className="bp-popup bp-popup--transposition">
      <div className="bp-popup-title">Transposition</div>
      <div className="bp-transpose-grid">
        {TRANSPOSE_GRID.map(k => (
          <button
            key={k}
            className={`bp-transpose-key${selectedKey.root === k ? ' active' : ''}`}
            onClick={() => onKeyChange(k, selectedKey.type)}
          >{k}</button>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   Popup: Genre / Style Selector
   ═══════════════════════════════════════════════════════ */
function GenrePopup({ genre, onGenreChange, onClose }) {
  return (
    <div className="bp-popup bp-popup--genre">
      <div className="bp-popup-title">Style</div>
      <div className="bp-genre-list">
        {GENRE_CATALOG.map(cat => (
          <div key={cat.category} className="bp-genre-category">
            <div className="bp-genre-cat-header">{cat.icon} {cat.label}</div>
            <div className="bp-genre-items">
              {cat.subtypes.map(sub => (
                <button
                  key={sub.id}
                  className={`bp-genre-item${genre === sub.id ? ' active' : ''}`}
                  onClick={() => { onGenreChange(sub.id); onClose() }}
                >
                  <span>{sub.label}</span>
                  {sub.bpm && <span className="bp-genre-bpm">{sub.bpm}</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   Popup: Mixer
   ═══════════════════════════════════════════════════════ */
function MixerPopup({ style, activePart, volumes, onVolumeChange }) {
  return (
    <div className="bp-popup">
      <div className="bp-popup-title">Mixer</div>
      <Mixer style={style} activePart={activePart} volumes={volumes} onVolumeChange={onVolumeChange} />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   Popup: Templates (PresetLibrary + MyProgressions with 2 tabs)
   ═══════════════════════════════════════════════════════ */
function TemplatesPopup({ currentState, onLoadPreset, onLoadProgression }) {
  const [tab, setTab] = useState('standards')
  return (
    <div className="bp-popup bp-templates">
      <div className="bp-templates-tabs">
        <button
          className={`bp-templates-tab${tab === 'standards' ? ' active' : ''}`}
          onClick={() => setTab('standards')}
        >📚 Jazz Standards</button>
        <button
          className={`bp-templates-tab${tab === 'mine' ? ' active' : ''}`}
          onClick={() => setTab('mine')}
        >💾 My Progressions</button>
      </div>
      <div className="bp-templates-body">
        {tab === 'standards' && (
          <PresetLibrary embedded onLoadPreset={onLoadPreset} />
        )}
        {tab === 'mine' && (
          <MyProgressions
            embedded
            currentState={currentState}
            onLoadProgression={onLoadProgression}
          />
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   Popup: Practice
   ═══════════════════════════════════════════════════════ */
function PracticePopup({ config, onConfigChange }) {
  const update = (field, value) => onConfigChange({ ...config, [field]: value })

  return (
    <div className="bp-popup bp-popup--practice">
      <div className="bp-popup-title">Practice</div>

      {/* Tempo practice */}
      <div className="bp-practice-section">
        <div className="bp-practice-header">
          <span className="bp-practice-label">Practice Tempo</span>
          <span className="bp-practice-status">
            {config.tempoEnabled ? `+${config.tempoAmount} bpm / ${config.tempoEvery} loop${config.tempoEvery > 1 ? 's' : ''}` : 'Off'}
          </span>
        </div>
        <div className="bp-practice-controls">
          <button
            className={`bp-practice-toggle${config.tempoEnabled ? ' on' : ''}`}
            onClick={() => update('tempoEnabled', !config.tempoEnabled)}
          >
            <span className="bp-toggle-knob" />
          </button>
          {config.tempoEnabled && (
            <div className="bp-practice-settings">
              <div className="bp-stepper-row">
                <span className="bp-stepper-label">Every</span>
                <div className="bp-stepper">
                  <button onClick={() => update('tempoEvery', Math.max(1, config.tempoEvery - 1))}>−</button>
                  <span>{config.tempoEvery}</span>
                  <button onClick={() => update('tempoEvery', config.tempoEvery + 1)}>+</button>
                </div>
                <span className="bp-stepper-unit">loops</span>
              </div>
              <div className="bp-stepper-row">
                <span className="bp-stepper-label">Add</span>
                <div className="bp-stepper">
                  <button onClick={() => update('tempoAmount', Math.max(1, config.tempoAmount - 1))}>−</button>
                  <span>{config.tempoAmount}</span>
                  <button onClick={() => update('tempoAmount', config.tempoAmount + 1)}>+</button>
                </div>
                <span className="bp-stepper-unit">bpm</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transposition practice */}
      <div className="bp-practice-section">
        <div className="bp-practice-header">
          <span className="bp-practice-label">Practice Transposition</span>
          <span className="bp-practice-status">
            {config.transposeEnabled ? `+${config.transposeSemitones} st / ${config.transposeEvery} loop${config.transposeEvery > 1 ? 's' : ''}` : 'Off'}
          </span>
        </div>
        <div className="bp-practice-controls">
          <button
            className={`bp-practice-toggle${config.transposeEnabled ? ' on' : ''}`}
            onClick={() => update('transposeEnabled', !config.transposeEnabled)}
          >
            <span className="bp-toggle-knob" />
          </button>
          {config.transposeEnabled && (
            <div className="bp-practice-settings">
              <div className="bp-stepper-row">
                <span className="bp-stepper-label">Every</span>
                <div className="bp-stepper">
                  <button onClick={() => update('transposeEvery', Math.max(1, config.transposeEvery - 1))}>−</button>
                  <span>{config.transposeEvery}</span>
                  <button onClick={() => update('transposeEvery', config.transposeEvery + 1)}>+</button>
                </div>
                <span className="bp-stepper-unit">loops</span>
              </div>
              <div className="bp-stepper-row">
                <span className="bp-stepper-label">Transpose</span>
                <div className="bp-stepper">
                  <button onClick={() => update('transposeSemitones', Math.max(1, config.transposeSemitones - 1))}>−</button>
                  <span>{config.transposeSemitones}</span>
                  <button onClick={() => update('transposeSemitones', config.transposeSemitones + 1)}>+</button>
                </div>
                <span className="bp-stepper-unit">semitones</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   BackingPlayer — main component
   ═══════════════════════════════════════════════════════ */
export function BackingPlayer({ hideFretboard = false } = {}) {
  const {
    genre, barCount, chords, tempo, isPlaying, currentBar,
    maxLoops, volumes, isLoading,
    play, stop, setTempo, setMaxLoops,
    setGenre, setBarCount, loadPreset, loadJazzPreset, loadSavedProgression,
    setChord, replaceChords, previewChord,
    setVolume,
    currentChordSymbol, currentBeat, beatsPerBar,
    sfStatus, sfMsg,
    selectedKey, setKey,
    loopCount,
    setPracticeConfig,
    activeStyle, activePartName,
  } = useBackingTrackEngine()

  // UI state — single activePopup controls all overlay panels
  // values: 'tempo' | 'repeats' | 'transposition' | 'genre' | 'mixer' | 'practice' | 'templates' | 'fretboard'
  const [activePopup,    setActivePopup]    = useState(null)
  const [modalOpen,      setModalOpen]      = useState(false)
  const [editingBarInfo, setEditingBarInfo] = useState(null) // { barIdx, firstChordIndex, barChords }
  const [showPolyscale, setShowPolyscale] = useState(false)

  // Polyscale state lives in BackingPlayer so the popup-on-popup can edit it
  // while LiveFretboard reads & applies it.
  const [polyscaleState, setPolyscaleState] = useState({ enabled: false, map: {} })

  // Practice config (local state, synced to engine)
  const [practiceConfig, setPracticeConfigLocal] = useState({
    tempoEnabled: false, tempoAmount: 5, tempoEvery: 1,
    transposeEnabled: false, transposeSemitones: 1, transposeEvery: 1,
  })

  const chordLayerRef = useRef(null)
  const dockRef = useRef(null)

  // ── Sync dock height into a CSS var so popup-overlay sits flush above it
  useEffect(() => {
    if (!dockRef.current) return
    const updateDockHeight = () => {
      const h = dockRef.current?.offsetHeight ?? 152
      document.documentElement.style.setProperty('--bp-dock-height', `${h}px`)
    }
    updateDockHeight()
    const ro = new ResizeObserver(updateDockHeight)
    ro.observe(dockRef.current)
    return () => ro.disconnect()
  }, [])

  // Sync practice config to engine
  const handlePracticeChange = useCallback((newConfig) => {
    setPracticeConfigLocal(newConfig)
    setPracticeConfig(newConfig)
  }, [setPracticeConfig])

  // Close all overlays
  const closeAll = useCallback(() => {
    setActivePopup(null)
    setShowPolyscale(false)
  }, [])

  // Toggle popup (tap same = close)
  const togglePopup = (name) => setActivePopup(prev => prev === name ? null : name)

  // Chord editing — receives full bar context from ChordProgressionEditor
  const handleChordClick = useCallback((barInfo) => {
    setEditingBarInfo(barInfo)
    setModalOpen(true)
  }, [])

  // Confirm: result is { type:'whole', chord } | { type:'split', chord1, chord2 }
  const handleConfirmChord = useCallback((result) => {
    if (!editingBarInfo) return
    const { firstChordIndex, barChords } = editingBarInfo
    const isCurrentlySplit = barChords.length === 2
    const newChords = [...chords]

    if (result.type === 'whole') {
      if (isCurrentlySplit) {
        // Collapse two chords into one (remove the second)
        newChords.splice(firstChordIndex, 2, { ...result.chord })
      } else {
        newChords[firstChordIndex] = { ...result.chord }
      }
    } else {
      // split
      if (isCurrentlySplit) {
        newChords[firstChordIndex]     = { ...result.chord1, beats: 2 }
        newChords[firstChordIndex + 1] = { ...result.chord2, beats: 2 }
      } else {
        // Insert a second chord after the first
        newChords.splice(firstChordIndex, 1,
          { ...result.chord1, beats: 2 },
          { ...result.chord2, beats: 2 }
        )
      }
    }
    replaceChords(newChords)
    setModalOpen(false)
  }, [editingBarInfo, chords, replaceChords])

  // Add a new bar
  const handleAddBar = useCallback(() => {
    const newFirstChordIndex = chords.length
    setBarCount(newFirstChordIndex + 1)
    setEditingBarInfo({ barIdx: newFirstChordIndex, firstChordIndex: newFirstChordIndex, barChords: [] })
    setModalOpen(true)
  }, [chords.length, setBarCount])

  // Play/Stop toggle — closes all popups except Fretboard (which is useful while playing)
  const handlePlayStop = useCallback(() => {
    if (isPlaying) {
      stop(true)
    } else {
      if (activePopup !== 'fretboard') { setActivePopup(null); setShowPolyscale(false) }
      play()
    }
  }, [isPlaying, play, stop, activePopup])

  // Style display name
  const styleName = useMemo(() => {
    for (const cat of GENRE_CATALOG) {
      const sub = cat.subtypes.find(s => s.id === genre)
      if (sub) return sub.label
    }
    return 'Select Style'
  }, [genre])

  // Auto-scroll active chord-bar into view while playing
  useEffect(() => {
    if (!isPlaying || !chordLayerRef.current) return
    const playingEl = chordLayerRef.current.querySelector('.chord-bar-btn.playing, .chord-bar-split.playing')
    if (playingEl) {
      playingEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [isPlaying, currentBar])

  // Polyscale handler — passed both to fretboard panel and to the popup
  const handlePolyscaleChange = useCallback((next) => {
    setPolyscaleState(next)
  }, [])

  const practiceActive = practiceConfig.tempoEnabled || practiceConfig.transposeEnabled

  return (
    <div className="backing-player" onClick={closeAll}>

      {/* ── SF2 Status (floating overlay at top of chord layer) ── */}
      {sfStatus === 'loading' && (
        <div className="bp-status-bar">⏳ {sfMsg || 'Loading SoundFont…'}</div>
      )}
      {sfStatus === 'error' && (
        <div className="bp-status-bar bp-status-bar--error">⚠️ {sfMsg}</div>
      )}

      {/* ── Chord layer (scrollable) ── */}
      <div className="bp-chord-layer" ref={chordLayerRef}>
        {isPlaying && (
          <div className="bp-current-strip">
            <div className="bp-beat-dots">
              {Array.from({ length: beatsPerBar }).map((_, i) => (
                <div key={i} className={`bp-beat-dot${currentBeat === i ? ' active' : ''}`} />
              ))}
            </div>
            <div className="bp-current-chord">{currentChordSymbol ?? '…'}</div>
            <div className="bp-bar-count">
              Bar {currentBar + 1}/{barCount}
              {maxLoops > 0 && <> · Loop {loopCount}/{maxLoops}</>}
            </div>
          </div>
        )}

        <ChordProgressionEditor
          chords={chords}
          currentBar={currentBar}
          isPlaying={isPlaying}
          onChordClick={handleChordClick}
          onAddBar={handleAddBar}
          beatsPerBar={beatsPerBar}
        />
      </div>

      {/* ── Popup overlay (slides up between chord layer and dock) ── */}
      {activePopup && (
        <div
          className={`bp-popup-overlay${activePopup === 'fretboard' ? ' bp-popup-overlay--fretboard' : ''}`}
          onClick={e => e.stopPropagation()}
        >
          {activePopup === 'tempo' && (
            <TempoPopup tempo={tempo} onTempoChange={setTempo} />
          )}
          {activePopup === 'repeats' && (
            <RepeatsPopup maxLoops={maxLoops} onMaxLoopsChange={setMaxLoops} />
          )}
          {activePopup === 'transposition' && (
            <TranspositionPopup selectedKey={selectedKey} onKeyChange={setKey} />
          )}
          {activePopup === 'genre' && (
            <GenrePopup genre={genre} onGenreChange={setGenre} onClose={() => setActivePopup(null)} />
          )}
          {activePopup === 'mixer' && (
            <MixerPopup
              style={activeStyle}
              activePart={activePartName}
              volumes={volumes}
              onVolumeChange={setVolume}
            />
          )}
          {activePopup === 'practice' && (
            <PracticePopup config={practiceConfig} onConfigChange={handlePracticeChange} />
          )}
          {activePopup === 'templates' && (
            <TemplatesPopup
              currentState={{ chords, tempo, genre, selectedKey, barCount }}
              onLoadPreset={(song) => { loadJazzPreset(song); setActivePopup(null) }}
              onLoadProgression={(prog) => { loadSavedProgression(prog); setActivePopup(null) }}
            />
          )}
          {activePopup === 'fretboard' && !hideFretboard && (
            <>
              <ChordPreviewStrip
                chords={chords}
                currentBar={currentBar}
                isPlaying={isPlaying}
              />
              <LiveFretboard
                chords={chords}
                currentBar={currentBar}
                currentChordSymbol={currentChordSymbol}
                isPlaying={isPlaying}
                embedded
                polyscaleEnabled={polyscaleState.enabled}
                polyscaleMap={polyscaleState.map}
                onPolyscaleChange={handlePolyscaleChange}
                onOpenPolyscale={() => setShowPolyscale(true)}
              />
            </>
          )}
        </div>
      )}

      {/* ── Polyscale popup-on-popup (z-30) ── */}
      {showPolyscale && (
        <div className="bp-popup-overlay bp-popup-overlay--polyscale" onClick={e => e.stopPropagation()}>
          <PolyscalePopup
            chords={chords}
            currentBar={currentBar}
            isPlaying={isPlaying}
            polyscaleEnabled={polyscaleState.enabled}
            polyscaleMap={polyscaleState.map}
            onPolyscaleChange={handlePolyscaleChange}
            onClose={() => setShowPolyscale(false)}
          />
        </div>
      )}

      {/* ── Bottom dock ── */}
      <div className="bp-bottom-dock" ref={dockRef} onClick={e => e.stopPropagation()}>

        {/* Info Strip */}
        <div className="bp-info-strip">
          <button
            className={`bp-info-btn${activePopup === 'transposition' ? ' active' : ''}`}
            onClick={() => togglePopup('transposition')}
          >
            {selectedKey.root}
          </button>
          <button
            className={`bp-info-btn${activePopup === 'repeats' ? ' active' : ''}`}
            onClick={() => togglePopup('repeats')}
          >
            {maxLoops === 0 ? '∞' : `${maxLoops}x`}
          </button>
          <button
            className={`bp-info-btn${activePopup === 'tempo' ? ' active' : ''}`}
            onClick={() => togglePopup('tempo')}
          >
            {tempo} bpm
          </button>
        </div>

        {/* Style Name */}
        <button
          className={`bp-style-name${activePopup === 'genre' ? ' active' : ''}`}
          onClick={() => togglePopup('genre')}
        >
          <span>{styleName}</span>
        </button>

        {/* Tab Bar — מימין לשמאל: Templates | Fretboard | Play | Mixer | Practice */}
        <div className="bp-tab-bar">
          <button
            className={`bp-tab${activePopup === 'practice' ? ' active' : ''}${practiceActive ? ' has-indicator' : ''}`}
            onClick={() => togglePopup('practice')}
            title="Practice"
          >
            <svg viewBox="0 0 24 24" className="bp-tab-icon">
              <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/>
            </svg>
          </button>
          <button
            className={`bp-tab${activePopup === 'mixer' ? ' active' : ''}`}
            onClick={() => togglePopup('mixer')}
            title="Mixer"
          >
            <svg viewBox="0 0 24 24" className="bp-tab-icon">
              <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/>
            </svg>
          </button>
          {/* Play/Stop — center */}
          <button
            className={`bp-tab bp-tab--play${isPlaying ? ' playing' : ''}`}
            onClick={handlePlayStop}
            disabled={isLoading}
            title={isPlaying ? 'Stop' : 'Play'}
          >
            {isLoading ? (
              <span className="bp-tab-loading">⏳</span>
            ) : isPlaying ? (
              <svg viewBox="0 0 24 24" className="bp-tab-icon">
                <path d="M6 6h12v12H6z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="bp-tab-icon">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>
          {!hideFretboard && (
            <button
              className={`bp-tab${activePopup === 'fretboard' ? ' active' : ''}`}
              onClick={() => togglePopup('fretboard')}
              title="צוואר"
            >
              <PentatonicBoxIcon className="bp-tab-icon" />
            </button>
          )}
          <button
            className={`bp-tab${activePopup === 'templates' ? ' active' : ''}`}
            onClick={() => togglePopup('templates')}
            title="רצפי אקורדים"
          >
            <svg viewBox="0 0 24 24" className="bp-tab-icon">
              <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 18H6V4h7v5h5v11z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Chord Picker Modal ── */}
      <ChordPickerModal
        isOpen={modalOpen}
        barInfo={editingBarInfo}
        onConfirm={handleConfirmChord}
        onClose={() => setModalOpen(false)}
        onPreview={previewChord}
        onDeleteBar={editingBarInfo && editingBarInfo.barChords.length > 0 ? () => {
          const { firstChordIndex, barChords } = editingBarInfo
          const newChords = [...chords]
          newChords.splice(firstChordIndex, barChords.length)
          if (newChords.length === 0) newChords.push({ root: 'C', quality: 'major', extensions: [] })
          replaceChords(newChords)
          setModalOpen(false)
        } : null}
      />
    </div>
  )
}
