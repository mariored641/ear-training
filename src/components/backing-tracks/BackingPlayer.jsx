import React, { useState } from 'react'
import { useBackingTrack } from './useBackingTrack.js'
import { GenreSelector } from './GenreSelector.jsx'
import { BarCountSelector } from './BarCountSelector.jsx'
import { ChordProgressionEditor } from './ChordProgressionEditor.jsx'
import { ChordPickerModal } from './ChordPickerModal.jsx'
import { TransportControls } from './TransportControls.jsx'
import { Mixer } from './Mixer.jsx'
import { Visualizer } from './Visualizer.jsx'

const LAYOUT_OPTIONS = [3, 4, 6, 8]

export function BackingPlayer() {
  const {
    genre, barCount, chords, tempo, isPlaying, currentBar,
    maxLoops, volumes, isLoading,
    play, stop, setTempo, setMaxLoops,
    setGenre, setBarCount, loadPreset,
    setChord, previewChord,
    setVolume,
  } = useBackingTrack()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingBar, setEditingBar] = useState(0)
  const [colsPerRow, setColsPerRow] = useState(4)

  const handleChordClick = (barIndex) => {
    setEditingBar(barIndex)
    setModalOpen(true)
  }

  const handleConfirmChord = (chord) => {
    setChord(editingBar, chord)
    setModalOpen(false)
  }

  return (
    <div className="backing-player">

      {/* Row 1: Genre + Preset  |  Bars +/- + Layout */}
      <div className="top-row">
        <div className="genre-preset-group">
          <GenreSelector genre={genre} onGenreChange={setGenre} />
          <button className="preset-btn" onClick={loadPreset} title="Load genre preset">
            ↺ Preset
          </button>
        </div>
        <div className="bars-layout-group">
          <BarCountSelector barCount={barCount} onBarCountChange={setBarCount} />
          <div className="layout-selector">
            {LAYOUT_OPTIONS.map(n => (
              <button
                key={n}
                className={`layout-btn ${colsPerRow === n ? 'active' : ''}`}
                onClick={() => setColsPerRow(n)}
                title={`${n} bars per row`}
              >{n}</button>
            ))}
          </div>
        </div>
      </div>

      <ChordProgressionEditor
        chords={chords}
        currentBar={currentBar}
        isPlaying={isPlaying}
        onChordClick={handleChordClick}
        colsPerRow={colsPerRow}
      />

      <TransportControls
        isPlaying={isPlaying}
        isLoading={isLoading}
        tempo={tempo}
        maxLoops={maxLoops}
        currentBar={currentBar}
        barCount={barCount}
        onPlay={play}
        onStop={stop}
        onTempoChange={setTempo}
        onMaxLoopsChange={setMaxLoops}
      />

      <div className="bottom-row">
        <Mixer volumes={volumes} onVolumeChange={setVolume} />
        <Visualizer isPlaying={isPlaying} currentBar={currentBar} barCount={barCount} />
      </div>

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
