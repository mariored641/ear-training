import React, { useState, useEffect } from 'react'
import { chordDisplayName } from './useBackingTrackEngine.js'

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

const EXTENSIONS = [
  '7', 'maj7', '9', 'b9', '#9',
  '11', '#11', '13', 'b13', 'add9', 'add11',
]

export function ChordPickerModal({ isOpen, barIndex, current, onConfirm, onClose, onPreview }) {
  const [root,       setRoot]       = useState(current?.root       || 'C')
  const [quality,    setQuality]    = useState(current?.quality    || 'major')
  const [extensions, setExtensions] = useState(current?.extensions || [])
  const [slashOn,    setSlashOn]    = useState(!!current?.bassNote)
  const [bassNote,   setBassNote]   = useState(current?.bassNote   || '')

  // Reset when the modal opens for a different bar
  useEffect(() => {
    if (isOpen) {
      setRoot(current?.root || 'C')
      setQuality(current?.quality || 'major')
      setExtensions(current?.extensions ? [...current.extensions] : [])
      setSlashOn(!!current?.bassNote)
      setBassNote(current?.bassNote || '')
    }
  }, [isOpen, barIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null

  const toggleExtension = (ext) => {
    setExtensions(prev =>
      prev.includes(ext) ? prev.filter(e => e !== ext) : [...prev, ext]
    )
  }

  const buildChord = () => ({
    root,
    quality,
    extensions,
    ...(slashOn && bassNote ? { bassNote } : {}),
  })

  const preview = () => onPreview(buildChord())
  const confirm = () => onConfirm(buildChord())

  const displayName = chordDisplayName(buildChord())

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="chord-picker-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Bar {barIndex + 1}</h3>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Root */}
        <section className="picker-section">
          <h4>Root</h4>
          <div className="root-grid">
            {NOTE_ROOTS.map(r => (
              <button
                key={r}
                className={`root-btn ${root === r ? 'active' : ''}`}
                onClick={() => setRoot(r)}
              >
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
                <input
                  type="radio"
                  name="quality"
                  value={q.value}
                  checked={quality === q.value}
                  onChange={() => setQuality(q.value)}
                />
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
                <input
                  type="checkbox"
                  checked={extensions.includes(ext)}
                  onChange={() => toggleExtension(ext)}
                />
                <span>{ext}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Slash chord */}
        <section className="picker-section slash-section">
          <label className="slash-toggle">
            <input
              type="checkbox"
              checked={slashOn}
              onChange={e => setSlashOn(e.target.checked)}
            />
            <span>Slash chord</span>
          </label>
          {slashOn && (
            <select
              className="bass-note-select"
              value={bassNote}
              onChange={e => setBassNote(e.target.value)}
            >
              <option value="">— bass note —</option>
              {NOTE_ROOTS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          )}
        </section>

        {/* Live preview */}
        <div className="chord-preview">
          <span className="chord-preview-name">♪ {displayName}</span>
          <button className="preview-btn" onClick={preview}>🔊 שמע</button>
        </div>

        {/* Actions */}
        <div className="modal-actions">
          <button className="cancel-btn" onClick={onClose}>ביטול</button>
          <button className="confirm-btn" onClick={confirm}>✓ אישור</button>
        </div>
      </div>
    </div>
  )
}
