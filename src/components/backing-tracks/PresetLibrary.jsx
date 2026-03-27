import React, { useState, useEffect, useRef, useCallback } from 'react'
import './PresetLibrary.css'

// ─── localStorage helpers ────────────────────────────────────────────────────

const FAVORITES_KEY = 'bt_preset_favorites'

function loadFavorites() {
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]') }
  catch { return [] }
}

function saveFavorites(list) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(list))
}

// ─── Library definitions ─────────────────────────────────────────────────────

const LIBRARIES = [
  { id: 'jazz',      label: 'Jazz Standards', icon: '🎷', src: '/data/jazz-standards.json' },
  // Future: { id: 'pop', label: 'Pop Progressions', icon: '🎵', src: '/data/pop-progressions.json' },
]

// ─── Component ───────────────────────────────────────────────────────────────

export function PresetLibrary({ onLoadPreset }) {
  const [isOpen,        setIsOpen]       = useState(false)
  const [activeLib,     setActiveLib]    = useState(LIBRARIES[0].id)
  const [songs,         setSongs]        = useState([])
  const [isLoading,     setIsLoading]    = useState(false)
  const [loadError,     setLoadError]    = useState(null)
  const [query,         setQuery]        = useState('')
  const [favorites,     setFavorites]    = useState(loadFavorites)
  const [activeFilter,  setActiveFilter] = useState('all') // 'all' | 'favorites'

  const cacheRef    = useRef({})
  const searchRef   = useRef(null)

  // ── Load library ────────────────────────────────────────────────────────────
  const loadLibrary = useCallback(async (libId) => {
    const lib = LIBRARIES.find(l => l.id === libId)
    if (!lib) return

    if (cacheRef.current[libId]) {
      setSongs(cacheRef.current[libId])
      return
    }

    setIsLoading(true)
    setLoadError(null)
    try {
      const res = await fetch(lib.src)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      cacheRef.current[libId] = data
      setSongs(data)
    } catch (err) {
      setLoadError(`לא ניתן לטעון: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Auto-load when panel opens
  useEffect(() => {
    if (isOpen) {
      loadLibrary(activeLib)
      setTimeout(() => searchRef.current?.focus(), 150)
    }
  }, [isOpen, activeLib, loadLibrary])

  // ── Filter ──────────────────────────────────────────────────────────────────
  const filtered = songs.filter(s => {
    if (activeFilter === 'favorites' && !favorites.includes(s.title)) return false
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return s.title.toLowerCase().includes(q) || s.composer.toLowerCase().includes(q)
  })

  // ── Favorites ───────────────────────────────────────────────────────────────
  const toggleFavorite = useCallback((title, e) => {
    e.stopPropagation()
    setFavorites(prev => {
      const next = prev.includes(title)
        ? prev.filter(t => t !== title)
        : [...prev, title]
      saveFavorites(next)
      return next
    })
  }, [])

  // ── Load song into player ────────────────────────────────────────────────────
  const handleSelect = useCallback((song) => {
    onLoadPreset(song)
    setIsOpen(false)
  }, [onLoadPreset])

  // ─── Display helpers ──────────────────────────────────────────────────────────
  const keyLabel = (song) => `${song.key.root}${song.key.type === 'minor' ? 'm' : ''}`

  const tsLabel = (ts) => {
    if (!ts || ts === '4/4') return null
    if (ts === '3/4') return '3/4'
    if (ts === '6/4') return '6/4'
    return ts  // 5/4, 2/4, etc.
  }

  const tsWarning = (ts) => {
    if (ts === '5/4' || ts === '7/4') return '⚠️ ' + ts + ' — ינוגן ב-4/4'
    return null
  }

  return (
    <>
      {/* Toggle button */}
      <button
        className={`preset-lib-toggle ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(o => !o)}
        title="ספריית פריסטים"
      >
        📚 Standards {isOpen ? '▲' : '▼'}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="preset-library-panel">

          {/* Library tabs */}
          <div className="lib-tabs">
            {LIBRARIES.map(lib => (
              <button
                key={lib.id}
                className={`lib-tab ${activeLib === lib.id ? 'active' : ''}`}
                onClick={() => setActiveLib(lib.id)}
              >
                {lib.icon} {lib.label}
              </button>
            ))}
          </div>

          {/* Search + filter bar */}
          <div className="lib-search-row">
            <input
              ref={searchRef}
              className="lib-search"
              type="text"
              placeholder="חיפוש שם / מלחין…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <button
              className={`lib-filter-btn ${activeFilter === 'favorites' ? 'active' : ''}`}
              onClick={() => setActiveFilter(f => f === 'favorites' ? 'all' : 'favorites')}
              title="הצג מועדפים בלבד"
            >⭐ {favorites.length}</button>
          </div>

          {/* Status */}
          {isLoading && <div className="lib-status">⏳ טוען ספריה…</div>}
          {loadError && <div className="lib-status lib-status--error">{loadError}</div>}
          {!isLoading && !loadError && (
            <div className="lib-count">{filtered.length} שירים</div>
          )}

          {/* Song list */}
          <div className="lib-list">
            {filtered.map(song => {
              const isFav = favorites.includes(song.title)
              return (
                <div
                  key={song.title}
                  className="lib-item"
                  onClick={() => handleSelect(song)}
                >
                  <button
                    className={`lib-fav-btn ${isFav ? 'starred' : ''}`}
                    onClick={e => toggleFavorite(song.title, e)}
                    title={isFav ? 'הסר ממועדפים' : 'הוסף למועדפים'}
                  >★</button>
                  <div className="lib-item-info">
                    <span className="lib-item-title">{song.title}</span>
                    <span className="lib-item-meta">
                      {song.composer} · {keyLabel(song)} · {song.style}
                      {tsLabel(song.timeSignature) && (
                        <span className="lib-item-ts"> · {tsLabel(song.timeSignature)}</span>
                      )}
                    </span>
                    {tsWarning(song.timeSignature) && (
                      <span className="lib-item-ts-warn">{tsWarning(song.timeSignature)}</span>
                    )}
                  </div>
                  <span className="lib-item-bars">{song.tempo}♩</span>
                </div>
              )
            })}
            {!isLoading && filtered.length === 0 && (
              <div className="lib-empty">
                {activeFilter === 'favorites' ? 'אין מועדפים עדיין' : 'לא נמצאו תוצאות'}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
