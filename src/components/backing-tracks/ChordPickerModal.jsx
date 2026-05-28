import React, { useState, useEffect } from 'react'
import { chordDisplayName, prettifyChord } from './useBackingTrackEngine.js'

const NOTE_ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

const QUALITIES = [
  { value: 'major',     label: 'major' },
  { value: 'minor',     label: 'minor' },
  { value: 'augmented', label: 'aug' },
  { value: 'diminished',label: 'dim' },
  { value: 'halfDim',   label: 'ø' },
  { value: 'minMaj7',   label: 'mMaj' },
  { value: 'sus2',      label: 'sus2' },
  { value: 'sus4',      label: 'sus4' },
]

const EXTENSIONS = ['7', 'maj7', '9', 'b9', '#9', '11', '#11', '13', 'b13', 'add9', 'add11']

const DEFAULT_CHORD = { root: 'C', quality: 'major', extensions: [] }

function useChordState(initial) {
  const src = initial || DEFAULT_CHORD
  const [root,       setRoot]       = useState(src.root       || 'C')
  const [quality,    setQuality]    = useState(src.quality    || 'major')
  const [extensions, setExtensions] = useState(src.extensions ? [...src.extensions] : [])
  const [slashOn,    setSlashOn]    = useState(!!src.bassNote)
  const [bassNote,   setBassNote]   = useState(src.bassNote   || '')

  const reset = (chord) => {
    const c = chord || DEFAULT_CHORD
    setRoot(c.root || 'C')
    setQuality(c.quality || 'major')
    setExtensions(c.extensions ? [...c.extensions] : [])
    setSlashOn(!!c.bassNote)
    setBassNote(c.bassNote || '')
  }

  const toggleExt = (ext) =>
    setExtensions(prev => prev.includes(ext) ? prev.filter(e => e !== ext) : [...prev, ext])

  const build = () => ({
    root, quality, extensions,
    ...(slashOn && bassNote ? { bassNote } : {}),
  })

  return { root, setRoot, quality, setQuality, extensions, toggleExt,
           slashOn, setSlashOn, bassNote, setBassNote, reset, build }
}

/* ── SVG bar-type icons ── */
function WholeMeasureIcon() {
  return (
    <svg viewBox="0 0 48 28" className="bar-type-icon">
      <rect x="2" y="2" width="44" height="24" rx="4" fill="none" stroke="currentColor" strokeWidth="2"/>
      <text x="24" y="20" textAnchor="middle" fontSize="14" fill="currentColor">♩</text>
    </svg>
  )
}
function SplitMeasureIcon() {
  return (
    <svg viewBox="0 0 48 28" className="bar-type-icon">
      <rect x="2" y="2" width="20" height="24" rx="4" fill="none" stroke="currentColor" strokeWidth="2"/>
      <rect x="26" y="2" width="20" height="24" rx="4" fill="none" stroke="currentColor" strokeWidth="2"/>
      <text x="12" y="20" textAnchor="middle" fontSize="11" fill="currentColor">♩</text>
      <text x="36" y="20" textAnchor="middle" fontSize="11" fill="currentColor">♩</text>
    </svg>
  )
}

/* ── Single chord editor section ── */
function ChordEditor({ label, state, onPreview }) {
  const { root, setRoot, quality, setQuality, extensions, toggleExt,
          slashOn, setSlashOn, bassNote, setBassNote, build } = state

  return (
    <div className="cpm-chord-editor">
      {label && <div className="cpm-chord-label">{label}</div>}

      {/* Root */}
      <section className="picker-section">
        <h4>Root</h4>
        <div className="root-grid">
          {NOTE_ROOTS.map(r => (
            <button key={r} className={`root-btn${root === r ? ' active' : ''}`} onClick={() => setRoot(r)}>
              {r}
            </button>
          ))}
        </div>
      </section>

      {/* Quality */}
      <section className="picker-section">
        <h4>Quality</h4>
        <div className="quality-grid">
          {QUALITIES.map(q => (
            <label key={q.value} className="quality-radio">
              <input type="radio" name={`quality-${label}`} value={q.value}
                checked={quality === q.value} onChange={() => setQuality(q.value)} />
              <span>{q.label}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Extensions */}
      <section className="picker-section">
        <h4>Extensions</h4>
        <div className="extensions-grid">
          {EXTENSIONS.map(ext => (
            <label key={ext} className="ext-checkbox">
              <input type="checkbox" checked={extensions.includes(ext)} onChange={() => toggleExt(ext)} />
              <span>{ext}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Slash chord */}
      <section className="picker-section slash-section">
        <label className="slash-toggle">
          <input type="checkbox" checked={slashOn} onChange={e => setSlashOn(e.target.checked)} />
          <span>Slash chord</span>
        </label>
        {slashOn && (
          <select className="bass-note-select" value={bassNote} onChange={e => setBassNote(e.target.value)}>
            <option value="">— bass note —</option>
            {NOTE_ROOTS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        )}
      </section>

      {/* Preview */}
      <div className="chord-preview">
        <span className="chord-preview-name">♪ {prettifyChord(chordDisplayName(build()))}</span>
        <button className="preview-btn" onClick={() => onPreview(build())}>🔊 שמע</button>
      </div>
    </div>
  )
}

/* ── Main modal ── */
export function ChordPickerModal({ isOpen, barInfo, onConfirm, onClose, onPreview, onDeleteBar }) {
  const chord1State = useChordState(barInfo?.barChords?.[0])
  const chord2State = useChordState(barInfo?.barChords?.[1])

  const [barType, setBarType] = useState('whole') // 'whole' | 'split'

  // Reset state when modal opens
  useEffect(() => {
    if (!isOpen || !barInfo) return
    const { barChords } = barInfo
    const isSplit = barChords.length === 2
    setBarType(isSplit ? 'split' : 'whole')
    chord1State.reset(barChords[0] || DEFAULT_CHORD)
    chord2State.reset(barChords[1] || DEFAULT_CHORD)
  }, [isOpen, barInfo?.barIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen || !barInfo) return null

  const confirm = () => {
    if (barType === 'whole') {
      onConfirm({ type: 'whole', chord: chord1State.build() })
    } else {
      onConfirm({ type: 'split', chord1: chord1State.build(), chord2: chord2State.build() })
    }
  }

  const barIdx = barInfo.barIdx ?? 0
  const isNewBar = barInfo.barChords.length === 0

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="chord-picker-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <h3>{isNewBar ? 'New Bar' : `Edit Bar ${barIdx + 1}`}</h3>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Bar-type toggle */}
        <div className="cpm-bar-type-row">
          <button
            className={`cpm-bar-type-btn${barType === 'whole' ? ' active' : ''}`}
            onClick={() => setBarType('whole')}
            title="Whole bar — one chord"
          >
            <WholeMeasureIcon />
            <span>תיבה שלמה</span>
          </button>
          <button
            className={`cpm-bar-type-btn${barType === 'split' ? ' active' : ''}`}
            onClick={() => setBarType('split')}
            title="Split bar — two chords"
          >
            <SplitMeasureIcon />
            <span>2 חצאים</span>
          </button>
        </div>

        {/* Chord editor(s) */}
        {barType === 'whole' ? (
          <ChordEditor state={chord1State} onPreview={onPreview} />
        ) : (
          <div className="cpm-split-editors">
            <ChordEditor label="חצי ראשון" state={chord1State} onPreview={onPreview} />
            <div className="cpm-split-divider" />
            <ChordEditor label="חצי שני" state={chord2State} onPreview={onPreview} />
          </div>
        )}

        {/* Actions */}
        <div className="modal-actions">
          {onDeleteBar && !isNewBar && (
            <button className="delete-bar-btn" onClick={onDeleteBar}>🗑 מחק תיבה</button>
          )}
          <button className="cancel-btn" onClick={onClose}>ביטול</button>
          <button className="confirm-btn" onClick={confirm}>✓ אישור</button>
        </div>

      </div>
    </div>
  )
}
