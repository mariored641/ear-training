import React, { useEffect, useRef } from 'react'
import { chordDisplayName } from './useBackingTrackEngine.js'
import './ChordPreviewStrip.css'

/**
 * Horizontal scrolling strip of upcoming chords.
 * Auto-scrolls the active chord into center while playing.
 * Shows current chord highlighted + 5-6 upcoming.
 */
export function ChordPreviewStrip({ chords, currentBar, isPlaying }) {
  const scrollRef = useRef(null)
  const activeRef = useRef(null)

  useEffect(() => {
    if (!isPlaying || !activeRef.current) return
    activeRef.current.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    })
  }, [currentBar, isPlaying])

  if (!chords || chords.length === 0) return null

  return (
    <div className="cps-root" ref={scrollRef}>
      <div className="cps-track">
        {chords.map((chord, i) => {
          const isCurrent = isPlaying && i === currentBar
          return (
            <div
              key={i}
              ref={isCurrent ? activeRef : null}
              className={`cps-cell${isCurrent ? ' current' : ''}`}
            >
              <span className="cps-cell-bar">{i + 1}</span>
              <span className="cps-cell-chord">{chordDisplayName(chord)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
