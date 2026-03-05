import React from 'react'

const MIN_BARS = 1
const MAX_BARS = 32

export function BarCountSelector({ barCount, onBarCountChange }) {
  return (
    <div className="bar-count-selector">
      <span className="bar-count-label">Bars:</span>
      <button
        className="bar-step-btn"
        onClick={() => onBarCountChange(Math.max(MIN_BARS, barCount - 1))}
        disabled={barCount <= MIN_BARS}
        aria-label="Remove bar"
      >−</button>
      <span className="bar-count-value">{barCount}</span>
      <button
        className="bar-step-btn"
        onClick={() => onBarCountChange(Math.min(MAX_BARS, barCount + 1))}
        disabled={barCount >= MAX_BARS}
        aria-label="Add bar"
      >+</button>
    </div>
  )
}
