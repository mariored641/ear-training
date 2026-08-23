import React, { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { GENRE_CATALOG } from './useBackingTrackEngine'
import { formatNoteName } from '../../i18n/musicTerms'
import './MyProgressions.css'

// ─── localStorage helpers ────────────────────────────────────────────────────

const STORAGE_KEY = 'bt_my_progressions'

function loadProgressions() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
  catch { return [] }
}

function saveProgressions(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

// ─── Genre label lookup ──────────────────────────────────────────────────────

const GENRE_LABELS = {}
for (const cat of GENRE_CATALOG) {
  for (const sub of cat.subtypes) {
    GENRE_LABELS[sub.id] = sub.label
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function MyProgressions({ currentState, onLoadProgression, embedded = false }) {
  const { t, i18n } = useTranslation()
  const [isOpen,       setIsOpen]       = useState(embedded)
  const [isSaving,     setIsSaving]     = useState(false)
  const [saveName,     setSaveName]     = useState('')
  const [progressions, setProgressions] = useState(loadProgressions)

  const inputRef = useRef(null)

  // ── Save current progression ────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    const name = saveName.trim()
    if (!name) return

    const prog = {
      id: 'prog_' + Date.now(),
      name,
      chords: currentState.chords.map(c => ({
        ...c,
        extensions: [...(c.extensions || [])],
      })),
      tempo: currentState.tempo,
      genre: currentState.genre,
      key: { ...currentState.selectedKey },
      barCount: currentState.barCount,
      createdAt: Date.now(),
    }

    const updated = [prog, ...progressions]
    saveProgressions(updated)
    setProgressions(updated)
    setSaveName('')
    setIsSaving(false)
  }, [saveName, currentState, progressions])

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = useCallback((id, e) => {
    e.stopPropagation()
    const prog = progressions.find(p => p.id === id)
    if (!window.confirm(t('backing.deleteProgression', { name: prog?.name }))) return

    const updated = progressions.filter(p => p.id !== id)
    saveProgressions(updated)
    setProgressions(updated)
  }, [progressions])

  // ── Load ────────────────────────────────────────────────────────────────────
  const handleSelect = useCallback((prog) => {
    onLoadProgression(prog)
    if (!embedded) setIsOpen(false)
  }, [onLoadProgression, embedded])

  // ── Open save dialog ────────────────────────────────────────────────────────
  const openSaveDialog = useCallback(() => {
    setIsSaving(true)
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  // ── Display helpers ─────────────────────────────────────────────────────────
  const keyLabel = (prog) => `${formatNoteName(prog.key.root, i18n.language)}${prog.key.type === 'minor' ? 'm' : ''}`
  const genreLabel = (genreId) => t(`backing.styles.${genreId}`, { defaultValue: GENRE_LABELS[genreId] || genreId })

  return (
    <>
      {/* Toggle button — only when not embedded */}
      {!embedded && (
        <button
          className={`my-prog-toggle ${isOpen ? 'open' : ''}`}
          onClick={() => setIsOpen(o => !o)}
          title={t('backing.myProgressions')}
        >
          💾 {t('backing.my')} {isOpen ? '▲' : '▼'}
        </button>
      )}

      {/* Panel */}
      {isOpen && (
        <div className={`my-prog-panel${embedded ? ' embedded' : ''}`}>

          {/* Header */}
          <div className="my-prog-header">
            <span className="my-prog-title">{t('backing.myProgressions')}</span>
            {!isSaving && (
              <button className="my-prog-save-btn" onClick={openSaveDialog}>
                + {t('backing.saveCurrent')}
              </button>
            )}
          </div>

          {/* Save dialog */}
          {isSaving && (
            <div className="my-prog-save-row">
              <input
                ref={inputRef}
                className="my-prog-save-input"
                type="text"
                placeholder={t('backing.progressionName')}
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              />
              <button
                className="my-prog-confirm-btn"
                onClick={handleSave}
                disabled={!saveName.trim()}
              >{t('common.save')}</button>
              <button
                className="my-prog-cancel-btn"
                onClick={() => { setIsSaving(false); setSaveName('') }}
              >{t('common.cancel')}</button>
            </div>
          )}

          {/* Progression list */}
          <div className="my-prog-list">
            {progressions.map(prog => (
              <div
                key={prog.id}
                className="my-prog-item"
                onClick={() => handleSelect(prog)}
              >
                <div className="my-prog-item-info">
                  <span className="my-prog-item-title">{prog.name}</span>
                  <span className="my-prog-item-meta">
                    {keyLabel(prog)} · {prog.tempo}♩ · {genreLabel(prog.genre)} · {t('common.bars', { count: prog.barCount })}
                  </span>
                </div>
                <button
                  className="my-prog-delete-btn"
                  onClick={e => handleDelete(prog.id, e)}
                  title={t('common.delete')}
                >🗑️</button>
              </div>
            ))}
            {progressions.length === 0 && (
              <div className="my-prog-empty">
                {t('backing.noSaved')}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
