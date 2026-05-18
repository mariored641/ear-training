/**
 * Sf2LabPage.jsx — Hidden dashboard for A/B testing SoundFont libraries.
 *
 * Route: /test/sf2-lab (not linked from HomePage, dev-only)
 *
 * Lets the user:
 *   • Switch between SF2 libraries (JJazzLab / FluidR3 / GeneralUser / Arachno)
 *   • Play the same backing-track preset through each
 *   • Solo per-instrument category (Piano / Bass / Guitar / Drums / Pad)
 *   • Rate each instrument per library (1–5 stars, saved to localStorage)
 *   • Compare results in a matrix at the bottom
 *
 * Decision is empirical — listen, rate, compare. No promote-to-prod button.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import * as SFP from '../../lib/soundfont/SoundFontPlayer'
import { BackingTrackEngine } from '../../lib/style-engine/BackingTrackEngine'
import { parseSty } from '../../lib/style-engine/StyleParser'
import { PRESETS as HUMAN_PRESETS } from '../../lib/style-engine/Humanizer'
import {
  SOUNDFONT_LIBRARIES,
  DEFAULT_LIBRARY_ID,
  isLibraryAvailable,
} from '../../lib/soundfont/SoundFontRegistry'
import './sf2Lab.css'

// ── Test presets ────────────────────────────────────────────────────────────
// All four presets share the same style + chord-progression format, so the only
// variable across tests is the SoundFont. That keeps comparisons fair.

const TEST_PRESETS = [
  {
    id: 'jazz-ii-V-I',
    label: 'Jazz ii–V–I in C',
    styleUrl: '/styles-appdata/Yamaha/Jazzvocal.s264.sty',
    humanizer: 'jazz',
    chords: [
      { symbol: 'Dm7',   beats: 4 },
      { symbol: 'G7',    beats: 4 },
      { symbol: 'Cmaj7', beats: 8 },
    ],
  },
  {
    id: 'bossa',
    label: 'Bossa Nova in F',
    styleUrl: '/styles/Latin/CoolBossa.S460.sty',
    humanizer: 'bossa',
    chords: [
      { symbol: 'Fmaj7',  beats: 4 },
      { symbol: 'Gm7',    beats: 4 },
      { symbol: 'Am7',    beats: 4 },
      { symbol: 'Gm7',    beats: 4 },
    ],
  },
  {
    id: 'samba',
    label: 'Brazilian Samba in Am',
    styleUrl: '/styles/Latin/BrazilianSamba.sty',
    humanizer: 'latin',
    chords: [
      { symbol: 'Am7',   beats: 4 },
      { symbol: 'Dm7',   beats: 4 },
      { symbol: 'G7',    beats: 4 },
      { symbol: 'Cmaj7', beats: 4 },
    ],
  },
  {
    id: 'country',
    label: 'Country in G',
    styleUrl: '/styles/Country/FingerPickin.sty',
    humanizer: 'rock',
    chords: [
      { symbol: 'G',  beats: 4 },
      { symbol: 'D',  beats: 4 },
      { symbol: 'C',  beats: 4 },
      { symbol: 'G',  beats: 4 },
    ],
  },
]

// ── Instrument categories for rating ────────────────────────────────────────
const INSTRUMENT_CATEGORIES = [
  { id: 'piano',  label: 'Piano',  channel: 0 },
  { id: 'bass',   label: 'Bass',   channel: 1 },
  { id: 'guitar', label: 'Guitar', channel: 2 },
  { id: 'pad',    label: 'Pad',    channel: 3 },
  { id: 'drums',  label: 'Drums',  channel: 9 },
]
const ALL_CHANNELS = INSTRUMENT_CATEGORIES.map(i => i.channel)

// ── localStorage helpers ────────────────────────────────────────────────────
const LS_RATING_KEY = (libId) => `sf2-lab:ratings:${libId}`
const LS_NOTES_KEY  = (libId) => `sf2-lab:notes:${libId}`

function loadRatings(libId) {
  try {
    return JSON.parse(localStorage.getItem(LS_RATING_KEY(libId))) || {}
  } catch { return {} }
}
function saveRatings(libId, ratings) {
  try { localStorage.setItem(LS_RATING_KEY(libId), JSON.stringify(ratings)) } catch {}
}
function loadNotes(libId) {
  try { return localStorage.getItem(LS_NOTES_KEY(libId)) || '' } catch { return '' }
}
function saveNotes(libId, notes) {
  try { localStorage.setItem(LS_NOTES_KEY(libId), notes) } catch {}
}

// ────────────────────────────────────────────────────────────────────────────
export default function Sf2LabPage() {
  const engineRef = useRef(null)

  // SF2 library state
  const [currentLibId, setCurrentLibId] = useState(null) // null until loaded
  const [libStatus, setLibStatus] = useState('idle')      // 'idle' | 'loading' | 'ready' | 'error'
  const [libProgress, setLibProgress] = useState(0)
  const [libMsg, setLibMsg] = useState('')

  // Style + preset state
  const [presetIdx, setPresetIdx] = useState(0)
  const [styleStatus, setStyleStatus] = useState('idle') // 'idle' | 'loading' | 'ready' | 'error'
  const [styleErr, setStyleErr] = useState('')

  // Transport
  const [isPlaying, setIsPlaying] = useState(false)
  const [soloChannel, setSoloChannel] = useState(null) // null = full mix; otherwise channel index

  // Ratings / notes (per current library)
  const [ratings, setRatings] = useState({})
  const [notes, setNotes] = useState('')

  // ── Engine setup ─────────────────────────────────────────────────────────
  useEffect(() => {
    engineRef.current = new BackingTrackEngine()
    return () => {
      try { engineRef.current?.stop() } catch {}
    }
  }, [])

  // ── Library loading ──────────────────────────────────────────────────────
  const loadLibrary = useCallback(async (libId) => {
    const lib = SOUNDFONT_LIBRARIES.find(l => l.id === libId)
    if (!lib) return
    if (!isLibraryAvailable(lib)) {
      setLibStatus('error')
      setLibMsg(`URL לא מוגדר עבור ${lib.name}. הגדר VITE_SF2_URL_${lib.id.toUpperCase()} ב-.env.local`)
      return
    }

    // Stop playback before swapping
    try { engineRef.current?.stop() } catch {}
    setIsPlaying(false)
    setStyleStatus('idle') // force style reload after swap

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
      setRatings(loadRatings(libId))
      setNotes(loadNotes(libId))
    } catch (err) {
      console.error('[Sf2Lab] swap failed', err)
      setLibStatus('error')
      setLibMsg(err.message || 'Failed to load')
    }
  }, [])

  // ── Style loading ────────────────────────────────────────────────────────
  const loadCurrentStyle = useCallback(async () => {
    if (libStatus !== 'ready') return
    const preset = TEST_PRESETS[presetIdx]
    setStyleStatus('loading')
    setStyleErr('')
    try {
      const res = await fetch(preset.styleUrl)
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${preset.styleUrl}`)
      const buf = await res.arrayBuffer()
      const style = parseSty(buf)
      engineRef.current.setStyle(style)
      engineRef.current.setHumanizerConfig(HUMAN_PRESETS[preset.humanizer] ?? HUMAN_PRESETS.jazz)
      engineRef.current.setChordProgression(preset.chords)
      setStyleStatus('ready')
    } catch (err) {
      console.error('[Sf2Lab] style load failed', err)
      setStyleStatus('error')
      setStyleErr(err.message || 'Failed to load style')
    }
  }, [libStatus, presetIdx])

  // Auto-load style whenever library or preset changes (after library is ready)
  useEffect(() => {
    if (libStatus === 'ready') loadCurrentStyle()
  }, [libStatus, presetIdx, loadCurrentStyle])

  // ── Transport ────────────────────────────────────────────────────────────
  const play = useCallback(async () => {
    if (!engineRef.current?.isReady() || styleStatus !== 'ready') return
    applySolo(soloChannel)
    await engineRef.current.play()
    setIsPlaying(true)
  }, [styleStatus, soloChannel])

  const stop = useCallback(() => {
    engineRef.current?.stop()
    setIsPlaying(false)
  }, [])

  // ── Channel solo ─────────────────────────────────────────────────────────
  const applySolo = useCallback((chan) => {
    // chan === null → full mix (volume 1 everywhere)
    // chan === <number> → that channel at 1, others at 0
    ALL_CHANNELS.forEach(c => {
      const gain = chan === null || chan === c ? 1 : 0
      SFP.setChannelVolume(c, gain)
    })
  }, [])

  const handleSolo = useCallback((chan) => {
    setSoloChannel(prev => {
      const next = prev === chan ? null : chan
      applySolo(next)
      return next
    })
  }, [applySolo])

  // Ensure solo state is reapplied after a library swap or page mount
  useEffect(() => {
    if (libStatus === 'ready') applySolo(soloChannel)
  }, [libStatus, soloChannel, applySolo])

  // ── Ratings ──────────────────────────────────────────────────────────────
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
        <div className="sf2lab-subtitle">השוואת ספריות SoundFont — האזן, דרג, החלט</div>
      </header>

      {/* ── Library selector ─────────────────────────────────────────── */}
      <section className="sf2lab-section">
        <h2>1. בחר ספרייה</h2>
        <div className="sf2lab-lib-grid">
          {SOUNDFONT_LIBRARIES.map(lib => {
            const available = isLibraryAvailable(lib)
            const isCurrent = currentLibId === lib.id
            const isLoadingThis = libStatus === 'loading' && libMsg && currentLibId === null && false
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

      {/* ── Test material + transport ────────────────────────────────── */}
      <section className="sf2lab-section">
        <h2>2. חומר בדיקה</h2>
        <div className="sf2lab-preset-row">
          <select
            value={presetIdx}
            onChange={e => { setPresetIdx(Number(e.target.value)); if (isPlaying) stop() }}
            disabled={libStatus !== 'ready'}
            className="sf2lab-select"
          >
            {TEST_PRESETS.map((p, i) => <option key={p.id} value={i}>{p.label}</option>)}
          </select>
          {styleStatus === 'loading' && <span className="sf2lab-muted">טוען style...</span>}
          {styleStatus === 'error' && <span className="sf2lab-error-inline">שגיאת style: {styleErr}</span>}
        </div>

        <div className="sf2lab-transport">
          {!isPlaying ? (
            <button
              onClick={play}
              disabled={libStatus !== 'ready' || styleStatus !== 'ready'}
              className="sf2lab-play"
            >▶ נגן</button>
          ) : (
            <button onClick={stop} className="sf2lab-stop">■ עצור</button>
          )}
          <div className="sf2lab-chord-preview">
            {TEST_PRESETS[presetIdx].chords.map((c, i) => (
              <span key={i} className="sf2lab-chord-pill">{c.symbol}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Solo strip ───────────────────────────────────────────────── */}
      <section className="sf2lab-section">
        <h2>3. סולו (להאזין לכלי בודד)</h2>
        <div className="sf2lab-solo-strip">
          <button
            className={`sf2lab-solo-btn ${soloChannel === null ? 'active' : ''}`}
            onClick={() => { setSoloChannel(null); applySolo(null) }}
            disabled={libStatus !== 'ready'}
          >🔊 הכל</button>
          {INSTRUMENT_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`sf2lab-solo-btn ${soloChannel === cat.channel ? 'active' : ''}`}
              onClick={() => handleSolo(cat.channel)}
              disabled={libStatus !== 'ready'}
            >{cat.label}</button>
          ))}
        </div>
      </section>

      {/* ── Rating panel ─────────────────────────────────────────────── */}
      <section className="sf2lab-section">
        <h2>4. דרג כל כלי {currentLibId && <span className="sf2lab-muted">({SOUNDFONT_LIBRARIES.find(l => l.id === currentLibId)?.name})</span>}</h2>
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
        <h2>5. השוואה</h2>
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
          💡 ההמלצה: סובב בין הספריות, השמע את אותו preset, עשה סולו לכל כלי, דרג. הצבע הירוק = המנצח בקטגוריה.
        </div>
      </section>
    </div>
  )
}
