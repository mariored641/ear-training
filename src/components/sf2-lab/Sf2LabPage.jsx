/**
 * Sf2LabPage.jsx — Hidden dashboard for A/B testing SoundFont libraries.
 *
 * Route: /test/sf2-lab (not linked from HomePage, dev-only)
 *
 * Wraps the full Backing Tracks UI (BackingPlayer) — same standards library,
 * chord editor, mixer, tempo, transpose, style picker — and adds:
 *   • A library selector strip (JJazzLab / FluidR3 Mono / GeneralUser GS / LibreArachno)
 *   • A rating panel (1–5 stars per instrument category) saved per library
 *   • A comparison matrix at the bottom
 *
 * The library picker calls SFP.swapSoundFont() directly. Live Fretboard
 * is hidden (not relevant for sound A/B). Everything else from BackingPlayer
 * is available.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import * as SFP from '../../lib/soundfont/SoundFontPlayer'
import { BackingPlayer } from '../backing-tracks/BackingPlayer'
import {
  SOUNDFONT_LIBRARIES,
  isLibraryAvailable,
} from '../../lib/soundfont/SoundFontRegistry'
import '../backing-tracks/BackingTracksPage.css'
import './sf2Lab.css'

// ── Instrument categories for rating ────────────────────────────────────────
const INSTRUMENT_CATEGORIES = [
  { id: 'piano',  label: 'Piano'  },
  { id: 'bass',   label: 'Bass'   },
  { id: 'guitar', label: 'Guitar' },
  { id: 'pad',    label: 'Pad'    },
  { id: 'drums',  label: 'Drums'  },
]

// ── localStorage helpers ────────────────────────────────────────────────────
const LS_RATING_KEY = (libId) => `sf2-lab:ratings:${libId}`
const LS_NOTES_KEY  = (libId) => `sf2-lab:notes:${libId}`

function loadRatings(libId) {
  try { return JSON.parse(localStorage.getItem(LS_RATING_KEY(libId))) || {} }
  catch { return {} }
}
function saveRatings(libId, ratings) {
  try { localStorage.setItem(LS_RATING_KEY(libId), JSON.stringify(ratings)) } catch {}
}
function loadNotes(libId) {
  try { return localStorage.getItem(LS_NOTES_KEY(libId)) || '' } catch { return '' }
}
function saveNotes(libId, value) {
  try { localStorage.setItem(LS_NOTES_KEY(libId), value) } catch {}
}

// ────────────────────────────────────────────────────────────────────────────
export default function Sf2LabPage() {
  // Library state
  const [currentLibId, setCurrentLibId] = useState(() => SFP.getCurrentLibrary()?.id || null)
  const [libStatus, setLibStatus] = useState('idle') // 'idle' | 'loading' | 'ready' | 'error'
  const [libProgress, setLibProgress] = useState(0)
  const [libMsg, setLibMsg] = useState('')

  // Rating / notes for current library
  const [ratings, setRatings] = useState({})
  const [notes, setNotes] = useState('')

  // Keep rating state in sync with current library
  useEffect(() => {
    if (currentLibId) {
      setRatings(loadRatings(currentLibId))
      setNotes(loadNotes(currentLibId))
    }
  }, [currentLibId])

  // ── Library swap ─────────────────────────────────────────────────────────
  const loadLibrary = useCallback(async (libId) => {
    const lib = SOUNDFONT_LIBRARIES.find(l => l.id === libId)
    if (!lib) return
    if (!isLibraryAvailable(lib)) {
      setLibStatus('error')
      setLibMsg(`URL לא מוגדר עבור ${lib.name}`)
      return
    }

    setLibStatus('loading')
    setLibProgress(0)
    setLibMsg('')

    try {
      await SFP.swapSoundFont(lib, (msg, pct) => {
        setLibMsg(msg)
        if (typeof pct === 'number') setLibProgress(pct)
      })
      setCurrentLibId(libId)
      setLibStatus('ready')
    } catch (err) {
      console.error('[Sf2Lab] swap failed', err)
      setLibStatus('error')
      setLibMsg(err.message || 'Failed to load')
    }
  }, [])

  // ── Rating actions ───────────────────────────────────────────────────────
  const setRating = useCallback((category, stars) => {
    if (!currentLibId) return
    setRatings(prev => {
      const next = { ...prev, [category]: stars }
      saveRatings(currentLibId, next)
      return next
    })
  }, [currentLibId])

  const handleNotesChange = useCallback((value) => {
    setNotes(value)
    if (currentLibId) saveNotes(currentLibId, value)
  }, [currentLibId])

  // ── Comparison matrix ────────────────────────────────────────────────────
  const allRatings = useMemo(() => {
    const m = {}
    SOUNDFONT_LIBRARIES.forEach(lib => { m[lib.id] = loadRatings(lib.id) })
    return m
  }, [ratings, currentLibId])

  const winnersPerCategory = useMemo(() => {
    const winners = {}
    INSTRUMENT_CATEGORIES.forEach(cat => {
      let best = 0
      let winnerId = null
      SOUNDFONT_LIBRARIES.forEach(lib => {
        const r = allRatings[lib.id]?.[cat.id] || 0
        if (r > best) { best = r; winnerId = lib.id }
      })
      winners[cat.id] = winnerId
    })
    return winners
  }, [allRatings])

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="sf2lab-page">
      <header className="sf2lab-header">
        <Link to="/" className="sf2lab-back">← דף הבית</Link>
        <h1>🎛️ SF2 Library Lab</h1>
        <div className="sf2lab-subtitle">השוואת ספריות SoundFont — אותו backing, סאונדים שונים, דרג ובחר</div>
      </header>

      {/* ── Library selector ─────────────────────────────────────────── */}
      <section className="sf2lab-section">
        <h2>בחר ספריית סאונדים</h2>
        <div className="sf2lab-lib-grid">
          {SOUNDFONT_LIBRARIES.map(lib => {
            const available = isLibraryAvailable(lib)
            const isCurrent = currentLibId === lib.id
            return (
              <button
                key={lib.id}
                className={`sf2lab-lib-card ${isCurrent ? 'current' : ''} ${!available ? 'disabled' : ''}`}
                disabled={libStatus === 'loading' || !available}
                onClick={() => loadLibrary(lib.id)}
                title={available ? lib.notes : 'URL לא מוגדר'}
              >
                <div className="sf2lab-lib-name">{lib.name}</div>
                <div className="sf2lab-lib-meta">{lib.size}</div>
                <div className="sf2lab-lib-notes">{lib.notes}</div>
                {!available && <div className="sf2lab-lib-warn">⚠ URL לא מוגדר</div>}
                {isCurrent && <div className="sf2lab-lib-badge">טעון</div>}
              </button>
            )
          })}
        </div>

        {libStatus === 'loading' && (
          <div className="sf2lab-progress">
            <div className="sf2lab-progress-bar"><div style={{ width: `${libProgress}%` }} /></div>
            <div className="sf2lab-progress-msg">{libMsg}</div>
          </div>
        )}
        {libStatus === 'error' && <div className="sf2lab-error">{libMsg}</div>}
      </section>

      {/* ── Full Backing Tracks UI ────────────────────────────────── */}
      <section className="sf2lab-section sf2lab-player-section">
        <h2>נגן (Standards, Style, Mixer — הכל זמין)</h2>
        <div className="sf2lab-player-wrapper">
          <BackingPlayer hideFretboard />
        </div>
      </section>

      {/* ── Rating panel ─────────────────────────────────────────────── */}
      <section className="sf2lab-section">
        <h2>
          דרג את הספרייה הטעונה
          {currentLibId && (
            <span className="sf2lab-muted"> — {SOUNDFONT_LIBRARIES.find(l => l.id === currentLibId)?.name}</span>
          )}
        </h2>
        {!currentLibId ? (
          <div className="sf2lab-muted">בחר ספרייה תחילה</div>
        ) : (
          <div className="sf2lab-ratings">
            {INSTRUMENT_CATEGORIES.map(cat => (
              <div key={cat.id} className="sf2lab-rating-row">
                <div className="sf2lab-rating-label">{cat.label}</div>
                <div className="sf2lab-stars">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button
                      key={s}
                      className={`sf2lab-star ${(ratings[cat.id] || 0) >= s ? 'filled' : ''}`}
                      onClick={() => setRating(cat.id, s)}
                    >★</button>
                  ))}
                  {ratings[cat.id] > 0 && (
                    <button className="sf2lab-clear" onClick={() => setRating(cat.id, 0)}>×</button>
                  )}
                </div>
              </div>
            ))}
            <div className="sf2lab-notes-row">
              <label>הערות חופשיות:</label>
              <textarea
                rows={3}
                value={notes}
                onChange={e => handleNotesChange(e.target.value)}
                placeholder="מה אהבת? מה לא? איפה הספרייה הזו זרחה או נכשלה?"
              />
            </div>
          </div>
        )}
      </section>

      {/* ── Comparison matrix ───────────────────────────────────────── */}
      <section className="sf2lab-section">
        <h2>השוואה</h2>
        <table className="sf2lab-matrix">
          <thead>
            <tr>
              <th>ספרייה</th>
              {INSTRUMENT_CATEGORIES.map(cat => (
                <th key={cat.id}>{cat.label}</th>
              ))}
              <th>הערות</th>
            </tr>
          </thead>
          <tbody>
            {SOUNDFONT_LIBRARIES.map(lib => (
              <tr key={lib.id}>
                <td className="sf2lab-matrix-name">{lib.name}</td>
                {INSTRUMENT_CATEGORIES.map(cat => {
                  const r = allRatings[lib.id]?.[cat.id] || 0
                  const isWinner = winnersPerCategory[cat.id] === lib.id && r > 0
                  return (
                    <td key={cat.id} className={isWinner ? 'sf2lab-winner' : ''}>
                      {r > 0 ? `${r}★` : '–'}
                    </td>
                  )
                })}
                <td className="sf2lab-matrix-notes">{loadNotes(lib.id) || '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="sf2lab-muted sf2lab-tip">
          💡 החלף ספרייה למעלה, נגן את אותו preset, דרג. הירוק = המנצח בקטגוריה.
        </div>
      </section>
    </div>
  )
}
