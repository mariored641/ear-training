import React, { useState, useRef, useEffect, useMemo } from 'react'
import { useBackingTrackEngine, GENRE_CATALOG } from './useBackingTrackEngine.js'
import { BarCountSelector }       from './BarCountSelector.jsx'
import { ChordProgressionEditor } from './ChordProgressionEditor.jsx'
import { ChordPickerModal }       from './ChordPickerModal.jsx'
import { Mixer }                  from './Mixer.jsx'
import LiveFretboard              from './LiveFretboard.jsx'
import { PresetLibrary }          from './PresetLibrary.jsx'

const LAYOUT_OPTIONS = [3, 4, 6, 8]
const ROOT_NOTES = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B']
// iReal Pro transposition grid layout (4×3)
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
   Practice Panel
   ═══════════════════════════════════════════════════════ */
function PracticePanel({
  tempoEnabled, setTempoEnabled, tempoAmount, setTempoAmount, tempoEvery, setTempoEvery,
  transposeEnabled, setTransposeEnabled, transposeSemitones, setTransposeSemitones, transposeEvery, setTransposeEvery,
}) {
  return (
    <div className="bp-practice">
      <div className="bp-popup-title">Practice</div>

      {/* Tempo practice */}
      <div className="bp-practice-section">
        <div className="bp-practice-header">
          <span className="bp-practice-label">Practice Tempo</span>
          <span className="bp-practice-status">
            {tempoEnabled ? `+${tempoAmount} bpm / ${tempoEvery} loop${tempoEvery > 1 ? 's' : ''}` : 'Off'}
          </span>
        </div>
        <div className="bp-practice-controls">
          <button
            className={`bp-practice-toggle${tempoEnabled ? ' on' : ''}`}
            onClick={() => setTempoEnabled(p => !p)}
          >
            <span className="bp-toggle-knob" />
          </button>
          {tempoEnabled && (
            <div className="bp-practice-settings">
              <div className="bp-stepper-row">
                <span className="bp-stepper-label">Every</span>
                <div className="bp-stepper">
                  <button onClick={() => setTempoEvery(Math.max(1, tempoEvery - 1))}>−</button>
                  <span>{tempoEvery}</span>
                  <button onClick={() => setTempoEvery(tempoEvery + 1)}>+</button>
                </div>
                <span className="bp-stepper-unit">loops</span>
              </div>
              <div className="bp-stepper-row">
                <span className="bp-stepper-label">Add</span>
                <div className="bp-stepper">
                  <button onClick={() => setTempoAmount(Math.max(1, tempoAmount - 1))}>−</button>
                  <span>{tempoAmount}</span>
                  <button onClick={() => setTempoAmount(tempoAmount + 1)}>+</button>
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
            {transposeEnabled ? `+${transposeSemitones} st / ${transposeEvery} loop${transposeEvery > 1 ? 's' : ''}` : 'Off'}
          </span>
        </div>
        <div className="bp-practice-controls">
          <button
            className={`bp-practice-toggle${transposeEnabled ? ' on' : ''}`}
            onClick={() => setTransposeEnabled(p => !p)}
          >
            <span className="bp-toggle-knob" />
          </button>
          {transposeEnabled && (
            <div className="bp-practice-settings">
              <div className="bp-stepper-row">
                <span className="bp-stepper-label">Every</span>
                <div className="bp-stepper">
                  <button onClick={() => setTransposeEvery(Math.max(1, transposeEvery - 1))}>−</button>
                  <span>{transposeEvery}</span>
                  <button onClick={() => setTransposeEvery(transposeEvery + 1)}>+</button>
                </div>
                <span className="bp-stepper-unit">loops</span>
              </div>
              <div className="bp-stepper-row">
                <span className="bp-stepper-label">Transpose</span>
                <div className="bp-stepper">
                  <button onClick={() => setTransposeSemitones(Math.max(1, transposeSemitones - 1))}>−</button>
                  <span>{transposeSemitones}</span>
                  <button onClick={() => setTransposeSemitones(transposeSemitones + 1)}>+</button>
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
    setGenre, setBarCount, loadPreset, loadJazzPreset,
    setChord, previewChord,
    setVolume,
    currentChordSymbol, currentBeat, beatsPerBar,
    sfStatus, sfMsg,
    selectedKey, setKey,
    loopCount,
  } = useBackingTrackEngine()

  // UI state
  const [activeTab,   setActiveTab]   = useState('chart')   // 'chart' | 'mixer' | 'practice'
  const [activePopup, setActivePopup] = useState(null)       // null | 'tempo' | 'repeats' | 'transposition' | 'genre'
  const [modalOpen,   setModalOpen]   = useState(false)
  const [editingBar,  setEditingBar]  = useState(0)
  const [colsPerRow,  setColsPerRow]  = useState(4)

  // Practice mode state
  const [practiceTempoEnabled,       setPracticeTempoEnabled]       = useState(false)
  const [practiceTempoAmount,        setPracticeTempoAmount]        = useState(5)
  const [practiceTempoEvery,         setPracticeTempoEvery]         = useState(1)
  const [practiceTransposeEnabled,   setPracticeTransposeEnabled]   = useState(false)
  const [practiceTransposeSemitones, setPracticeTransposeSemitones] = useState(1)
  const [practiceTransposeEvery,     setPracticeTransposeEvery]     = useState(1)

  const chartRef       = useRef(null)
  const prevLoopCount  = useRef(0)

  // Toggle popup (tap same = close)
  const togglePopup = (name) => setActivePopup(prev => prev === name ? null : name)

  // Chord editing
  const handleChordClick  = (barIndex) => { setEditingBar(barIndex); setModalOpen(true) }
  const handleConfirmChord = (chord) => { setChord(editingBar, chord); setModalOpen(false) }

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
    if (!isPlaying || !chartRef.current || activeTab !== 'chart') return
    const playingEl = chartRef.current.querySelector('.chord-bar-btn.playing, .chord-bar-split.playing')
    if (playingEl) {
      playingEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [isPlaying, currentBar, activeTab])

  // Practice mode: apply tempo/transposition on loop boundaries
  useEffect(() => {
    if (loopCount <= prevLoopCount.current || loopCount === 0) {
      prevLoopCount.current = loopCount
      return
    }
    prevLoopCount.current = loopCount

    if (practiceTempoEnabled && loopCount % practiceTempoEvery === 0) {
      setTempo(Math.min(300, tempo + practiceTempoAmount))
    }
    if (practiceTransposeEnabled && loopCount % practiceTransposeEvery === 0) {
      const currentIdx = ROOT_NOTES.indexOf(selectedKey.root)
      if (currentIdx >= 0) {
        const newIdx = (currentIdx + practiceTransposeSemitones) % 12
        setKey(ROOT_NOTES[newIdx], selectedKey.type)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loopCount])

  return (
    <div className="backing-player" onClick={() => activePopup && setActivePopup(null)}>

      {/* ── Toolbar ── */}
      <div className="bp-toolbar" onClick={e => e.stopPropagation()}>
        <div className="bp-toolbar-left">
          <PresetLibrary onLoadPreset={loadJazzPreset} />
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

      {/* ── Main Content Area (scrollable) ── */}
      <div className="bp-content" ref={chartRef}>
        {activeTab === 'chart' && (
          <>
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
            />
          </>
        )}

        {activeTab === 'mixer' && (
          <div className="bp-mixer-view">
            <div className="bp-popup-title">Mixer</div>
            <Mixer volumes={volumes} onVolumeChange={setVolume} />
          </div>
        )}

        {activeTab === 'practice' && (
          <PracticePanel
            tempoEnabled={practiceTempoEnabled}     setTempoEnabled={setPracticeTempoEnabled}
            tempoAmount={practiceTempoAmount}        setTempoAmount={setPracticeTempoAmount}
            tempoEvery={practiceTempoEvery}           setTempoEvery={setPracticeTempoEvery}
            transposeEnabled={practiceTransposeEnabled} setTransposeEnabled={setPracticeTransposeEnabled}
            transposeSemitones={practiceTransposeSemitones} setTransposeSemitones={setPracticeTransposeSemitones}
            transposeEvery={practiceTransposeEvery}   setTransposeEvery={setPracticeTransposeEvery}
          />
        )}
      </div>

      {/* ── Popup Section (between content and bottom) ── */}
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

      {/* ── Bottom Section (info strip + style + tab bar) ── */}
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

        {/* Tab Bar */}
        <div className="bp-tab-bar">
          <button
            className={`bp-tab${activeTab === 'chart' ? ' active' : ''}`}
            onClick={() => { setActiveTab('chart'); setActivePopup(null) }}
            title="Chart"
          >
            <svg viewBox="0 0 24 24" className="bp-tab-icon">
              <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>
            </svg>
          </button>
          <button
            className={`bp-tab${activeTab === 'mixer' ? ' active' : ''}`}
            onClick={() => { setActiveTab('mixer'); setActivePopup(null) }}
            title="Mixer"
          >
            <svg viewBox="0 0 24 24" className="bp-tab-icon">
              <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/>
            </svg>
          </button>
          <button
            className={`bp-tab bp-tab--play${isPlaying ? ' playing' : ''}`}
            onClick={isPlaying ? undefined : play}
            disabled={isLoading}
            title="Play"
          >
            {isLoading ? (
              <span className="bp-tab-loading">⏳</span>
            ) : (
              <svg viewBox="0 0 24 24" className="bp-tab-icon">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>
          <button
            className={`bp-tab bp-tab--stop`}
            onClick={isPlaying ? stop : undefined}
            title="Stop"
          >
            <svg viewBox="0 0 24 24" className="bp-tab-icon">
              <path d="M6 6h12v12H6z"/>
            </svg>
          </button>
          <button
            className={`bp-tab${activeTab === 'practice' ? ' active' : ''}`}
            onClick={() => { setActiveTab('practice'); setActivePopup(null) }}
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
