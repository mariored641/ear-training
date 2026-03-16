/**
 * BackingEngineTest.jsx — Stage 5 test page
 * Route: /engine-test
 *
 * Tests BackingTrackEngine end-to-end:
 *   SoundFontPlayer + BackingTrackClock + ChordEngine + Humanizer
 *
 * Usage:
 *   1. Click "Load SF2" — loads the SoundFont (one-time, ~30s on first load).
 *   2. Pick a .sty preset.
 *   3. Pick a chord progression preset.
 *   4. Click ▶ Play — hear the full engine running.
 *   5. Watch the beat indicator and current chord update in real time.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { BackingTrackEngine } from '../../lib/style-engine/BackingTrackEngine'
import { parseSty } from '../../lib/style-engine/StyleParser'
import { PRESETS as HUMAN_PRESETS } from '../../lib/style-engine/Humanizer'

// ─── Presets ──────────────────────────────────────────────────────────────────

const STYLE_PRESETS = [
  { label: 'Jazz Waltz Fast',  url: '/styles-appdata/Yamaha/JazzWaltzFast.S499.sty',    human: 'jazz'  },
  { label: 'Cool Bossa',       url: '/styles/Latin/CoolBossa.S460.sty',                 human: 'bossa' },
  { label: 'Guitar Bossa 6',   url: '/styles/Latin/GuitarBossa6.S081.sty',              human: 'bossa' },
  { label: 'Jazz Vocal',       url: '/styles-appdata/Yamaha/Jazzvocal.s264.sty',        human: 'jazz'  },
  { label: 'Jazz Rock Cz2k',   url: '/styles-appdata/YamJJazz/JazzRock_Cz2k.S563.sty', human: 'jazz'  },
  { label: 'Samba City',       url: '/styles-appdata/YamJJazz/SambaCity213.s460.sty',  human: 'latin' },
]

const CHORD_PRESETS = [
  { label: 'ii-V-I (C major)',  chords: [{ symbol: 'Dm7', beats: 4 }, { symbol: 'G7',    beats: 4 }, { symbol: 'Cmaj7', beats: 8  }] },
  { label: 'ii-V-I (F major)',  chords: [{ symbol: 'Gm7', beats: 4 }, { symbol: 'C7',    beats: 4 }, { symbol: 'Fmaj7', beats: 8  }] },
  { label: 'Blues (C)',         chords: [{ symbol: 'C7',  beats: 4 }, { symbol: 'F7',    beats: 4 }, { symbol: 'G7',    beats: 4  }, { symbol: 'C7', beats: 4 }] },
  { label: 'Minor swing (Dm)',  chords: [{ symbol: 'Dm7', beats: 4 }, { symbol: 'Am7',   beats: 4 }, { symbol: 'Bb7',   beats: 4  }, { symbol: 'A7', beats: 4 }] },
  { label: 'Rhythm changes (A)', chords: [{ symbol: 'Bbmaj7', beats: 4 }, { symbol: 'G7', beats: 4 }, { symbol: 'Cm7', beats: 4 }, { symbol: 'F7', beats: 4 }] },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function BackingEngineTest() {
  // SF2 loading
  const [sfStatus, setSfStatus]     = useState('idle')   // idle | loading | ready | error
  const [sfMsg, setSfMsg]           = useState('')
  const [sfPct, setSfPct]           = useState(0)

  // Style loading
  const [styleStatus, setStyleStatus] = useState('idle') // idle | loading | ready | error
  const [styleInfo, setStyleInfo]     = useState(null)   // { name, tempo, timeSignature, parts[] }

  // Playback
  const [isPlaying, setIsPlaying]   = useState(false)
  const [beat, setBeat]             = useState(null)     // { beat, bar }
  const [currentChord, setCurrentChord] = useState(null)

  // Selected presets
  const [styleIdx, setStyleIdx]     = useState(0)
  const [chordIdx, setChordIdx]     = useState(0)

  const engineRef = useRef(null)

  // ── Init engine (one per mount) ──────────────────────────────────────────
  useEffect(() => {
    engineRef.current = new BackingTrackEngine()
    return () => {
      engineRef.current?.stop()
    }
  }, [])

  // ── Load SF2 ─────────────────────────────────────────────────────────────
  const loadSF2 = useCallback(async () => {
    setSfStatus('loading')
    setSfMsg('מתחיל...')
    setSfPct(0)
    try {
      await engineRef.current.init((msg, pct) => {
        setSfMsg(msg)
        setSfPct(pct)
      })
      setSfStatus('ready')
      setSfMsg('מוכן ✓')
    } catch (err) {
      setSfStatus('error')
      setSfMsg(`שגיאה: ${err.message}`)
    }
  }, [])

  // ── Load .sty ────────────────────────────────────────────────────────────
  const loadStyle = useCallback(async (idx) => {
    const preset = STYLE_PRESETS[idx ?? styleIdx]
    setStyleStatus('loading')
    setStyleInfo(null)
    try {
      const res = await fetch(preset.url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buf   = await res.arrayBuffer()
      const style = parseSty(buf)

      engineRef.current.setStyle(style)
      engineRef.current.setHumanizerConfig(HUMAN_PRESETS[preset.human] ?? HUMAN_PRESETS.jazz)

      setStyleInfo({
        name:          style.name,
        tempo:         style.tempo,
        timeSignature: style.timeSignature,
        parts:         Object.keys(style.parts),
      })
      setStyleStatus('ready')
    } catch (err) {
      setStyleStatus('error')
      setStyleInfo({ error: err.message })
    }
  }, [styleIdx])

  // ── Play ─────────────────────────────────────────────────────────────────
  const play = useCallback(async () => {
    if (!engineRef.current?.isReady()) return

    const prog = CHORD_PRESETS[chordIdx].chords
    engineRef.current.setChordProgression(prog)

    engineRef.current.onBeat = ({ beat: b, bar, chord }) => {
      setBeat({ beat: b, bar })
      if (chord) setCurrentChord(chord)
    }
    engineRef.current.onChordChange = ({ to }) => {
      setCurrentChord(to)
    }

    await engineRef.current.play()
    setIsPlaying(true)
  }, [chordIdx])

  // ── Stop ─────────────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    engineRef.current?.stop()
    setIsPlaying(false)
    setBeat(null)
  }, [])

  // ── Chord symbol helper ───────────────────────────────────────────────────
  function chordToLabel(chord) {
    if (!chord) return '–'
    const PITCH = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
    return `${PITCH[chord.rootPitch] ?? '?'}${chord.typeName ?? ''}`
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const beatsPerBar = styleInfo ? parseInt(styleInfo.timeSignature) : 4
  const sfReady     = sfStatus === 'ready'
  const styleReady  = styleStatus === 'ready'

  return (
    <div style={{ padding: '24px', maxWidth: 700, margin: '0 auto', fontFamily: 'monospace' }}>
      <h2 style={{ marginBottom: 4 }}>⚙️ BackingTrackEngine — Stage 5 Test</h2>
      <p style={{ color: '#888', fontSize: 13, marginTop: 0 }}>
        Test: SoundFontPlayer + BackingTrackClock + ChordEngine + Humanizer
      </p>

      {/* ── Step 1: Load SF2 ─────────────────────────────────────── */}
      <section style={sectionStyle}>
        <h3 style={h3}>Step 1 — Load SoundFont</h3>
        <button onClick={loadSF2} disabled={sfStatus === 'loading' || sfStatus === 'ready'} style={btnStyle}>
          {sfStatus === 'ready' ? '✓ SoundFont loaded' : sfStatus === 'loading' ? '⏳ Loading…' : 'Load SF2'}
        </button>
        {sfStatus === 'loading' && (
          <div style={{ marginTop: 8 }}>
            <div style={{ background: '#333', borderRadius: 4, height: 8, width: '100%' }}>
              <div style={{ background: '#4caf50', height: 8, borderRadius: 4, width: `${sfPct}%`, transition: 'width 0.3s' }} />
            </div>
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>{sfMsg}</div>
          </div>
        )}
        {sfStatus === 'error' && <div style={{ color: '#f44', marginTop: 8, fontSize: 13 }}>{sfMsg}</div>}
      </section>

      {/* ── Step 2: Load Style ───────────────────────────────────── */}
      <section style={sectionStyle}>
        <h3 style={h3}>Step 2 — Load Style (.sty)</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={styleIdx}
            onChange={e => setStyleIdx(Number(e.target.value))}
            disabled={!sfReady}
            style={selectStyle}
          >
            {STYLE_PRESETS.map((p, i) => <option key={i} value={i}>{p.label}</option>)}
          </select>
          <button
            onClick={() => loadStyle()}
            disabled={!sfReady || styleStatus === 'loading'}
            style={btnStyle}
          >
            {styleStatus === 'loading' ? '⏳ Loading…' : 'Load Style'}
          </button>
        </div>
        {styleInfo && !styleInfo.error && (
          <div style={{ marginTop: 8, fontSize: 13, color: '#ccc' }}>
            <strong>{styleInfo.name}</strong> — {styleInfo.timeSignature} @ {styleInfo.tempo} BPM
            <br />
            Parts: {styleInfo.parts.join(', ')}
          </div>
        )}
        {styleInfo?.error && <div style={{ color: '#f44', fontSize: 13, marginTop: 8 }}>שגיאה: {styleInfo.error}</div>}
      </section>

      {/* ── Step 3: Chord Progression ────────────────────────────── */}
      <section style={sectionStyle}>
        <h3 style={h3}>Step 3 — Chord Progression</h3>
        <select
          value={chordIdx}
          onChange={e => setChordIdx(Number(e.target.value))}
          disabled={!styleReady}
          style={selectStyle}
        >
          {CHORD_PRESETS.map((p, i) => <option key={i} value={i}>{p.label}</option>)}
        </select>
        <div style={{ marginTop: 6, fontSize: 13, color: '#aaa' }}>
          {CHORD_PRESETS[chordIdx].chords.map((c, i) => (
            <span key={i} style={{ marginRight: 10 }}>{c.symbol} ({c.beats}♩)</span>
          ))}
        </div>
      </section>

      {/* ── Step 4: Transport ────────────────────────────────────── */}
      <section style={sectionStyle}>
        <h3 style={h3}>Step 4 — Play</h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {!isPlaying ? (
            <button onClick={play} disabled={!sfReady || !styleReady} style={{ ...btnStyle, background: '#4caf50', fontSize: 22, padding: '8px 24px' }}>
              ▶
            </button>
          ) : (
            <button onClick={stop} style={{ ...btnStyle, background: '#f44336', fontSize: 22, padding: '8px 24px' }}>
              ■
            </button>
          )}

          {/* Beat indicator */}
          {isPlaying && beat && (
            <div style={{ display: 'flex', gap: 6 }}>
              {Array.from({ length: beatsPerBar }).map((_, i) => (
                <div key={i} style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: beat.beat === i ? '#ffeb3b' : '#444',
                  transition: 'background 0.05s',
                }} />
              ))}
              <span style={{ color: '#888', fontSize: 13, marginLeft: 8 }}>bar {beat.bar + 1}</span>
            </div>
          )}
        </div>

        {/* Current chord */}
        {isPlaying && (
          <div style={{ marginTop: 16, fontSize: 32, fontWeight: 'bold', color: '#fff', letterSpacing: 2 }}>
            {chordToLabel(currentChord)}
          </div>
        )}
      </section>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const sectionStyle = {
  background: '#1e1e2e', borderRadius: 8, padding: '16px 20px', marginBottom: 16,
}
const h3 = { margin: '0 0 12px', fontSize: 14, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1 }
const btnStyle = {
  background: '#2d2d4e', color: '#fff', border: '1px solid #444',
  borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontSize: 14,
}
const selectStyle = {
  background: '#2d2d4e', color: '#fff', border: '1px solid #444',
  borderRadius: 6, padding: '6px 10px', fontSize: 14,
}
