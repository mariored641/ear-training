/**
 * RhythmStabilityTab.jsx — Test 1: Rhythm Stability with external metronome.
 *
 * Runs an AudioMetronome and the InstrumentedEngine in parallel on the same
 * AudioContext. For every noteOn the engine fires, computes the deviation
 * between the actual audioContext.currentTime and the closest metronome beat.
 *
 * Reports mean / std / max deviation, broken down by:
 *   - all noteOns
 *   - seam beats (partBeat=0, the loop boundary — historical jitter source)
 *   - per AccType (BASS / CHORD1 / CHORD2 / RHYTHM / PAD)
 */

import React, { useState, useRef, useCallback } from 'react'
import { parseSty } from '../../lib/style-engine/StyleParser.js'
import * as SFP    from '../../lib/soundfont/SoundFontPlayer.js'
import { InstrumentedEngine } from './shared/InstrumentedEngine.js'
import { AudioMetronome }     from './shared/AudioMetronome.js'
import { StatsTable, computeStats } from './shared/StatsTable.jsx'

const STYLE_OPTIONS = [
  { id: 'jazz_swing',    label: '🎷 Jazz Swing',  sty: '/styles-appdata/Yamaha/Jazzvocal.s264.sty',     bpm: 120, prog: [{symbol:'Dm7',beats:4},{symbol:'G7',beats:4},{symbol:'Cmaj7',beats:4},{symbol:'Cmaj7',beats:4}] },
  { id: 'jazz_cool',     label: '🎷 Jazz Cool',   sty: '/styles/Swing&Jazz/LACoolSwing.STY',            bpm: 110, prog: [{symbol:'Dm7',beats:4},{symbol:'G7',beats:4},{symbol:'Cmaj7',beats:4},{symbol:'Cmaj7',beats:4}] },
  { id: 'rock_pop',      label: '🤘 Pop Rock',    sty: '/styles/Pop&Rock/PopRock.STY',                  bpm: 125, prog: [{symbol:'C',beats:4},{symbol:'Am',beats:4},{symbol:'F',beats:4},{symbol:'G',beats:4}] },
  { id: 'country_train', label: '🤠 Country',     sty: '/styles/Country/CountryTrain Bt.sty',           bpm: 120, prog: [{symbol:'G',beats:4},{symbol:'C',beats:4},{symbol:'D',beats:4},{symbol:'G',beats:4}] },
]

const TEST_BARS = 8

const PASS_THRESHOLDS = {
  all:    { std: 5,  absMax: 15 },
  seam:   { std: 8,  absMax: 25 },
  others: { std: 5,  absMax: 15 },
}

export default function RhythmStabilityTab() {
  const [styleId, setStyleId] = useState('jazz_cool')
  const [bars, setBars]       = useState(TEST_BARS)
  const [bpm, setBpm]         = useState(110)
  const [silentMetro, setSilentMetro] = useState(false)
  const [running, setRunning] = useState(false)
  const [phase, setPhase]     = useState('idle')
  const [report, setReport]   = useState(null)

  const engineRef    = useRef(null)
  const metronomeRef = useRef(null)
  const noteEventsRef = useRef([])
  const beatEventsRef = useRef([])

  const styleConfig = STYLE_OPTIONS.find(s => s.id === styleId)

  const handleRun = useCallback(async () => {
    setRunning(true)
    setReport(null)
    setPhase('loading SoundFont')

    noteEventsRef.current = []
    beatEventsRef.current = []

    try {
      await SFP.init(() => {})
      await SFP.resumeAudio()

      setPhase('loading style')
      const buf  = await fetch(styleConfig.sty).then(r => r.arrayBuffer())
      const style = parseSty(buf)
      style.tempo = bpm

      setPhase('initializing engine')
      const engine = new InstrumentedEngine()
      await engine.init()
      engine.setStyle(style)
      engine.setChordProgression(styleConfig.prog)
      engine.setSkipIntro(true)

      engine.onSchedEntry = (entry) => {
        if (entry.type === 'noteOn') noteEventsRef.current.push(entry)
      }
      engine.onBeatEntry = (entry) => {
        beatEventsRef.current.push(entry)
      }

      engineRef.current = engine

      const audioCtx = SFP.getAudioContext()
      const startAt = audioCtx.currentTime + 0.5

      const metronome = new AudioMetronome(audioCtx, bpm, { silent: silentMetro, gain: 0.06 })
      metronome.start(startAt)
      metronomeRef.current = metronome

      setPhase('playing — measuring')
      await engine.play()

      const beatDuration = 60 / bpm
      const totalBeats = bars * 4
      const recordSeconds = totalBeats * beatDuration + 1

      await new Promise(r => setTimeout(r, recordSeconds * 1000))

      engine.stop(true)
      metronome.stop()

      setPhase('analyzing')
      const generated = analyze(noteEventsRef.current, beatEventsRef.current, metronome, bpm, totalBeats)
      setReport(generated)
      setPhase('done')
    } catch (err) {
      console.error('[RhythmStabilityTab] error', err)
      setPhase('error: ' + (err?.message || String(err)))
    } finally {
      setRunning(false)
      try { engineRef.current?.stop(true) } catch {}
      try { metronomeRef.current?.stop() } catch {}
    }
  }, [styleConfig, bars, bpm, silentMetro])

  const handleStop = useCallback(() => {
    try { engineRef.current?.stop(true) } catch {}
    try { metronomeRef.current?.stop() } catch {}
    setRunning(false)
    setPhase('stopped')
  }, [])

  return (
    <div style={{ color: '#e0e0f0' }}>
      <h2 style={{ marginTop: 0 }}>Test 1 — Rhythm Stability</h2>
      <p style={{ color: '#a0a0c0', maxWidth: 720 }}>
        מטרונום מדויק רץ במקביל לבאקינג טראק על אותו AudioContext.
        כל noteOn של המנוע נמדד מול ביט המטרונום הקרוב ביותר. הסטיה (deviationFromMetro)
        חושפת jitter, drift, וקפיצות בקצב.
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
          BPM:
          <input type="number" min={40} max={240} value={bpm}
                 onChange={e => setBpm(Number(e.target.value))}
                 disabled={running} style={numberStyle} />
        </label>
        <label style={labelStyle}>
          Bars:
          <input type="number" min={2} max={32} value={bars}
                 onChange={e => setBars(Number(e.target.value))}
                 disabled={running} style={numberStyle} />
        </label>
        <label style={{ ...labelStyle, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={silentMetro}
                 onChange={e => setSilentMetro(e.target.checked)}
                 disabled={running} />
          Silent metronome
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

function analyze(noteEvents, beatEvents, metronome, bpm, totalBeats) {
  const beatDuration = 60 / bpm

  const enriched = noteEvents
    .filter(e => e.actualAudioTime !== undefined)
    .map(e => {
      const closestBeatIdx = Math.round(
        (e.actualAudioTime - metronome.getExpectedBeatTime(0)) / beatDuration
      )
      const expected = metronome.getExpectedBeatTime(closestBeatIdx)
      const deviationFromMetroMs = (e.actualAudioTime - expected) * 1000
      return { ...e, closestBeatIdx, deviationFromMetroMs }
    })
    .filter(e => e.closestBeatIdx >= 0 && e.closestBeatIdx <= totalBeats)

  const allValues   = enriched.map(e => e.deviationFromMetroMs)
  const seamValues  = enriched.filter(e => e.isSeam).map(e => e.deviationFromMetroMs)
  const innerValues = enriched.filter(e => !e.isSeam).map(e => e.deviationFromMetroMs)

  const accTypes = [...new Set(enriched.map(e => e.accType))].sort()
  const perInstrument = accTypes.map(at => {
    const vals = enriched.filter(e => e.accType === at).map(e => e.deviationFromMetroMs)
    return { label: at, values: vals }
  })

  const beatIntervals = []
  for (let i = 1; i < beatEvents.length; i++) {
    beatIntervals.push(beatEvents[i].audioMs - beatEvents[i - 1].audioMs)
  }

  const expectedIntervalMs = beatDuration * 1000
  const intervalDeviations = beatIntervals.map(v => v - expectedIntervalMs)

  const worst = [...enriched]
    .sort((a, b) => Math.abs(b.deviationFromMetroMs) - Math.abs(a.deviationFromMetroMs))
    .slice(0, 5)

  return {
    totalNotes: enriched.length,
    expectedIntervalMs,
    allRows: [
      { label: 'All noteOns',    values: allValues,   passThreshold: PASS_THRESHOLDS.all },
      { label: 'Seam (partBeat=0)', values: seamValues,  passThreshold: PASS_THRESHOLDS.seam },
      { label: 'Interior (partBeat>0)', values: innerValues, passThreshold: PASS_THRESHOLDS.others },
    ],
    perInstrument,
    intervalRows: [
      { label: 'Beat intervals (UI)', values: intervalDeviations, passThreshold: { std: 5, absMax: 25 } },
    ],
    worst,
    enriched,
  }
}

function ReportView({ report }) {
  return (
    <div style={{ marginTop: 18 }}>
      <div style={summaryBoxStyle}>
        <strong>{report.totalNotes}</strong> noteOns measured ·
        target beat interval = <strong>{report.expectedIntervalMs.toFixed(2)}ms</strong>
      </div>

      <h3 style={subHeader}>NoteOn deviation from metronome</h3>
      <StatsTable rows={report.allRows} />

      <h3 style={subHeader}>Per-instrument deviation</h3>
      <StatsTable rows={report.perInstrument.map(r => ({
        ...r,
        passThreshold: PASS_THRESHOLDS.others,
      }))} />

      <h3 style={subHeader}>UI beat-interval drift</h3>
      <StatsTable rows={report.intervalRows} />

      <h3 style={subHeader}>Top 5 worst deviations</h3>
      <table style={tableStyle}>
        <thead>
          <tr style={{ background: '#1e1e36' }}>
            <th style={thStyle}>partBeat</th>
            <th style={thStyle}>seam?</th>
            <th style={thStyle}>accType</th>
            <th style={thStyle}>position</th>
            <th style={thStyle}>deviation (ms)</th>
            <th style={thStyle}>scheduled delay</th>
          </tr>
        </thead>
        <tbody>
          {report.worst.map((e, i) => (
            <tr key={i}>
              <td style={tdStyle}>{e.partBeat}</td>
              <td style={tdStyle}>{e.isSeam ? '✓' : ''}</td>
              <td style={tdStyle}>{e.accType}</td>
              <td style={tdStyle}>{e.position}</td>
              <td style={{ ...tdStyle, color: Math.abs(e.deviationFromMetroMs) > 15 ? '#ff8a8a' : '#e0e0f0' }}>
                {e.deviationFromMetroMs.toFixed(2)}
              </td>
              <td style={tdStyle}>{e.scheduledDelayMs}ms</td>
            </tr>
          ))}
        </tbody>
      </table>

      <DeviationScatter enriched={report.enriched} />
    </div>
  )
}

function DeviationScatter({ enriched }) {
  if (!enriched.length) return null
  const W = 720
  const H = 200
  const PAD = 30

  const xs = enriched.map(e => e.closestBeatIdx)
  const ys = enriched.map(e => e.deviationFromMetroMs)
  const xMax = Math.max(...xs, 1)
  const yMax = Math.max(20, Math.max(...ys.map(Math.abs))) * 1.1

  const xPos = x => PAD + ((x / xMax) * (W - 2 * PAD))
  const yPos = y => H / 2 - (y / yMax) * (H / 2 - PAD)

  const colors = {
    BASS:    '#5fb6f5',
    RHYTHM:  '#ffaa55',
    SUBRHYTHM: '#ffaa55',
    CHORD1:  '#a0e07f',
    CHORD2:  '#c08fff',
    PAD:     '#ffd17f',
    PHRASE1: '#ff7fb0',
    PHRASE2: '#ff7fb0',
  }

  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={subHeader}>Deviation scatter (ms vs beat #)</h3>
      <svg width={W} height={H} style={{ background: '#11111e', borderRadius: 6 }}>
        <line x1={PAD} x2={W - PAD} y1={H / 2} y2={H / 2} stroke="#3a3a55" strokeDasharray="4 4" />
        <line x1={PAD} x2={W - PAD} y1={yPos(15)} y2={yPos(15)} stroke="#7a4a4a" strokeDasharray="2 4" />
        <line x1={PAD} x2={W - PAD} y1={yPos(-15)} y2={yPos(-15)} stroke="#7a4a4a" strokeDasharray="2 4" />
        <text x={4} y={H / 2 + 4} fill="#888" fontSize={10}>0</text>
        <text x={4} y={yPos(15) + 4} fill="#7a4a4a" fontSize={10}>+15</text>
        <text x={4} y={yPos(-15) + 4} fill="#7a4a4a" fontSize={10}>-15</text>

        {enriched.map((e, i) => (
          <circle
            key={i}
            cx={xPos(e.closestBeatIdx)}
            cy={yPos(e.deviationFromMetroMs)}
            r={e.isSeam ? 3.5 : 2}
            fill={colors[e.accType] || '#888'}
            opacity={e.isSeam ? 0.95 : 0.6}
          />
        ))}
      </svg>
      <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#a0a0c0', marginTop: 6 }}>
        {Object.entries(colors).filter(([k]) => enriched.some(e => e.accType === k)).map(([k, c]) => (
          <span key={k}><span style={{ color: c }}>●</span> {k}</span>
        ))}
        <span>● seam beats are larger</span>
      </div>
    </div>
  )
}

const controlsRowStyle = { display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap', margin: '14px 0' }
const labelStyle       = { display: 'flex', flexDirection: 'column', gap: 4, color: '#a0a0c0', fontSize: 12 }
const selectStyle      = { background: '#16162a', color: '#e0e0f0', border: '1px solid #2a2a3e', padding: '6px 8px', borderRadius: 4, fontSize: 13 }
const numberStyle      = { ...selectStyle, width: 70 }
const runBtnStyle      = { padding: '8px 18px', background: '#3a7eff', color: 'white', border: 'none', borderRadius: 4, fontSize: 13, cursor: 'pointer' }
const stopBtnStyle     = { ...runBtnStyle, background: '#cc3a3a' }
const summaryBoxStyle  = { padding: '10px 14px', background: '#16162a', border: '1px solid #2a2a3e', borderRadius: 6, marginBottom: 14, fontSize: 13, color: '#c0c0e0' }
const subHeader        = { color: '#a0a0c0', fontSize: 14, marginTop: 22, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }
const tableStyle       = { width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#e0e0f0', background: '#16162a', borderRadius: 6, overflow: 'hidden' }
const thStyle          = { padding: '6px 12px', textAlign: 'left', color: '#a0a0c0', borderBottom: '1px solid #2a2a3e' }
const tdStyle          = { padding: '6px 12px', borderBottom: '1px solid #2a2a3e', fontVariantNumeric: 'tabular-nums' }
