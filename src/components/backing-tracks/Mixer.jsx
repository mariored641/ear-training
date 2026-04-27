import React, { useMemo } from 'react'
import { ACCTYPE_TO_CHANNEL_KEY } from './useBackingTrackEngine.js'

const ALL_CHANNELS = [
  { key: 'piano',  label: 'Piano' },
  { key: 'bass',   label: 'Bass' },
  { key: 'guitar', label: 'Guitar' },
  { key: 'pad',    label: 'Pad / Strings' },
  { key: 'melody', label: 'Melody' },
  { key: 'drums',  label: 'Drums' },
]

/**
 * Mixer — דינמי לפי הסגנון הפעיל.
 * מציג רק כלים שבאמת מנוגנים ב-Main_A של הסגנון הנוכחי.
 * אם אין סגנון טעון, נופל חזרה ל-4 הכלים הקלאסיים (piano/bass/guitar/drums).
 */
export function Mixer({ style, activePart, volumes, onVolumeChange }) {
  const visibleChannels = useMemo(() => {
    if (!style) return ALL_CHANNELS.filter(c => c.key !== 'pad' && c.key !== 'melody')

    // Try the active part first; fall back to Main_A
    const partName = activePart && style.parts?.[activePart] ? activePart : 'Main_A'
    const part = style.parts?.[partName]
    if (!part) return ALL_CHANNELS.filter(c => c.key !== 'pad' && c.key !== 'melody')

    const activeKeys = new Set()
    for (const channelData of Object.values(part.channels || {})) {
      const accType = channelData?.ctab?.accType
      const key     = ACCTYPE_TO_CHANNEL_KEY[accType]
      if (key) activeKeys.add(key)
    }
    return ALL_CHANNELS.filter(c => activeKeys.has(c.key))
  }, [style, activePart])

  if (visibleChannels.length === 0) {
    return <div className="mixer mixer--empty">No instruments in this style.</div>
  }

  return (
    <div className="mixer">
      {visibleChannels.map(ch => (
        <label key={ch.key} className="mixer-channel">
          <span className="mixer-channel-label">{ch.label}</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volumes[ch.key] ?? 0.85}
            onChange={e => onVolumeChange(ch.key, parseFloat(e.target.value))}
            className="mixer-slider"
          />
          <span className="mixer-value">{Math.round((volumes[ch.key] ?? 0.85) * 100)}%</span>
        </label>
      ))}
    </div>
  )
}
