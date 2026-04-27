/**
 * ChordCoverageTab.jsx — Test 2: Chord Coverage.
 *
 * For every noteOn the engine fires, checks whether the note's pitch class
 * belongs to the chord that should be active at that beat. Reports per-chord
 * accuracy, broken down by AccType.
 *
 * Two modes:
 *   1. Manual ii-V-I — chords set programmatically via setChordProgression.
 *      Isolates the engine from data-integrity issues. If this fails, the
 *      engine is broken.
 *   2. Library standard — loaded from public/data/jazz-standards.json,
 *      converted via oldChordToSymbol. If manual passes but library fails,
 *      the bug is in the data or in the conversion.
 *
 * Strict acceptance (BASS): note pitch class ∈ chord intervals.
 * Loose acceptance (CHORD1, CHORD2, PAD, PHRASE1/2): pitch class ∈ chord scale.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { parseSty } from '../../lib/style-engine/StyleParser.js'
import * as SFP from '../../lib/soundfont/SoundFontPlayer.js'
import { InstrumentedEngine } from './shared/InstrumentedEngine.js'
import {
  chordSymbolToPitchClassSet,
  chordSymbolToScaleSet,
  pitchClassName,
  midiToName,
  chordObjectToSymbol,
} from './shared/ChordTheoryUtils.js'
import { oldChordToSymbol } from '../backing-tracks/useBackingTrackEngine.js'

const STYLE_OPTIONS = [
  { id: 'jazz_swing', label: '🎷 Jazz Swing', sty: '/styles-appdata/Yamaha/Jazzvocal.s264.sty', bpm: 120 },
  { id: 'jazz_cool',  label: '🎷 Jazz Cool',  sty: '/styles/Swing&Jazz/LACoolSwing.STY',         bpm: 110 },
  { id: 'rock_pop',   label: '🤘 Pop Rock',   sty: '/styles/Pop&Rock/PopRock.STY',               bpm: 125 },
]

const MANUAL_PROGRESSIONS = {
  iiVI:    { label: 'ii-V-I (Dm7 → G7 → Cmaj7)',  prog: [{symbol:'Dm7',beats:4},{symbol:'G7',beats:4},{symbol:'Cmaj7',beats:8}] },
  iiVI_min:{ label: 'ii-V-i minor (Dm7b5 → G7 → Cm)',
             prog: [{symbol:'Dm7b5',beats:4},{symbol:'G7',beats:4},{symbol:'Cm',beats:8}] },
  blues:   { label: '12-bar blues (C7-F7-G7)',
             prog: [
               {symbol:'C7',beats:16},{symbol:'F7',beats:8},{symbol:'C7',beats:8},
               {symbol:'G7',beats:4},{symbol:'F7',beats:4},{symbol:'C7',beats:8},
             ] },
}

export default function ChordCoverageTab() {
  const [styleId, setStyleId]     = useState('jazz_cool')
  const [mode, setMode]           = useState('manual')
  const [manualKey, setManualKey] = useState('iiVI')
  const [bpm, setBpm]             = useState(110)
  const [recordSeconds, setRecordSeconds] = useState(20)
  const [running, setRunning]     = useState(false)
  const [phase, setPhase]         = useState('idle')
  const [report, setReport]       = useState(null)
  const [standards, setStandards] = useState([])
  const [standardIdx, setStandardIdx] = useState(0)

  const engineRef = useRef(null)
  const noteEventsRef = useRef([])
  const progressionRef = useRef([])

  useEffect(() => {
    fetch('/data/jazz-standards.json')
      .then(r => r.json())
      .then(data => setStandards(data.slice(0, 200)))
      .catch(err => console.warn('Could not load jazz-standards.json', err))
  }, [])

  const styleConfig = STYLE_OPTIONS.find(s => s.id === styleId)

  const handleRun = useCallback(async () => {
    setRunning(true)
    setReport(null)
    noteEventsRef.current = []
    setPhase('loading SoundFont')

    try {
      await SFP.init(() => {})
      await SFP.resumeAudio()

      setPhase('loading style')
      const buf = await fetch(styleConfig.sty).then(r => r.arrayBuffer())
      const style = parseSty(buf)
      style.tempo = bpm

      let progression
      if (mode === 'manual') {
        progression = MANUAL_PROGRESSIONS[manualKey].prog
      } else {
        const song = standards[standardIdx]
        if (!song?.chords?.length) throw new Error('No chords in selected standard')
        progression = song.chords.map(c => ({
          symbol: oldChordToSymbol(c),
          beats: c.beats ?? 4,
        }))
      }
      progressionRef.current = progression

      setPhase('initializing engine')
      const engine = new InstrumentedEngine()
      await engine.init()
      engine.setStyle(style)
      engine.setChordProgression(progression)
      engine.setSkipIntro(true)

      engine.onSchedEntry = (entry) => {
        if (entry.type === 'noteOn') noteEventsRef.current.push(entry)
      }

      engineRef.current = engine

      setPhase('playing — measuring')
      await engine.play()
      await new Promise(r => setTimeout(r, recordSeconds * 1000))

      engine.stop(true)
      setPhase('analyzing')
      setReport(analyze(noteEventsRef.current, progression))
      setPhase('done')
    } catch (err) {
      console.error('[ChordCoverageTab] error', err)
      setPhase('error: ' + (err?.message || String(err)))
    } finally {
      setRunning(false)
      try { engineRef.current?.stop(true) } catch {}
    }
  }, [styleConfig, mode, manualKey, standards, standardIdx, bpm, recordSeconds])

  const handleStop = useCallback(() => {
    try { engineRef.current?.stop(true) } catch {}
    setRunning(false)
    setPhase('stopped')
  }, [])

  return (
    <div style={{ color: '#e0e0f0' }}>
      <h2 style={{ marginTop: 0 }}>Test 2 — Chord Coverage</h2>
      <p style={{ color: '#a0a0c0', maxWidth: 740 }}>
        בודק שכל תו שכל כלי-חיבור (BASS / CHORD1 / CHORD2 / PAD) מנגן שייך
        לאקורד שאמור להיות פעיל באותה שניה. הבס נבדק ב-strict (chord tones בלבד),
        כלי האקורדים ב-loose (חברי הסולם של האקורד).
      </p>

      <div style={controlsRowStyle}>
        <label style={labelStyle}>
          Style:
          <select value={styleId} onChange={e => setStyleId(e.target.value)}
                  disabled={running} style={selectStyle}>
            {STYLE_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>

        <label style={labelStyle}>
          Source:
          <select value={mode} onChange={e => setMode(e.target.value)} disabled={running} style={selectStyle}>
            <option value="manual">Manual progression</option>
            <option value="library" disabled={!standards.length}>
              Library ({standards.length} loaded)
            </option>
          </select>
        </label>

        {mode === 'manual' ? (
          <label style={labelStyle}>
            Progression:
            <select value={manualKey} onChange={e => setManualKey(e.target.value)}
                    disabled={running} style={selectStyle}>
              {Object.entries(MANUAL_PROGRESSIONS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </label>
        ) : (
          <label style={labelStyle}>
            Standard:
            <select value={standardIdx} onChange={e => setStandardIdx(Number(e.target.value))}
                    disabled={running} style={{ ...selectStyle, minWidth: 250 }}>
              {standards.map((s, i) => (
                <option key={i} value={i}>{s.title} — {s.composer}</option>
              ))}
            </select>
          </label>
        )}

        <label style={labelStyle}>
          BPM:
          <input type="number" min={40} max={240} value={bpm}
                 onChange={e => setBpm(Number(e.target.value))}
                 disabled={running} style={numberStyle} />
        </label>
        <label style={labelStyle}>
          Record (sec):
          <input type="number" min={5} max={60} value={recordSeconds}
                 onChange={e => setRecordSeconds(Number(e.target.value))}
                 disabled={running} style={numberStyle} />
        </label>

        <button onClick={running ? handleStop : handleRun}
                style={running ? stopBtnStyle : runBtnStyle}>
          {running ? '■ Stop' : '▶ Run test'}
        </button>
        <span style={{ color: '#a0a0c0', fontSize: 13 }}>{phase}</span>
      </div>

      {report && <ReportView report={report} />}
    </div>
  )
}

const STRICT_ACCTYPES = new Set(['BASS'])
const LOOSE_ACCTYPES  = new Set(['CHORD1', 'CHORD2', 'PAD', 'PHRASE1', 'PHRASE2'])

function analyze(noteEvents, progression) {
  // Pre-compute pitch-class sets for each chord in progression
  const chordSets = progression.map(item => ({
    symbol: item.symbol,
    beats:  item.beats,
    strict: chordSymbolToPitchClassSet(item.symbol),
    loose:  chordSymbolToScaleSet(item.symbol),
  }))

  // Compute per-chord {startBeat, endBeat, idx}
  const chordIntervals = []
  let cursor = 0
  for (let i = 0; i < chordSets.length; i++) {
    chordIntervals.push({
      idx: i,
      symbol: chordSets[i].symbol,
      strict: chordSets[i].strict,
      loose:  chordSets[i].loose,
      startBeat: cursor,
      endBeat:   cursor + chordSets[i].beats,
    })
    cursor += chordSets[i].beats
  }
  const totalBeats = cursor

  // Walk every noteOn, classify against the chord at its loopBeat
  const tally = chordIntervals.map(ch => ({
    symbol: ch.symbol,
    startBeat: ch.startBeat,
    endBeat: ch.endBeat,
    perAccType: {},
    violations: [],
  }))

  let totalNotes = 0
  let totalViolations = 0

  for (const ev of noteEvents) {
    if (ev.accType === 'RHYTHM' || ev.accType === 'SUBRHYTHM') continue
    if (ev.loopBeat == null) continue
    if (totalBeats === 0) continue

    const lb = ((ev.loopBeat % totalBeats) + totalBeats) % totalBeats
    const chord = chordIntervals.find(c => lb >= c.startBeat && lb < c.endBeat)
    if (!chord) continue

    totalNotes++
    const pc = ((ev.pitch % 12) + 12) % 12
    const isStrict = STRICT_ACCTYPES.has(ev.accType)
    const isLoose  = LOOSE_ACCTYPES.has(ev.accType)
    const set = isStrict ? chord.strict : chord.loose
    const isInSet = set.has(pc)

    const at = tally[chord.idx]
    const acc = at.perAccType[ev.accType] = at.perAccType[ev.accType] ||
      { played: 0, ok: 0, fail: 0 }
    acc.played++
    if (isInSet) acc.ok++
    else {
      acc.fail++
      totalViolations++
      if (at.violations.length < 8) {
        at.violations.push({
          accType: ev.accType,
          pitch: ev.pitch,
          pitchName: midiToName(ev.pitch),
          pc,
          pcName: pitchClassName(pc),
          loopBeat: lb.toFixed(2),
          chordSymbol: chord.symbol,
          mode: isStrict ? 'strict' : (isLoose ? 'loose' : 'unknown'),
        })
      }
    }
  }

  const overall = totalNotes ? 100 * (1 - totalViolations / totalNotes) : 0

  return {
    progression: chordIntervals,
    tally,
    totalNotes,
    totalViolations,
    overallAccuracy: overall,
  }
}

function ReportView({ report }) {
  const accTypes = ['BASS', 'CHORD1', 'CHORD2', 'PAD', 'PHRASE1', 'PHRASE2']
  const present = accTypes.filter(at =>
    report.tally.some(t => t.perAccType[at])
  )

  return (
    <div style={{ marginTop: 18 }}>
      <div style={summaryBoxStyle}>
        <strong>{report.totalNotes}</strong> harmonic notes ·
        <strong style={{ color: report.overallAccuracy > 90 ? '#7eda7e' : '#ff8a8a' }}>
          {' '}{report.overallAccuracy.toFixed(1)}%
        </strong> accuracy
        ({report.totalViolations} violations)
      </div>

      <h3 style={subHeader}>Per-chord accuracy</h3>
      <table style={tableStyle}>
        <thead>
          <tr style={{ background: '#1e1e36' }}>
            <th style={thStyle}>#</th>
            <th style={thStyle}>Chord</th>
            <th style={thStyle}>Beats</th>
            {present.map(at => (
              <th key={at} style={{ ...thStyle, textAlign: 'right' }}>{at}</th>
            ))}
            <th style={{ ...thStyle, textAlign: 'right' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {report.tally.map((row, i) => {
            const totalPlayed = present.reduce((a, at) => a + (row.perAccType[at]?.played || 0), 0)
            const totalOk     = present.reduce((a, at) => a + (row.perAccType[at]?.ok || 0), 0)
            const acc = totalPlayed ? 100 * totalOk / totalPlayed : 0
            return (
              <React.Fragment key={i}>
                <tr>
                  <td style={tdStyle}>{i + 1}</td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{row.symbol}</td>
                  <td style={tdStyle}>{row.endBeat - row.startBeat}</td>
                  {present.map(at => {
                    const v = row.perAccType[at]
                    if (!v) return <td key={at} style={{ ...tdStyle, textAlign: 'right', color: '#555' }}>—</td>
                    const pct = 100 * v.ok / v.played
                    return (
                      <td key={at} style={{
                        ...tdStyle,
                        textAlign: 'right',
                        color: pct === 100 ? '#7eda7e' : pct >= 80 ? '#ffd17f' : '#ff8a8a',
                      }}>
                        {v.ok}/{v.played} ({pct.toFixed(0)}%)
                      </td>
                    )
                  })}
                  <td style={{
                    ...tdStyle,
                    textAlign: 'right',
                    fontWeight: 600,
                    color: acc === 100 ? '#7eda7e' : acc >= 80 ? '#ffd17f' : '#ff8a8a',
                  }}>
                    {acc.toFixed(0)}%
                  </td>
                </tr>
                {row.violations.length > 0 && (
                  <tr>
                    <td colSpan={3 + present.length + 1} style={{
                      ...tdStyle,
                      paddingLeft: 24,
                      fontSize: 12,
                      color: '#a0a0c0',
                      background: '#11111e',
                    }}>
                      <strong>Violations:</strong>{' '}
                      {row.violations.map((v, j) => (
                        <span key={j} style={{ marginRight: 14 }}>
                          {v.accType}: <span style={{ color: '#ff8a8a' }}>{v.pcName}</span>
                          {' '}@ beat {v.loopBeat}
                        </span>
                      ))}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>

      <h3 style={subHeader}>Bass-only summary (strict)</h3>
      <BassDeepDive report={report} />
    </div>
  )
}

function BassDeepDive({ report }) {
  const bass = report.tally.map(row => ({
    symbol: row.symbol,
    bass:   row.perAccType.BASS,
  })).filter(r => r.bass)

  const totalBass = bass.reduce((a, r) => a + r.bass.played, 0)
  if (totalBass === 0) {
    return <div style={{ color: '#888', fontSize: 13 }}>No BASS notes recorded.</div>
  }
  const totalBassOk = bass.reduce((a, r) => a + r.bass.ok, 0)
  const bassAccuracy = 100 * totalBassOk / totalBass

  const stuck = (() => {
    const allBass = []
    for (const row of report.tally) {
      const v = row.perAccType.BASS
      if (!v) continue
    }
    return null
  })()

  return (
    <div style={summaryBoxStyle}>
      Bass accuracy: <strong style={{
        color: bassAccuracy === 100 ? '#7eda7e' : '#ff8a8a',
      }}>{bassAccuracy.toFixed(1)}%</strong>
      {' '}({totalBassOk}/{totalBass} notes)
      {' · '}
      {bassAccuracy < 50 && (
        <span style={{ color: '#ff8a8a' }}>
          ⚠ Likely "stuck bass" bug — check fitBassPhrase or chord progression beats.
        </span>
      )}
      {bassAccuracy >= 50 && bassAccuracy < 95 && (
        <span style={{ color: '#ffd17f' }}>
          Some bass notes leak across chord boundaries.
        </span>
      )}
    </div>
  )
}

const controlsRowStyle = { display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap', margin: '14px 0' }
const labelStyle       = { display: 'flex', flexDirection: 'column', gap: 4, color: '#a0a0c0', fontSize: 12 }
const selectStyle      = { background: '#16162a', color: '#e0e0f0', border: '1px solid #2a2a3e', padding: '6px 8px', borderRadius: 4, fontSize: 13 }
const numberStyle      = { ...selectStyle, width: 80 }
const runBtnStyle      = { padding: '8px 18px', background: '#3a7eff', color: 'white', border: 'none', borderRadius: 4, fontSize: 13, cursor: 'pointer' }
const stopBtnStyle     = { ...runBtnStyle, background: '#cc3a3a' }
const summaryBoxStyle  = { padding: '10px 14px', background: '#16162a', border: '1px solid #2a2a3e', borderRadius: 6, marginBottom: 14, fontSize: 13, color: '#c0c0e0' }
const subHeader        = { color: '#a0a0c0', fontSize: 14, marginTop: 22, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }
const tableStyle       = { width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#e0e0f0', background: '#16162a', borderRadius: 6, overflow: 'hidden' }
const thStyle          = { padding: '6px 12px', textAlign: 'left', color: '#a0a0c0', borderBottom: '1px solid #2a2a3e' }
const tdStyle          = { padding: '6px 12px', borderBottom: '1px solid #2a2a3e', fontVariantNumeric: 'tabular-nums' }
