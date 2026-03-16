/**
 * SoundFontTest.jsx
 * דף בדיקה לשלב 1 — JJazzLab SoundFont Player
 * Route: /soundfont-test
 * לשימוש פנימי בפיתוח בלבד
 */

import React, { useState, useCallback, useRef } from 'react'
import * as SFP from '../../lib/soundfont/SoundFontPlayer'

// אקורד Cmaj7 לבדיקה
const CMAJ7 = [60, 64, 67, 71]  // C4, E4, G4, B4

// תבנית Bass
const BASS_LINE = [36, 38, 40, 41] // C2, D2, E2, F2

const INSTRUMENTS = [
  { label: 'Piano', channel: SFP.CHANNELS.PIANO, program: SFP.GM.ACOUSTIC_GRAND_PIANO, notes: CMAJ7, emoji: '🎹' },
  { label: 'Bass', channel: SFP.CHANNELS.BASS, program: SFP.GM.ELECTRIC_BASS_FINGER, notes: BASS_LINE, emoji: '🎸' },
  { label: 'Guitar (Jazz)', channel: SFP.CHANNELS.GUITAR, program: SFP.GM.ELECTRIC_GUITAR_JAZZ, notes: CMAJ7.map(n => n - 12), emoji: '🎵' },
  { label: 'Strings', channel: SFP.CHANNELS.PAD, program: SFP.GM.STRINGS, notes: CMAJ7, emoji: '🎻' },
]

export default function SoundFontTest() {
  const [status, setStatus] = useState('idle') // idle | loading | ready | error
  const [progress, setProgress] = useState(0)
  const [progressMsg, setProgressMsg] = useState('')
  const [error, setError] = useState(null)
  const [activeNotes, setActiveNotes] = useState({})
  const activeTimers = useRef({})

  const handleLoad = useCallback(async () => {
    if (status === 'loading' || status === 'ready') return
    setStatus('loading')
    setError(null)
    try {
      await SFP.init((msg, pct) => {
        setProgressMsg(msg)
        setProgress(pct)
      })
      setStatus('ready')
    } catch (err) {
      setStatus('error')
      setError(err.message)
    }
  }, [status])

  const playNotes = useCallback(async (channel, program, notes, durationMs = 1200) => {
    if (!SFP.isReady()) return
    await SFP.resumeAudio()
    SFP.programChange(channel, program)

    const key = `${channel}-${notes.join(',')}`

    // עצור אם מנגן
    if (activeTimers.current[key]) {
      clearTimeout(activeTimers.current[key])
      SFP.allNotesOff(channel)
      setActiveNotes(prev => ({ ...prev, [key]: false }))
      delete activeTimers.current[key]
      return
    }

    // נגן
    setActiveNotes(prev => ({ ...prev, [key]: true }))
    notes.forEach(midi => SFP.noteOn(channel, midi, 100))

    activeTimers.current[key] = setTimeout(() => {
      notes.forEach(midi => SFP.noteOff(channel, midi))
      setActiveNotes(prev => ({ ...prev, [key]: false }))
      delete activeTimers.current[key]
    }, durationMs)
  }, [])

  const playAllTogether = useCallback(async () => {
    if (!SFP.isReady()) return
    await SFP.resumeAudio()
    INSTRUMENTS.forEach(({ channel, program, notes }) => {
      SFP.programChange(channel, program)
      notes.forEach(midi => SFP.noteOn(channel, midi, 85))
    })
    setTimeout(() => {
      INSTRUMENTS.forEach(({ channel, notes }) => {
        notes.forEach(midi => SFP.noteOff(channel, midi))
      })
    }, 2000)
  }, [])

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>JJazzLab SoundFont — שלב 1</h1>
        <p style={styles.subtitle}>בדיקת איכות סאונד SF2</p>

        {status === 'idle' && (
          <button style={styles.btnPrimary} onClick={handleLoad}>
            טען SoundFont (341 MB)
          </button>
        )}

        {status === 'loading' && (
          <div style={styles.loadingBox}>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${progress}%` }} />
            </div>
            <p style={styles.progressMsg}>{progressMsg}</p>
            <p style={styles.progressPct}>{progress}%</p>
          </div>
        )}

        {status === 'error' && (
          <div style={styles.errorBox}>
            <p>שגיאה: {error}</p>
            <button style={styles.btnSecondary} onClick={() => setStatus('idle')}>נסה שוב</button>
          </div>
        )}

        {status === 'ready' && (
          <div style={styles.playArea}>
            <p style={styles.readyMsg}>✅ SoundFont טעון! לחץ להשמיע</p>

            <div style={styles.instrumentGrid}>
              {INSTRUMENTS.map(({ label, channel, program, notes, emoji }) => {
                const key = `${channel}-${notes.join(',')}`
                const isActive = activeNotes[key]
                return (
                  <button
                    key={label}
                    style={{ ...styles.instrBtn, ...(isActive ? styles.instrBtnActive : {}) }}
                    onClick={() => playNotes(channel, program, notes)}
                  >
                    <span style={styles.emoji}>{emoji}</span>
                    <span style={styles.instrLabel}>{label}</span>
                    <span style={styles.instrNote}>Cmaj7</span>
                  </button>
                )
              })}
            </div>

            <button style={styles.btnAll} onClick={playAllTogether}>
              ▶ כולם יחד — Cmaj7
            </button>

            <button style={styles.btnStop} onClick={() => SFP.allNotesOff()}>
              ■ עצור הכל
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0f0f1e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'system-ui, sans-serif',
    padding: '20px',
  },
  card: {
    background: '#1a1a2e',
    borderRadius: '16px',
    padding: '40px',
    maxWidth: '500px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  },
  title: {
    color: '#e0d7ff',
    fontSize: '1.6rem',
    margin: '0 0 8px',
    direction: 'rtl',
  },
  subtitle: {
    color: '#888',
    fontSize: '0.9rem',
    margin: '0 0 32px',
  },
  btnPrimary: {
    background: '#6c63ff',
    color: 'white',
    border: 'none',
    padding: '14px 32px',
    borderRadius: '8px',
    fontSize: '1rem',
    cursor: 'pointer',
    direction: 'rtl',
  },
  btnSecondary: {
    background: '#333',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    marginTop: '12px',
  },
  loadingBox: {
    textAlign: 'center',
  },
  progressBar: {
    background: '#2a2a40',
    borderRadius: '8px',
    height: '12px',
    overflow: 'hidden',
    margin: '16px 0 8px',
  },
  progressFill: {
    background: 'linear-gradient(90deg, #6c63ff, #a78bfa)',
    height: '100%',
    borderRadius: '8px',
    transition: 'width 0.3s ease',
  },
  progressMsg: {
    color: '#a0a0c0',
    fontSize: '0.85rem',
    margin: '8px 0 4px',
    direction: 'rtl',
  },
  progressPct: {
    color: '#6c63ff',
    fontWeight: 'bold',
    fontSize: '1.2rem',
    margin: 0,
  },
  errorBox: {
    background: '#2d1a1a',
    borderRadius: '8px',
    padding: '16px',
    color: '#ff8080',
    direction: 'rtl',
  },
  playArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  readyMsg: {
    color: '#7de87d',
    fontSize: '1rem',
    margin: 0,
    direction: 'rtl',
  },
  instrumentGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  instrBtn: {
    background: '#2a2a40',
    border: '2px solid #3a3a5a',
    borderRadius: '10px',
    padding: '16px',
    cursor: 'pointer',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.15s ease',
  },
  instrBtnActive: {
    background: '#3a3060',
    borderColor: '#6c63ff',
    boxShadow: '0 0 12px rgba(108,99,255,0.4)',
  },
  emoji: {
    fontSize: '2rem',
  },
  instrLabel: {
    fontSize: '0.9rem',
    fontWeight: 'bold',
    color: '#d0d0f0',
  },
  instrNote: {
    fontSize: '0.75rem',
    color: '#888',
  },
  btnAll: {
    background: '#6c63ff',
    color: 'white',
    border: 'none',
    padding: '14px',
    borderRadius: '8px',
    fontSize: '1rem',
    cursor: 'pointer',
    direction: 'rtl',
  },
  btnStop: {
    background: '#2a2a40',
    color: '#ff8080',
    border: '1px solid #ff4040',
    padding: '10px',
    borderRadius: '8px',
    fontSize: '0.9rem',
    cursor: 'pointer',
    direction: 'rtl',
  },
}
