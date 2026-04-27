import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useBackingTrackEngine, GENRE_CATALOG } from './useBackingTrackEngine.js'
import { BarCountSelector }       from './BarCountSelector.jsx'
import { ChordProgressionEditor } from './ChordProgressionEditor.jsx'
import { ChordPickerModal }       from './ChordPickerModal.jsx'
import { Mixer }                  from './Mixer.jsx'
import LiveFretboard              from './LiveFretboard.jsx'
import { PresetLibrary }          from './PresetLibrary.jsx'
import { MyProgressions }         from './MyProgressions.jsx'

const LAYOUT_OPTIONS = [3, 4, 6, 8]
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
export function BackingPlayer() {
  const {
    genre, barCount, chords, tempo, isPlaying, currentBar,
    maxLoops, volumes, isLoading,
    play, stop, setTempo, setMaxLoops,
    setGenre, setBarCount, loadPreset, loadJazzPreset, loadSavedProgression,
    setChord, previewChord,
    setVolume,
    currentChordSymbol, currentBeat, beatsPerBar,
    sfStatus, sfMsg,
    selectedKey, setKey,
    loopCount,
    setPracticeConfig,
    countInEnabled, setCountIn,
    activeStyle, activePartName,
  } = useBackingTrackEngine()

  // UI state — no tabs, everything is popup-based
  const [activePopup, setActivePopup] = useState(null)
  // popup values: 'tempo' | 'repeats' | 'transposition' | 'genre' | 'mixer' | 'practice'
  const [modalOpen,      setModalOpen]      = useState(false)
  const [editingBar,     setEditingBar]     = useState(0)
  const [colsPerRow,     setColsPerRow]     = useState(4)
  const [showFretboard,  setShowFretboard]  = useState(false)

  // Practice config (local state, synced to engine via ref)
  const [practiceConfig, setPracticeConfigLocal] = useState({
    tempoEnabled: false, tempoAmount: 5, tempoEvery: 1,
    transposeEnabled: false, transposeSemitones: 1, transposeEvery: 1,
  })

  const chartRef = useRef(null)

  // Sync practice config to engine
  const handlePracticeChange = useCallback((newConfig) => {
    setPracticeConfigLocal(newConfig)
    setPracticeConfig(newConfig)
  }, [setPracticeConfig])

  // Toggle popup (tap same = close)
  const togglePopup = (name) => setActivePopup(prev => prev === name ? null : name)

  // Chord editing
  const handleChordClick   = (barIndex) => { setEditingBar(barIndex); setModalOpen(true) }
  const handleConfirmChord = (chord)    => { setChord(editingBar, chord); setModalOpen(false) }

  // Play handler — close popups (except fretboard) when playing
  const handlePlay = useCallback(() => {
    setActivePopup(null) // close all popups on play
    play()
  }, [play])

  // Play/Stop toggle
  const handlePlayStop = useCallback(() => {
    if (isPlaying) {
      stop(true)
    } else {
      setActivePopup(null)
      play()
    }
  }, [isPlaying, play, stop])

  // Style display name
  const styleName = useMemo(() => {
    for (const cat of GENRE_CATALOG) {
      const sub = cat.subtypes.find(s => s.id === genre)
      if (sub) return sub.label
    }
    return 'Select Style'
  }, [genre])

  // Auto-scroll during playback
  useEffect(() => {
    if (!isPlaying || !chartRef.current) return
    const playingEl = chartRef.current.querySelector('.chord-bar-btn.playing, .chord-bar-split.playing')
    if (playingEl) {
      playingEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [isPlaying, currentBar])

  return (
    <div className="backing-player" onClick={() => activePopup && setActivePopup(null)}>

      {/* ── Toolbar ── */}
      <div className="bp-toolbar" onClick={e => e.stopPropagation()}>
        <div className="bp-toolbar-left">
          <PresetLibrary onLoadPreset={loadJazzPreset} />
          <MyProgressions
            currentState={{ chords, tempo, genre, selectedKey, barCount }}
            onLoadProgression={loadSavedProgression}
          />
          <button className="bp-icon-btn" onClick={loadPreset} title="Load genre preset">↺</button>
        </div>
        <div className="bp-toolbar-right">
          <BarCountSelector barCount={barCount} onBarCountChange={setBarCount} />
          <div className="bp-layout-selector">
            {LAYOUT_OPTIONS.map(n => (
              <button
                key={n}
                className={`bp-layout-btn${colsPerRow === n ? ' active' : ''}`}
                onClick={() => setColsPerRow(n)}
              >{n}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── SF2 Status ── */}
      {sfStatus === 'loading' && (
        <div className="bp-status-bar">⏳ {sfMsg || 'Loading SoundFont…'}</div>
      )}
      {sfStatus === 'error' && (
        <div className="bp-status-bar bp-status-bar--error">⚠️ {sfMsg}</div>
      )}

      {/* ── Main Content Area (chart always visible) ── */}
      <div className="bp-content" ref={chartRef}>
        <ChordProgressionEditor
          chords={chords}
          currentBar={currentBar}
          isPlaying={isPlaying}
          onChordClick={handleChordClick}
          colsPerRow={colsPerRow}
          beatsPerBar={beatsPerBar}
        />
        <LiveFretboard
          chords={chords}
          currentBar={currentBar}
          currentChordSymbol={currentChordSymbol}
          isPlaying={isPlaying}
          isOpen={showFretboard}
          onToggle={() => setShowFretboard(p => !p)}
        />
      </div>

      {/* ── Popup Section (overlay between content and bottom) ── */}
      {activePopup && (
        <div className="bp-popup-section" onClick={e => e.stopPropagation()}>
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
        </div>
      )}

      {/* ── Playback Display (visible while playing) ── */}
      {isPlaying && (
        <div className="bp-playback" onClick={e => e.stopPropagation()}>
          <div className="bp-beat-dots">
            {Array.from({ length: beatsPerBar }).map((_, i) => (
              <div key={i} className={`bp-beat-dot${currentBeat === i ? ' active' : ''}`} />
            ))}
          </div>
          <div className="bp-current-chord">{currentChordSymbol ?? '…'}</div>
          <div className="bp-bar-count">Bar {currentBar + 1}/{barCount}</div>
        </div>
      )}

      {/* ── Bottom Section ── */}
      <div className="bp-bottom" onClick={e => e.stopPropagation()}>

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
        <button className="bp-style-name" onClick={() => togglePopup('genre')}>
          {styleName}
        </button>

        {/* Tab Bar — 4 items: Fretboard, Mixer, Play/Stop, Practice */}
        <div className="bp-tab-bar">
          <button
            className={`bp-tab${showFretboard ? ' active' : ''}`}
            onClick={() => setShowFretboard(p => !p)}
            title="Fretboard"
          >
            <svg viewBox="0 0 24 24" className="bp-tab-icon">
              <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>
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
          <button
            className={`bp-tab${countInEnabled ? ' active' : ''}`}
            onClick={() => setCountIn(!countInEnabled)}
            title={countInEnabled ? 'Count-in ON' : 'Count-in OFF'}
            style={countInEnabled ? { color: '#00e5ff' } : undefined}
          >
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '-0.5px' }}>1234</span>
          </button>
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
          <button
            className={`bp-tab${activePopup === 'practice' ? ' active' : ''}`}
            onClick={() => togglePopup('practice')}
            title="Practice"
          >
            <svg viewBox="0 0 24 24" className="bp-tab-icon">
              <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Chord Picker Modal ── */}
      <ChordPickerModal
        isOpen={modalOpen}
        barIndex={editingBar}
        current={chords[editingBar]}
        onConfirm={handleConfirmChord}
        onClose={() => setModalOpen(false)}
        onPreview={previewChord}
      />
    </div>
  )
}
