import React, { useState, useMemo } from 'react'
import { SCALE_CATEGORIES, ALL_SCALES_MAP } from '../../constants/allScalesData'
import { chordDisplayName, prettifyChord } from './useBackingTrackEngine.js'
import { parseChordSymbol, CHORD_DATA } from '../../lib/style-engine/YamChordMap.js'

const CHROMATIC = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#']
const defaultEntry = () => ({ scaleId: null, root: 'auto' })

// Maps CHORD_DATA.scale keys (from YamChordMap) → allScalesData IDs
const YAMSCALE_TO_ID = {
  IONIAN:        'ionian',
  DORIAN:        'dorian',
  PHRYGIAN:      'phrygian',
  LYDIAN:        'lydian',
  MIXOLYDIAN:    'mixolydian',
  AEOLIAN:       'aeolian',
  LOCRIAN:       'locrian',
  WHOLE_TONE:    'whole_tone',
  DIMINISHED:    'whole_half_dim',
  MELODIC_MINOR: 'melodic_minor',
}

function getTypeName(chord) {
  const { typeName } = parseChordSymbol(chordDisplayName(chord))
  return typeName
}

function buildAutoMap(chords) {
  const map = {}
  ;(chords || []).forEach((chord, i) => {
    const typeName = getTypeName(chord)
    const data = CHORD_DATA[typeName]
    const scaleId = data ? (YAMSCALE_TO_ID[data.scale] ?? null) : null
    map[i] = { scaleId, root: 'auto' }
  })
  return map
}

function ScaleSelect({ value, onChange }) {
  return (
    <select
      className="bp-poly-select bp-poly-select-scale"
      value={value || ''}
      onChange={e => onChange(e.target.value || null)}
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
  )
}

export function PolyscalePopup({
  chords,
  currentBar,
  isPlaying,
  polyscaleEnabled,
  polyscaleMap,
  onPolyscaleChange,
  onClose,
}) {
  const [assignMode, setAssignMode] = useState('auto')

  // ── Per-chord helpers ──────────────────────────────────────────────────
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

  // ── Auto helpers ───────────────────────────────────────────────────────
  const applyAuto = () => {
    onPolyscaleChange({ enabled: polyscaleEnabled, map: buildAutoMap(chords) })
  }

  const autoPreview = useMemo(() => {
    const seen = new Map()
    ;(chords || []).forEach(chord => {
      const typeName = getTypeName(chord)
      if (!seen.has(typeName)) {
        const data = CHORD_DATA[typeName]
        const scaleId = data ? (YAMSCALE_TO_ID[data.scale] ?? null) : null
        const scaleName = scaleId ? (ALL_SCALES_MAP[scaleId]?.name ?? scaleId) : '—'
        seen.set(typeName, { typeName, scaleName })
      }
    })
    return Array.from(seen.values())
  }, [chords])

  // ── By-type helpers ────────────────────────────────────────────────────
  const chordTypes = useMemo(() => {
    const typeMap = new Map()
    ;(chords || []).forEach((chord, i) => {
      const typeName = getTypeName(chord)
      if (!typeMap.has(typeName)) typeMap.set(typeName, { typeName, bars: [] })
      typeMap.get(typeName).bars.push(i)
    })
    return Array.from(typeMap.values())
  }, [chords])

  const getTypeScale = (typeName) => {
    const bars = chordTypes.find(t => t.typeName === typeName)?.bars ?? []
    return polyscaleMap[bars[0]]?.scaleId ?? null
  }

  const setTypeScale = (typeName, scaleId) => {
    const bars = chordTypes.find(t => t.typeName === typeName)?.bars ?? []
    const next = { ...polyscaleMap }
    bars.forEach(i => {
      next[i] = { ...(next[i] ?? defaultEntry()), scaleId: scaleId || null }
    })
    onPolyscaleChange({ enabled: polyscaleEnabled, map: next })
  }

  // ── Render ─────────────────────────────────────────────────────────────
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

      {/* ── Assignment mode selector ── */}
      <div className="bp-poly-mode-bar">
        <span className="bp-poly-mode-label">Assign by:</span>
        <div className="bp-poly-mode-btns">
          {[
            { id: 'auto',      label: 'Auto' },
            { id: 'by-type',   label: 'By Type' },
            { id: 'per-chord', label: 'Per Chord' },
          ].map(m => (
            <button
              key={m.id}
              className={`bp-poly-mode-btn${assignMode === m.id ? ' active' : ''}`}
              onClick={() => setAssignMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Auto ── */}
      {assignMode === 'auto' && (
        <div className="bp-poly-auto">
          <div className="bp-poly-auto-header">
            <span className="bp-poly-auto-desc">
              Assigns scales by chord function (jazz defaults)
            </span>
            <button className="bp-poly-apply-btn" onClick={applyAuto}>
              Apply
            </button>
          </div>
          <div className="bp-poly-auto-preview">
            {autoPreview.map(({ typeName, scaleName }) => (
              <div key={typeName} className="bp-poly-auto-row">
                <span className="bp-poly-auto-type">{typeName}</span>
                <span className="bp-poly-auto-arrow">→</span>
                <span className="bp-poly-auto-scale">{scaleName}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── By Type ── */}
      {assignMode === 'by-type' && (
        <div className="bp-poly-rows">
          {chordTypes.map(({ typeName, bars }) => (
            <div key={typeName} className="bp-poly-row bp-poly-row--type">
              <span className="bp-poly-chord">{typeName}</span>
              <span className="bp-poly-type-count">
                {bars.length} bar{bars.length !== 1 ? 's' : ''}
              </span>
              <ScaleSelect
                value={getTypeScale(typeName)}
                onChange={scaleId => setTypeScale(typeName, scaleId)}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Per Chord ── */}
      {assignMode === 'per-chord' && (
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
                <ScaleSelect
                  value={entry.scaleId}
                  onChange={scaleId => setEntry(i, 'scaleId', scaleId)}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
