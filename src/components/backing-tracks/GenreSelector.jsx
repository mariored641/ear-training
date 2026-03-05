import React from 'react'

const GENRES = [
  { id: 'jazz',    label: '🎷 Jazz',    subtitle: 'Swing' },
  { id: 'blues',   label: '🎸 Blues',   subtitle: 'Shuffle' },
  { id: 'rock',    label: '⚡ Rock',    subtitle: 'Straight' },
  { id: 'country', label: '🤠 Country', subtitle: 'Boom-Chick' },
]

export function GenreSelector({ genre, onGenreChange }) {
  return (
    <div className="genre-selector">
      {GENRES.map(g => (
        <button
          key={g.id}
          className={`genre-btn ${genre === g.id ? 'active' : ''}`}
          onClick={() => onGenreChange(g.id)}
        >
          <span className="genre-label">{g.label}</span>
          <span className="genre-sub">{g.subtitle}</span>
        </button>
      ))}
    </div>
  )
}
