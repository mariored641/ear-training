import React from 'react'
import { useTranslation } from 'react-i18next'

const LOOP_OPTIONS = [
  { value: 0, label: '∞' },
  { value: 1, label: '1×' },
  { value: 2, label: '2×' },
  { value: 4, label: '4×' },
]

export function TransportControls({ isPlaying, isLoading, tempo, maxLoops, currentBar, barCount, onPlay, onStop, onTempoChange, onMaxLoopsChange }) {
  const { t } = useTranslation()
  return (
    <div className="transport-controls">
      <div className="transport-left">
        <button
          className={`play-stop-btn ${isPlaying ? 'playing' : ''}`}
          onClick={isPlaying ? onStop : onPlay}
          disabled={isLoading}
        >
          {isLoading ? '⏳' : isPlaying ? '⏹' : '▶'}
        </button>
        {isLoading && <span className="loading-text">{t('common.loadingSounds')}</span>}
      </div>

      <div className="transport-center">
        <label className="tempo-label">
          <span>BPM</span>
          <input
            type="range"
            min="60"
            max="220"
            value={tempo}
            onChange={e => onTempoChange(Number(e.target.value))}
            className="tempo-slider"
          />
          <span className="tempo-value">{tempo}</span>
        </label>
      </div>

      <div className="transport-right">
        <div className="loop-selector">
          <span className="loop-label">{t('backing.loops')}:</span>
          {LOOP_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`loop-btn ${maxLoops === opt.value ? 'active' : ''}`}
              onClick={() => onMaxLoopsChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {isPlaying && (
          <span className="bar-indicator">{t('backing.currentBar', { current: currentBar + 1, total: barCount })}</span>
        )}
      </div>
    </div>
  )
}
