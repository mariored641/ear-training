import React from 'react'

const CHANNELS = [
  { key: 'piano',  label: 'Piano' },
  { key: 'guitar', label: 'Guitar' },
  { key: 'bass',   label: 'Bass' },
  { key: 'drums',  label: 'Drums' },
]

export function Mixer({ volumes, onVolumeChange }) {
  return (
    <div className="mixer">
      {CHANNELS.map(ch => (
        <label key={ch.key} className="mixer-channel">
          <span className="mixer-channel-label">{ch.label}</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volumes[ch.key]}
            onChange={e => onVolumeChange(ch.key, parseFloat(e.target.value))}
            className="mixer-slider"
          />
          <span className="mixer-value">{Math.round(volumes[ch.key] * 100)}%</span>
        </label>
      ))}
    </div>
  )
}
