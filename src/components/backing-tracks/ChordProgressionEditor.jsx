import React, { useMemo, useRef, useState, useCallback } from 'react'
import { chordDisplayName, prettifyChord } from './useBackingTrackEngine.js'

const LONG_PRESS_MS = 450
const MOVE_TOLERANCE_PX = 8

/**
 * Hook: long-press detection that doesn't fire on short tap.
 * Returns props to spread on the target element.
 */
function useLongPress(onLongPress) {
  const timerRef = useRef(null)
  const startPosRef = useRef(null)
  const firedRef = useRef(false)
  const [isPressing, setIsPressing] = useState(false)

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setIsPressing(false)
    startPosRef.current = null
  }, [])

  const onPointerDown = useCallback((e) => {
    firedRef.current = false
    startPosRef.current = { x: e.clientX, y: e.clientY }
    setIsPressing(true)
    timerRef.current = setTimeout(() => {
      firedRef.current = true
      setIsPressing(false)
      onLongPress(e)
    }, LONG_PRESS_MS)
  }, [onLongPress])

  const onPointerMove = useCallback((e) => {
    if (!startPosRef.current) return
    const dx = e.clientX - startPosRef.current.x
    const dy = e.clientY - startPosRef.current.y
    if (Math.abs(dx) > MOVE_TOLERANCE_PX || Math.abs(dy) > MOVE_TOLERANCE_PX) {
      cancel()
    }
  }, [cancel])

  const onPointerUp = useCallback(() => {
    cancel()
  }, [cancel])

  const onPointerCancel = useCallback(() => {
    cancel()
  }, [cancel])

  // Suppress context menu on long-press (mobile shows native menu otherwise)
  const onContextMenu = useCallback((e) => {
    if (firedRef.current) e.preventDefault()
  }, [])

  // Short click: fire callback only if long-press didn't already fire
  const onClick = useCallback(() => {
    if (!firedRef.current) onLongPress()
  }, [onLongPress])

  return {
    isPressing,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onContextMenu,
      onClick,
    },
  }
}

/**
 * Groups a flat chords array (each with optional beats:2 or beats:4) into bars.
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
  if (currentBar.length > 0) bars.push(currentBar)
  return bars
}

/** Single chord bar — long-press → edit with full bar context. */
function ChordBar({ barIdx, chord, chordIndex, isActive, onEdit }) {
  const { isPressing, handlers } = useLongPress(() =>
    onEdit({ barIdx, firstChordIndex: chordIndex, barChords: [chord] })
  )
  return (
    <button
      className={`chord-bar-btn${isActive ? ' playing' : ''}${isPressing ? ' long-pressing' : ''}`}
      title={`Bar ${barIdx + 1}: long-press to edit`}
      {...handlers}
    >
      <span className="bar-number">{barIdx + 1}</span>
      <span className="chord-name">{prettifyChord(chordDisplayName(chord))}</span>
    </button>
  )
}

/** Split-bar — long-press anywhere on the bar opens editor for the whole bar. */
function ChordSplitBar({ barIdx, barSlots, isActive, onEdit }) {
  const firstChordIndex = barSlots[0].chordIndex
  const { isPressing, handlers } = useLongPress(() =>
    onEdit({ barIdx, firstChordIndex, barChords: barSlots.map(s => s.chord) })
  )
  return (
    <div
      className={`chord-bar-split${isActive ? ' playing' : ''}${isPressing ? ' long-pressing' : ''}`}
      {...handlers}
    >
      <span className="bar-number bar-number--split">{barIdx + 1}</span>
      <div className="split-chords">
        {barSlots.map(({ chord, chordIndex }) => (
          <span key={chordIndex} className="chord-half-btn">
            {prettifyChord(chordDisplayName(chord))}
          </span>
        ))}
      </div>
    </div>
  )
}

export function ChordProgressionEditor({
  chords,
  currentBar,
  isPlaying,
  onChordClick,
  onAddBar,
  beatsPerBar = 4,
}) {
  const bars = useMemo(() => buildBars(chords, beatsPerBar), [chords, beatsPerBar])

  return (
    <div className="chord-progression-editor">
      {bars.map((barSlots, barIdx) => {
        const isActive = isPlaying && currentBar === barIdx
        const isSplit  = barSlots.length > 1

        if (!isSplit) {
          const { chord, chordIndex } = barSlots[0]
          return (
            <ChordBar
              key={barIdx}
              barIdx={barIdx}
              chord={chord}
              chordIndex={chordIndex}
              isActive={isActive}
              onEdit={onChordClick}
            />
          )
        }
        return (
          <ChordSplitBar
            key={barIdx}
            barIdx={barIdx}
            barSlots={barSlots}
            isActive={isActive}
            onEdit={onChordClick}
          />
        )
      })}

      {/* Add-bar slot (dashed) — appends a new bar */}
      {onAddBar && (
        <button
          className="chord-bar-add"
          onClick={onAddBar}
          title="Add a new bar"
          aria-label="Add bar"
        >
          +
        </button>
      )}
    </div>
  )
}
