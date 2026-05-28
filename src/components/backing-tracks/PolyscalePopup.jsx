import React from 'react'
import { SCALE_CATEGORIES } from '../../constants/allScalesData'
import { chordDisplayName, prettifyChord } from './useBackingTrackEngine.js'

const CHROMATIC = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#']
const defaultEntry = () => ({ scaleId: null, root: 'auto' })

export function PolyscalePopup({
  chords,
  currentBar,
  isPlaying,
  polyscaleEnabled,
  polyscaleMap,
  onPolyscaleChange,
  onClose,
}) {
  const setEntry = (barIndex, field, value) => {
    const next = {
      ...polyscaleMap,
      [barIndex]: {
        ...(polyscaleMap[barIndex] ?? defaultEntry()),
        [field]: value || (field === 'root' ? 'auto' : null),
      },
    }
    onPolyscaleChange({ enabled: polyscaleEnabled, map: next })
  }

  return (
    <div className="bp-popup bp-popup--polyscale">
      <div className="bp-popup-title">Polyscale — Scale per chord</div>

      <div className="bp-poly-toolbar">
        <label className="bp-poly-master">
          <input
            type="checkbox"
            checked={!!polyscaleEnabled}
            onChange={e => onPolyscaleChange({ enabled: e.target.checked, map: polyscaleMap })}
          />
          <span>Enable polyscale</span>
        </label>
        <button className="bp-poly-close" onClick={onClose}>Done</button>
      </div>

      <div className="bp-poly-rows">
        {(chords || []).map((chord, i) => {
          const entry = polyscaleMap[i] ?? defaultEntry()
          const isCurrent = isPlaying && currentBar === i
          return (
            <div key={i} className={`bp-poly-row${isCurrent ? ' current' : ''}`}>
              <span className="bp-poly-bar">{i + 1}</span>
              <span className="bp-poly-chord">{prettifyChord(chordDisplayName(chord))}</span>

              <select
                className="bp-poly-select"
                value={entry.root ?? 'auto'}
                onChange={e => setEntry(i, 'root', e.target.value)}
              >
                <option value="auto">Auto</option>
                {CHROMATIC.map(n => <option key={n} value={n}>{n}</option>)}
              </select>

              <select
                className="bp-poly-select bp-poly-select-scale"
                value={entry.scaleId || ''}
                onChange={e => setEntry(i, 'scaleId', e.target.value)}
              >
                <option value="">— none —</option>
                {SCALE_CATEGORIES.map(cat => (
                  <optgroup key={cat.id} label={cat.label}>
                    {cat.items.map(item => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          )
        })}
      </div>
    </div>
  )
}
