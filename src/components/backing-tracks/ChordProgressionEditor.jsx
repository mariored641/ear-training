import React from 'react'
import { chordDisplayName } from './useBackingTrackEngine.js'

export function ChordProgressionEditor({ chords, currentBar, isPlaying, onChordClick, colsPerRow = 4 }) {
  return (
    <div
      className="chord-progression-editor"
      style={{ gridTemplateColumns: `repeat(${colsPerRow}, 1fr)` }}
    >
      {chords.map((chord, i) => (
        <button
          key={i}
          className={`chord-bar-btn ${isPlaying && currentBar === i ? 'playing' : ''}`}
          onClick={() => onChordClick(i)}
          title={`Bar ${i + 1}: click to edit`}
        >
          <span className="bar-number">{i + 1}</span>
          <span className="chord-name">{chordDisplayName(chord)}</span>
        </button>
      ))}
    </div>
  )
}
