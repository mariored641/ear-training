import React, { useMemo } from 'react'
import { chordDisplayName } from './useBackingTrackEngine.js'

/**
 * Groups a flat chords array (each with optional beats:2 or beats:4) into bars.
 * Returns an array of bars, each bar = array of { chord, chordIndex }.
 * A bar is 4 beats (or beatsPerBar). Two consecutive beats:2 chords = one bar.
 */
function buildBars(chords, beatsPerBar = 4) {
  const bars = []
  let beatInBar = 0
  let currentBar = []

  chords.forEach((chord, i) => {
    const beats = chord.beats ?? beatsPerBar
    currentBar.push({ chord, chordIndex: i })
    beatInBar += beats
    if (beatInBar >= beatsPerBar) {
      bars.push(currentBar)
      currentBar = []
      beatInBar = 0
    }
  })
  // Any leftover (e.g., odd number of beats:2 chords)
  if (currentBar.length > 0) bars.push(currentBar)
  return bars
}

export function ChordProgressionEditor({ chords, currentBar, isPlaying, onChordClick, colsPerRow = 4, beatsPerBar = 4 }) {
  const bars = useMemo(() => buildBars(chords, beatsPerBar), [chords, beatsPerBar])

  return (
    <div
      className="chord-progression-editor"
      style={{ gridTemplateColumns: `repeat(${colsPerRow}, 1fr)` }}
    >
      {bars.map((barSlots, barIdx) => {
        const isActive = isPlaying && currentBar === barIdx
        const isSplit  = barSlots.length > 1

        if (!isSplit) {
          // Standard single-chord bar
          const { chord, chordIndex } = barSlots[0]
          return (
            <button
              key={barIdx}
              className={`chord-bar-btn ${isActive ? 'playing' : ''}`}
              onClick={() => onChordClick(chordIndex)}
              title={`Bar ${barIdx + 1}: click to edit`}
            >
              <span className="bar-number">{barIdx + 1}</span>
              <span className="chord-name">{chordDisplayName(chord)}</span>
            </button>
          )
        }

        // Split bar: 2 half-beat chords side by side
        return (
          <div
            key={barIdx}
            className={`chord-bar-split ${isActive ? 'playing' : ''}`}
          >
            <span className="bar-number bar-number--split">{barIdx + 1}</span>
            <div className="split-chords">
              {barSlots.map(({ chord, chordIndex }) => (
                <button
                  key={chordIndex}
                  className="chord-half-btn"
                  onClick={() => onChordClick(chordIndex)}
                  title={`Bar ${barIdx + 1}: click to edit`}
                >
                  {chordDisplayName(chord)}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
