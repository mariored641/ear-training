import React, { useState, useRef, useEffect } from 'react'
import { GENRE_CATALOG } from './useBackingTrackEngine'

export function GenreSelector({ genre, onGenreChange }) {
  const [openCategory, setOpenCategory] = useState(null)
  const containerRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e) {
      if (!containerRef.current?.contains(e.target)) setOpenCategory(null)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const activeCategory = GENRE_CATALOG.find(c => c.subtypes.some(s => s.id === genre))?.category

  return (
    <div className="genre-selector" ref={containerRef}>
      {GENRE_CATALOG.map(cat => {
        const isCatActive = activeCategory === cat.category
        const isOpen      = openCategory === cat.category
        const activeSub   = cat.subtypes.find(s => s.id === genre) ?? cat.subtypes[0]
        const shownLabel  = isCatActive ? activeSub.label : cat.subtypes[0].label

        return (
          <div key={cat.category} className="genre-item">
            <div className={`genre-btn ${isCatActive ? 'active' : ''}`}>

              {/* Main area: select category (first sub-style) */}
              <button
                className="genre-btn-main"
                onClick={() => {
                  if (!isCatActive) onGenreChange(cat.subtypes[0].id)
                  setOpenCategory(null)
                }}
              >
                <span className="genre-icon">{cat.icon}</span>
                <div className="genre-text">
                  <span className="genre-label">{cat.label}</span>
                  <span className="genre-sub">{shownLabel}</span>
                </div>
              </button>

              {/* Chevron: open sub-style dropdown */}
              <button
                className={`genre-chevron ${isOpen ? 'open' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  setOpenCategory(isOpen ? null : cat.category)
                }}
                title="בחר סגנון"
              >
                ▾
              </button>
            </div>

            {/* Dropdown */}
            {isOpen && (
              <div className="genre-dropdown">
                {cat.subtypes.map(sub => (
                  <button
                    key={sub.id}
                    className={`genre-dropdown-item ${genre === sub.id ? 'active' : ''}`}
                    onClick={() => {
                      onGenreChange(sub.id)
                      setOpenCategory(null)
                    }}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
