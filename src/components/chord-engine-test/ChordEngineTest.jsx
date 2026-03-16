/**
 * ChordEngineTest.jsx — Stage 3 test page
 * Route: /chord-engine-test
 *
 * Tests the full Chord→Pattern Engine:
 *   StyleParser → ChordEngine → SoundFontPlayer
 *
 * Usage:
 *   1. Click "Load SF2" to initialize the SoundFont player.
 *   2. Pick a .sty file (preset or upload).
 *   3. Select a StylePart and enter a chord symbol (e.g. "Dm7", "F#maj7").
 *   4. Click "Generate & Play" to hear the result.
 */

import React, { useState, useCallback, useRef } from 'react'
import * as SFP from '../../lib/soundfont/SoundFontPlayer'
import { parseSty } from '../../lib/style-engine/StyleParser'
import { generatePhrasesForChord, parseChordSymbol, getAvailableParts } from '../../lib/style-engine/ChordEngine'
import { PITCH_NAMES } from '../../lib/style-engine/YamChordMap'

// ─── Preset style files ──────────────────────────────────────────────────────

const PRESET_FILES = [
  { label: 'Jazz Waltz Fast',  url: '/styles-appdata/Yamaha/JazzWaltzFast.S499.sty' },
  { label: 'Cool Bossa',       url: '/styles/Latin/CoolBossa.S460.sty' },
  { label: 'Guitar Bossa 6',   url: '/styles/Latin/GuitarBossa6.S081.sty' },
  { label: 'Jazz Vocal',       url: '/styles-appdata/Yamaha/Jazzvocal.s264.sty' },
  { label: 'Jazz Rock Cz2k',  url: '/styles-appdata/YamJJazz/JazzRock_Cz2k.S563.sty' },
  { label: 'Samba City',       url: '/styles-appdata/YamJJazz/SambaCity213.s460.sty' },
]

// Preset chord progressions for quick testing
const PRESET_CHORDS = [
  { label: 'ii-V-I (C)',   chords: ['Dm7', 'G7', 'Cmaj7', 'Cmaj7'] },
  { label: 'ii-V-I (F)',   chords: ['Gm7', 'C7', 'Fmaj7', 'Fmaj7'] },
  { label: 'Blues (C)',    chords: ['C7',  'F7',  'G7',    'C7'] },
  { label: 'Minor swing',  chords: ['Dm7', 'Dm7', 'G7',    'Dm7'] },
]

// ─── AccType → SoundFont channel mapping ─────────────────────────────────────

const ACCTYPE_TO_SFP = {
  RHYTHM:    { channel: SFP.CHANNELS.DRUMS,  program: null,                      label: 'Drums' },
  SUBRHYTHM: { channel: SFP.CHANNELS.DRUMS,  program: null,                      label: 'Sub-drums' },
  BASS:      { channel: SFP.CHANNELS.BASS,   program: SFP.GM.ELECTRIC_BASS_FINGER, label: 'Bass' },
  CHORD1:    { channel: SFP.CHANNELS.PIANO,  program: SFP.GM.ACOUSTIC_GRAND_PIANO, label: 'Piano' },
  CHORD2:    { channel: SFP.CHANNELS.GUITAR, program: SFP.GM.ELECTRIC_GUITAR_JAZZ, label: 'Guitar' },
  PAD:       { channel: SFP.CHANNELS.PAD,    program: SFP.GM.STRINGS,              label: 'Strings' },
  PHRASE1:   { channel: SFP.CHANNELS.MELODY, program: SFP.GM.VIBRAPHONE,           label: 'Phrase 1' },
  PHRASE2:   { channel: SFP.CHANNELS.MELODY, program: SFP.GM.VIBRAPHONE,           label: 'Phrase 2' },
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ChordEngineTest() {
  const [sfStatus, setSfStatus]       = useState('idle') // idle | loading | ready | error
  const [sfProgress, setSfProgress]   = useState(0)
  const [sfProgressMsg, setSfProgressMsg] = useState('')
  const [sfError, setSfError]         = useState(null)

  const [style, setStyle]             = useState(null)
  const [styleError, setStyleError]   = useState(null)
  const [styleLoading, setStyleLoading] = useState(false)
  const [styleFile, setStyleFile]     = useState(null)

  const [partName, setPartName]       = useState('Main_A')
  const [chordStr, setChordStr]       = useState('Dm7')
  const [phrases, setPhrases]         = useState(null)
  const [parsedChord, setParsedChord] = useState(null)

  const timers = useRef([])

  // ── Load SF2 ───────────────────────────────────────────────────────────────

  const handleLoadSF = useCallback(async () => {
    if (sfStatus === 'loading' || sfStatus === 'ready') return
    setSfStatus('loading')
    setSfError(null)
    try {
      await SFP.init((msg, pct) => { setSfProgressMsg(msg); setSfProgress(pct) })
      setSfStatus('ready')
    } catch (e) {
      setSfStatus('error')
      setSfError(e.message)
    }
  }, [sfStatus])

  // ── Load .sty file ─────────────────────────────────────────────────────────

  async function loadStyleFromUrl(url, label) {
    setStyleLoading(true); setStyleError(null); setStyle(null); setStyleFile(label); setPhrases(null)
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)
      const buf = await res.arrayBuffer()
      const s = parseSty(buf)
      setStyle(s)
      // auto-select first available Main part
      const parts = getAvailableParts(s)
      const mainPart = parts.find(p => p.startsWith('Main_')) ?? parts[0]
      if (mainPart) setPartName(mainPart)
    } catch (e) {
      setStyleError(e.message)
      console.error(e)
    } finally {
      setStyleLoading(false)
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0]; if (!file) return
    setStyleLoading(true); setStyleError(null); setStyle(null); setStyleFile(file.name); setPhrases(null)
    try {
      const buf = await file.arrayBuffer()
      const s = parseSty(buf)
      setStyle(s)
      const parts = getAvailableParts(s)
      const mainPart = parts.find(p => p.startsWith('Main_')) ?? parts[0]
      if (mainPart) setPartName(mainPart)
    } catch (e) {
      setStyleError(e.message)
    } finally {
      setStyleLoading(false)
    }
  }

  // ── Generate + Play ────────────────────────────────────────────────────────

  function handleGenerate() {
    if (!style) return
    const chord = parseChordSymbol(chordStr)
    setParsedChord(chord)
    const result = generatePhrasesForChord(style, partName, chord, 0)
    setPhrases(result)
    console.log('[ChordEngine] Generated phrases:', result)
  }

  function handlePlay() {
    if (!style || !phrases || sfStatus !== 'ready') return

    // Clear previous timers
    timers.current.forEach(clearTimeout)
    timers.current = []
    SFP.allNotesOff()

    const bpm    = style.tempo ?? 120
    const msPerBeat = (60 / bpm) * 1000

    for (const [accType, notes] of Object.entries(phrases)) {
      const sfpInfo = ACCTYPE_TO_SFP[accType]
      if (!sfpInfo) continue

      const { channel, program } = sfpInfo

      // Set instrument program (not for drums)
      if (program !== null && accType !== 'RHYTHM' && accType !== 'SUBRHYTHM') {
        SFP.programChange(channel, program)
      }

      for (const note of notes) {
        const startMs = note.position * msPerBeat
        const endMs   = (note.position + note.duration) * msPerBeat

        const tOn  = setTimeout(() => SFP.noteOn(channel, note.pitch, note.velocity), startMs)
        const tOff = setTimeout(() => SFP.noteOff(channel, note.pitch), endMs)
        timers.current.push(tOn, tOff)
      }
    }
  }

  function handleStop() {
    timers.current.forEach(clearTimeout); timers.current = []
    SFP.allNotesOff()
  }

  function handleGenerateAndPlay() {
    handleGenerate()
    // play after state updates (next tick)
    setTimeout(() => {
      if (!style || sfStatus !== 'ready') return
      const chord  = parseChordSymbol(chordStr)
      const result = generatePhrasesForChord(style, partName, chord, 0)

      timers.current.forEach(clearTimeout); timers.current = []; SFP.allNotesOff()
      const bpm = style.tempo ?? 120
      const msPerBeat = (60 / bpm) * 1000

      for (const [accType, notes] of Object.entries(result)) {
        const sfpInfo = ACCTYPE_TO_SFP[accType]; if (!sfpInfo) continue
        const { channel, program } = sfpInfo
        if (program !== null && accType !== 'RHYTHM' && accType !== 'SUBRHYTHM') {
          SFP.programChange(channel, program)
        }
        for (const note of notes) {
          const on  = setTimeout(() => SFP.noteOn(channel, note.pitch, note.velocity), note.position * msPerBeat)
          const off = setTimeout(() => SFP.noteOff(channel, note.pitch), (note.position + note.duration) * msPerBeat)
          timers.current.push(on, off)
        }
      }
    }, 50)
  }

  // ── Rendering helpers ──────────────────────────────────────────────────────

  const parts = style ? getAvailableParts(style) : []

  const totalNoteCount = phrases
    ? Object.values(phrases).reduce((s, arr) => s + (arr?.length ?? 0), 0)
    : 0

  function noteLabel(pitch) {
    return `${PITCH_NAMES[pitch % 12]}${Math.floor(pitch / 12) - 1}`
  }

  // ─── UI ─────────────────────────────────────────────────────────────────────

  const BG    = '#0f0f1e'
  const FG    = '#e0e0e0'
  const PANEL = '#1a1a2e'
  const PURP  = '#a78bfa'
  const GREEN = '#4ade80'
  const RED   = '#f87171'
  const GRAY  = '#6b6b8a'

  const btn = (bg, disabled = false) => ({
    padding: '8px 18px', borderRadius: 6, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    background: disabled ? '#333' : bg, color: '#fff', fontWeight: 600, fontSize: 13,
    opacity: disabled ? 0.5 : 1,
  })

  return (
    <div style={{ padding: 24, fontFamily: 'monospace', background: BG, color: FG, minHeight: '100vh' }}>
      <h2 style={{ color: PURP, marginBottom: 4 }}>🎵 Chord Engine Test — שלב 3</h2>
      <p style={{ color: GRAY, fontSize: 13, marginBottom: 20 }}>
        StyleParser + ChordEngine + SoundFontPlayer
      </p>

      {/* ── SF2 Loader ──────────────────────────────────────────────────── */}
      <section style={{ background: PANEL, padding: 16, borderRadius: 8, marginBottom: 16 }}>
        <h3 style={{ color: PURP, margin: '0 0 10px' }}>1. SoundFont</h3>
        {sfStatus === 'idle' && (
          <button style={btn('#7c3aed')} onClick={handleLoadSF}>Load SF2 (JJazzLab)</button>
        )}
        {sfStatus === 'loading' && (
          <div>
            <div style={{ marginBottom: 6, fontSize: 13, color: GRAY }}>{sfProgressMsg}</div>
            <div style={{ background: '#111', borderRadius: 4, height: 8, width: 300 }}>
              <div style={{ background: PURP, height: 8, borderRadius: 4, width: `${sfProgress}%`, transition: 'width 0.3s' }} />
            </div>
          </div>
        )}
        {sfStatus === 'ready' && <span style={{ color: GREEN }}>✅ SF2 Ready</span>}
        {sfStatus === 'error' && <span style={{ color: RED }}>❌ {sfError}</span>}
      </section>

      {/* ── Style Loader ─────────────────────────────────────────────────── */}
      <section style={{ background: PANEL, padding: 16, borderRadius: 8, marginBottom: 16 }}>
        <h3 style={{ color: PURP, margin: '0 0 10px' }}>2. Style File (.sty)</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {PRESET_FILES.map(f => (
            <button key={f.url}
              onClick={() => loadStyleFromUrl(f.url, f.label)}
              style={{ ...btn('#2d2d50'), background: styleFile === f.label ? PURP : '#2d2d50', fontSize: 12 }}
            >{f.label}</button>
          ))}
        </div>
        <input type="file" accept=".sty,.S*,.s*" onChange={handleFileUpload} style={{ color: FG, fontSize: 13 }} />
        {styleLoading && <span style={{ marginLeft: 12, color: GRAY }}>Parsing...</span>}
        {styleError  && <div style={{ color: RED, marginTop: 8 }}>❌ {styleError}</div>}
        {style && (
          <div style={{ marginTop: 10, fontSize: 13, color: GREEN }}>
            ✅ <strong>{style.name || styleFile}</strong> — {style.timeSignature} @ {style.tempo}BPM —{' '}
            {parts.length} parts — {style.sffType}
          </div>
        )}
      </section>

      {/* ── Chord + Part Controls ─────────────────────────────────────────── */}
      {style && (
        <section style={{ background: PANEL, padding: 16, borderRadius: 8, marginBottom: 16 }}>
          <h3 style={{ color: PURP, margin: '0 0 12px' }}>3. Chord + Part</h3>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            {/* Part selector */}
            <div>
              <label style={{ fontSize: 12, color: GRAY, display: 'block', marginBottom: 4 }}>Style Part</label>
              <select
                value={partName}
                onChange={e => setPartName(e.target.value)}
                style={{ padding: '6px 10px', background: '#1e1e3a', color: FG, border: '1px solid #444', borderRadius: 4, fontSize: 13 }}
              >
                {parts.map(p => <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>)}
              </select>
            </div>

            {/* Chord input */}
            <div>
              <label style={{ fontSize: 12, color: GRAY, display: 'block', marginBottom: 4 }}>Chord (e.g. Dm7, F#maj7)</label>
              <input
                value={chordStr}
                onChange={e => setChordStr(e.target.value)}
                style={{ padding: '6px 10px', background: '#1e1e3a', color: FG, border: '1px solid #444', borderRadius: 4, fontSize: 14, width: 120 }}
              />
            </div>

            <button style={{ ...btn('#059669'), marginTop: 20 }} onClick={handleGenerateAndPlay} disabled={sfStatus !== 'ready'}>
              ▶ Generate + Play
            </button>
            <button style={{ ...btn('#dc2626'), marginTop: 20 }} onClick={handleStop}>■ Stop</button>
          </div>

          {/* Quick chord presets */}
          <div style={{ marginBottom: 8, fontSize: 12, color: GRAY }}>Quick chords:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {PRESET_CHORDS.map(pc => (
              <div key={pc.label} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <span style={{ color: GRAY, fontSize: 11 }}>{pc.label}:</span>
                {pc.chords.map(c => (
                  <button key={c} onClick={() => { setChordStr(c); }}
                    style={{ ...btn('#2d2d50', false), padding: '4px 10px', fontSize: 11,
                      background: chordStr === c ? PURP : '#2d2d50' }}
                  >{c}</button>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Generated Phrases Display ─────────────────────────────────────── */}
      {phrases && parsedChord && (
        <section style={{ background: PANEL, padding: 16, borderRadius: 8 }}>
          <h3 style={{ color: PURP, margin: '0 0 10px' }}>
            Generated Phrases — {chordStr}
            <span style={{ color: GRAY, fontWeight: 400, marginLeft: 10, fontSize: 13 }}>
              root={PITCH_NAMES[parsedChord.rootPitch]} type={parsedChord.typeName} — {totalNoteCount} notes
            </span>
          </h3>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {Object.entries(phrases).map(([accType, notes]) => {
              const sfpInfo = ACCTYPE_TO_SFP[accType]
              return (
                <div key={accType} style={{ background: '#111', borderRadius: 6, padding: 12, minWidth: 180 }}>
                  <div style={{ color: PURP, fontWeight: 700, marginBottom: 8, fontSize: 13 }}>
                    {sfpInfo?.label ?? accType} ({accType})
                  </div>
                  {notes.length === 0
                    ? <span style={{ color: GRAY, fontSize: 12 }}>— muted —</span>
                    : notes.slice(0, 20).map((n, i) => (
                        <div key={i} style={{ fontSize: 11, color: '#b0b0c0', lineHeight: '1.6' }}>
                          {noteLabel(n.pitch)}&nbsp;
                          <span style={{ color: GRAY }}>vel={n.velocity} @{n.position.toFixed(2)}b dur={n.duration.toFixed(2)}</span>
                        </div>
                      ))
                  }
                  {notes.length > 20 && <div style={{ color: GRAY, fontSize: 11 }}>… +{notes.length - 20} more</div>}
                  <div style={{ color: GRAY, fontSize: 11, marginTop: 4, borderTop: '1px solid #333', paddingTop: 4 }}>
                    {notes.length} notes total
                  </div>
                </div>
              )
            })}
          </div>

          {/* Source notes comparison */}
          {style && style.parts[partName] && (
            <details style={{ marginTop: 16 }}>
              <summary style={{ cursor: 'pointer', color: GRAY, fontSize: 13 }}>View source notes (pre-transposition)</summary>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
                {Object.entries(style.parts[partName].channels).map(([ch, data]) => (
                  <div key={ch} style={{ background: '#111', borderRadius: 6, padding: 10, minWidth: 160 }}>
                    <div style={{ color: '#60a5fa', fontWeight: 700, marginBottom: 6, fontSize: 12 }}>
                      ch{ch} — {data.ctab.accType}
                      <span style={{ color: GRAY, fontWeight: 400, marginLeft: 6 }}>
                        {data.ctab.ctb2Main.ntr}/{data.ctab.ctb2Main.ntt}
                      </span>
                    </div>
                    {data.notes.slice(0, 12).map((n, i) => (
                      <div key={i} style={{ fontSize: 10, color: '#888', lineHeight: '1.5' }}>
                        {noteLabel(n.pitch)} v={n.velocity} @{n.position.toFixed(2)}
                      </div>
                    ))}
                    {data.notes.length > 12 && <div style={{ color: GRAY, fontSize: 10 }}>+{data.notes.length - 12} more</div>}
                  </div>
                ))}
              </div>
            </details>
          )}
        </section>
      )}
    </div>
  )
}
