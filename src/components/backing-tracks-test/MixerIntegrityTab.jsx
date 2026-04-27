/**
 * MixerIntegrityTab.jsx — Test 3: Mixer Integrity.
 *
 * Two diagnostics:
 *
 *  (a) STYLE SCAN — for each style, what AccTypes (= what real instruments)
 *      are actually in the parsed .sty? Compared side-by-side with the 4
 *      hardcoded sliders in the current Mixer.jsx (piano/guitar/bass/drums).
 *      Highlights which styles play instruments the mixer doesn't expose
 *      (e.g. PAD/strings, PHRASE1 melody).
 *
 *  (b) PER-CHANNEL ISOLATION — plays a held note on each MIDI channel and
 *      measures RMS at two gain levels. With the current implementation
 *      (only SFP.setGain master gain) every channel scales by the same
 *      factor → uniform column. With Option B (CC#7 per channel) only the
 *      channel whose volume changed should scale → diagonal pattern.
 *
 *      Currently we have only one "knob" — master gain — so the matrix is
 *      one row, but we display it that way to make the gap explicit.
 */

import React, { useState, useCallback, useEffect } from 'react'
import { parseSty } from '../../lib/style-engine/StyleParser.js'
import * as SFP from '../../lib/soundfont/SoundFontPlayer.js'
import { CHANNEL_LABELS } from './shared/InstrumentedEngine.js'

const STYLE_OPTIONS = [
  { id: 'jazz_swing',    label: '🎷 Jazz Swing',    sty: '/styles-appdata/Yamaha/Jazzvocal.s264.sty' },
  { id: 'jazz_cool',     label: '🎷 Jazz Cool',     sty: '/styles/Swing&Jazz/LACoolSwing.STY' },
  { id: 'jazz_waltz',    label: '🎷 Jazz Waltz',    sty: '/styles-appdata/Yamaha/JazzWaltzFast.S499.sty' },
  { id: 'blues_shuffle', label: '🎸 Blues Shuffle', sty: "/styles-appdata/Yamaha/MrMac'sBlues.T148.STY" },
  { id: 'blues_kool',    label: '🎸 Blues Kool',    sty: '/styles/R&B/KoolShuffle.STY' },
  { id: 'blues_soul',    label: '🎸 Blues Soul',    sty: '/styles/R&B/SoulShuffle.STY' },
  { id: 'rock_standard', label: '🤘 Rock Standard', sty: '/styles-appdata/Yamaha/StandardRock.STY' },
  { id: 'rock_pop',      label: '🤘 Pop Rock',      sty: '/styles/Pop&Rock/PopRock.STY' },
  { id: 'rock_power',    label: '🤘 Power Rock',    sty: '/styles/Pop&Rock/PowerRock.STY' },
  { id: 'country_train', label: '🤠 Country Train', sty: '/styles/Country/CountryTrain Bt.sty' },
  { id: 'country_finger',label: '🤠 Country Finger',sty: '/styles/Country/FingerPickin.sty' },
  { id: 'country_modern',label: '🤠 Country Modern',sty: '/styles-appdata/Yamaha/ModPickin!.T151.STY' },
]

const HARDCODED_MIXER_LABELS = ['Piano', 'Guitar', 'Bass', 'Drums']

const ACCTYPE_TO_CHANNEL = {
  RHYTHM: 9, SUBRHYTHM: 9,
  BASS: 1, CHORD1: 0, CHORD2: 2, PAD: 3, PHRASE1: 4, PHRASE2: 4,
}

const TEST_CHANNELS = [
  { ch: 0, pitch: 60, label: 'Piano (ch 0, C4)' },
  { ch: 1, pitch: 36, label: 'Bass (ch 1, C2)'  },
  { ch: 2, pitch: 60, label: 'Guitar (ch 2, C4)' },
  { ch: 3, pitch: 60, label: 'Pad (ch 3, C4)' },
  { ch: 9, pitch: 36, label: 'Drums (ch 9, kick)' },
]

const GAIN_LOW  = 0.4
const GAIN_HIGH = 1.6

export default function MixerIntegrityTab() {
  const [scanResults, setScanResults] = useState([])
  const [scanning, setScanning] = useState(false)

  const [isoRunning, setIsoRunning] = useState(false)
  const [isoPhase, setIsoPhase]     = useState('idle')
  const [isoResult, setIsoResult]   = useState(null)

  useEffect(() => {
    runScan()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const runScan = useCallback(async () => {
    setScanning(true)
    const results = []
    for (const opt of STYLE_OPTIONS) {
      try {
        const buf   = await fetch(opt.sty).then(r => r.arrayBuffer())
        const style = parseSty(buf)
        const main  = style.parts.Main_A || Object.values(style.parts).find(p => p.sizeInBeats > 0)
        if (!main) {
          results.push({ ...opt, error: 'no Main_A' })
          continue
        }
        const accTypes = new Set()
        for (const channelData of Object.values(main.channels || {})) {
          if (channelData?.ctab?.accType) accTypes.add(channelData.ctab.accType)
        }
        results.push({
          ...opt,
          accTypes: [...accTypes],
        })
      } catch (err) {
        results.push({ ...opt, error: err.message })
      }
    }
    setScanResults(results)
    setScanning(false)
  }, [])

  const runIsolation = useCallback(async () => {
    setIsoRunning(true)
    setIsoResult(null)
    setIsoPhase('loading SoundFont')

    try {
      await SFP.init(() => {})
      await SFP.resumeAudio()
      const ctx      = SFP.getAudioContext()
      const analyser = SFP.getAnalyser()
      if (!ctx || !analyser) throw new Error('AudioContext or Analyser unavailable')

      setIsoPhase('measuring per-channel RMS')

      // Save current gain so we restore it after
      const restoreGain = 1.0

      const rows = []
      const knobs = [
        { key: 'master', target: null, label: 'Master gain', set: (v) => SFP.setGain(v) },
        { key: 'ch0',    target: 0,    label: 'Per-channel CC#7 — ch 0 (Piano)',  set: (v) => SFP.setChannelVolume(0, v) },
        { key: 'ch1',    target: 1,    label: 'Per-channel CC#7 — ch 1 (Bass)',   set: (v) => SFP.setChannelVolume(1, v) },
        { key: 'ch2',    target: 2,    label: 'Per-channel CC#7 — ch 2 (Guitar)', set: (v) => SFP.setChannelVolume(2, v) },
        { key: 'ch9',    target: 9,    label: 'Per-channel CC#7 — ch 9 (Drums)',  set: (v) => SFP.setChannelVolume(9, v) },
      ]

      // Reset all per-channel volumes to full before starting,
      // so each knob measures the delta from a clean baseline.
      for (let ch = 0; ch < 16; ch++) SFP.setChannelVolume(ch, 1.0)

      for (const knob of knobs) {
        const row = { knob: knob.label, key: knob.key, target: knob.target, cells: {} }

        for (const tc of TEST_CHANNELS) {
          // LOW gain measurement
          knob.set(GAIN_LOW)
          await sleep(150)
          SFP.allNotesOff()
          await sleep(50)
          SFP.noteOn(tc.ch, tc.pitch, 110)
          await sleep(80) // attack
          const rmsLow = await measureRMS(analyser, 600)
          SFP.noteOff(tc.ch, tc.pitch)
          await sleep(150)

          // HIGH gain measurement
          knob.set(GAIN_HIGH)
          await sleep(150)
          SFP.allNotesOff()
          await sleep(50)
          SFP.noteOn(tc.ch, tc.pitch, 110)
          await sleep(80)
          const rmsHigh = await measureRMS(analyser, 600)
          SFP.noteOff(tc.ch, tc.pitch)
          await sleep(150)

          const ratio = rmsLow > 1e-6 ? rmsHigh / rmsLow : 0
          row.cells[tc.ch] = { rmsLow, rmsHigh, ratio }
        }

        rows.push(row)
        // Reset this knob and ALL per-channel volumes so the next knob measures
        // independently
        if (knob.target !== null) SFP.setChannelVolume(knob.target, 1.0)
        SFP.setGain(restoreGain)
      }

      SFP.allNotesOff()
      SFP.setGain(restoreGain)
      for (let ch = 0; ch < 16; ch++) SFP.setChannelVolume(ch, 1.0)

      setIsoResult({
        rows,
        gainRatio: GAIN_HIGH / GAIN_LOW,
      })
      setIsoPhase('done')
    } catch (err) {
      console.error('[MixerIntegrityTab isolation] error', err)
      setIsoPhase('error: ' + (err?.message || String(err)))
    } finally {
      setIsoRunning(false)
    }
  }, [])

  return (
    <div style={{ color: '#e0e0f0' }}>
      <h2 style={{ marginTop: 0 }}>Test 3 — Mixer Integrity</h2>
      <p style={{ color: '#a0a0c0', maxWidth: 740 }}>
        בודק (א) האם המיקסר חושף את הכלים האמיתיים שמנוגנים בכל סגנון,
        ו-(ב) האם הזזת סליידר משנה רק את הערוץ שלו (per-channel isolation)
        או את כל המיקס יחד (master gain).
      </p>

      <h3 style={subHeader}>(a) Per-style instrument scan</h3>
      <button onClick={runScan} disabled={scanning} style={runBtnStyle}>
        {scanning ? 'Scanning…' : '↻ Re-scan all styles'}
      </button>

      {scanResults.length > 0 && (
        <table style={{ ...tableStyle, marginTop: 12 }}>
          <thead>
            <tr style={{ background: '#1e1e36' }}>
              <th style={thStyle}>Style</th>
              <th style={thStyle}>Active AccTypes (Main_A)</th>
              <th style={thStyle}>Mapped instruments</th>
              <th style={thStyle}>Mixer shows</th>
              <th style={thStyle}>Gap?</th>
            </tr>
          </thead>
          <tbody>
            {scanResults.map(r => {
              if (r.error) {
                return (
                  <tr key={r.id}>
                    <td style={tdStyle}>{r.label}</td>
                    <td colSpan={4} style={{ ...tdStyle, color: '#ff8a8a' }}>
                      Error: {r.error}
                    </td>
                  </tr>
                )
              }
              const channels = [...new Set(r.accTypes.map(at => ACCTYPE_TO_CHANNEL[at]).filter(c => c !== undefined))]
              const labels   = channels.map(c => CHANNEL_LABELS[c]).filter(Boolean)
              const missing  = labels.filter(l => !HARDCODED_MIXER_LABELS.includes(l))
              return (
                <tr key={r.id}>
                  <td style={tdStyle}>{r.label}</td>
                  <td style={{ ...tdStyle, color: '#c0c0e0', fontSize: 12 }}>
                    {r.accTypes.join(', ')}
                  </td>
                  <td style={{ ...tdStyle, color: '#c0c0e0', fontSize: 12 }}>
                    {labels.join(', ')}
                  </td>
                  <td style={{ ...tdStyle, color: '#888', fontSize: 12 }}>
                    {HARDCODED_MIXER_LABELS.join(', ')}
                  </td>
                  <td style={tdStyle}>
                    {missing.length > 0
                      ? <span style={{ color: '#ff8a8a' }}>✗ Missing: {missing.join(', ')}</span>
                      : <span style={{ color: '#7eda7e' }}>✓</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      <h3 style={subHeader}>(b) Per-channel isolation</h3>
      <div style={controlsRowStyle}>
        <button onClick={runIsolation} disabled={isoRunning} style={runBtnStyle}>
          {isoRunning ? 'Measuring…' : '▶ Measure isolation matrix'}
        </button>
        <span style={{ color: '#a0a0c0', fontSize: 13 }}>{isoPhase}</span>
        <span style={{ color: '#a0a0c0', fontSize: 12 }}>
          gain low={GAIN_LOW}, high={GAIN_HIGH} → expected ratio ≈ {(GAIN_HIGH / GAIN_LOW).toFixed(2)}
        </span>
      </div>

      {isoResult && <IsolationView result={isoResult} />}
    </div>
  )
}

function IsolationView({ result }) {
  const expected = result.gainRatio
  return (
    <div style={{ marginTop: 14 }}>
      <div style={summaryBoxStyle}>
        Each cell: RMS<sub>high</sub> / RMS<sub>low</sub> when this knob moves.
        Master-gain row should be uniform ≈{expected.toFixed(2)}×.
        Per-channel rows should scale ONLY their target column.
      </div>
      <table style={tableStyle}>
        <thead>
          <tr style={{ background: '#1e1e36' }}>
            <th style={thStyle}>Knob \ Channel</th>
            {TEST_CHANNELS.map(tc => (
              <th key={tc.ch} style={{ ...thStyle, textAlign: 'right' }}>{tc.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map(row => {
            const ratios = TEST_CHANNELS.map(tc => row.cells[tc.ch]?.ratio || 0)
            const allUniform = ratios.every(r => Math.abs(r - expected) < 0.4)
            const isPerChannel = row.target !== null && row.target !== undefined
            return (
              <React.Fragment key={row.key}>
                <tr>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{row.knob}</td>
                  {TEST_CHANNELS.map(tc => {
                    const cell = row.cells[tc.ch]
                    if (!cell) return <td key={tc.ch} style={tdStyle}>—</td>
                    const r = cell.ratio
                    const isTarget = isPerChannel && tc.ch === row.target
                    const expectsScale = !isPerChannel || isTarget
                    const scaledCorrectly = expectsScale
                      ? r > 1.5                       // any meaningful gain change
                      : Math.abs(r - 1.0) < 0.3       // unchanged within 30%
                    return (
                      <td key={tc.ch} style={{
                        ...tdStyle,
                        textAlign: 'right',
                        color: scaledCorrectly ? '#7eda7e' : '#ff8a8a',
                        background: isTarget ? '#1a2a1a' : 'transparent',
                        fontWeight: isTarget ? 600 : 400,
                      }}>
                        {r.toFixed(2)}×
                      </td>
                    )
                  })}
                </tr>
                <tr>
                  <td colSpan={1 + TEST_CHANNELS.length} style={{
                    ...tdStyle,
                    fontSize: 12,
                    color: rowVerdictColor(row, ratios),
                    background: '#11111e',
                    paddingLeft: 24,
                  }}>
                    {rowVerdictText(row, ratios)}
                  </td>
                </tr>
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
      <div style={{ marginTop: 10, color: '#a0a0c0', fontSize: 12 }}>
        Pass criteria: master row scales all columns; each per-channel row scales
        ONLY its target column (highlighted) and leaves others ≈ 1.00×.
      </div>
    </div>
  )
}

// Pass criteria are based on RATIOS, not absolute values, because CC#7 is not
// linear (FluidSynth applies a curve) — so a true per-channel isolation can
// scale the target by anywhere from 2× to 8× depending on the SF2.
function rowVerdictText(row, ratios) {
  if (row.target === null || row.target === undefined) {
    const allMoved = ratios.every(r => r > 1.5)
    return allMoved
      ? `✓ Master gain — all channels scale together as expected.`
      : `⚠ Master gain didn't move all channels (some channel may already be clipping).`
  }
  const targetIdx = TEST_CHANNELS.findIndex(tc => tc.ch === row.target)
  const targetRatio = ratios[targetIdx]
  const otherRatios = ratios.filter((_, i) => i !== targetIdx)
  const otherMoved = otherRatios.some(r => Math.abs(r - 1.0) > 0.3)
  const targetMoved = targetRatio > 1.5
  if (targetMoved && !otherMoved)
    return `✓ Per-channel isolation works for ch${row.target} — only target scaled (${targetRatio.toFixed(2)}×).`
  if (!targetMoved && !otherMoved)
    return `✗ Knob did nothing — CC#7 did not affect ch${row.target}.`
  if (targetMoved && otherMoved)
    return `⚠ Target scaled but other channels also moved — leaky isolation.`
  return `✗ Other channels moved but target didn't — wrong wiring.`
}

function rowVerdictColor(row, ratios) {
  if (row.target === null || row.target === undefined) {
    return ratios.every(r => r > 1.5) ? '#7eda7e' : '#ffd17f'
  }
  const targetIdx = TEST_CHANNELS.findIndex(tc => tc.ch === row.target)
  const targetRatio = ratios[targetIdx]
  const otherRatios = ratios.filter((_, i) => i !== targetIdx)
  const otherMoved = otherRatios.some(r => Math.abs(r - 1.0) > 0.3)
  const targetMoved = targetRatio > 1.5
  if (targetMoved && !otherMoved) return '#7eda7e'
  return '#ff8a8a'
}

async function measureRMS(analyser, durationMs) {
  return new Promise(resolve => {
    const samples = []
    const start = performance.now()
    const buf = new Float32Array(analyser.fftSize)

    const tick = () => {
      analyser.getFloatTimeDomainData(buf)
      let sum = 0
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i]
      samples.push(Math.sqrt(sum / buf.length))

      if (performance.now() - start >= durationMs) {
        const mean = samples.reduce((a, b) => a + b, 0) / samples.length
        resolve(mean)
      } else {
        setTimeout(tick, 25)
      }
    }
    tick()
  })
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

const controlsRowStyle = { display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', margin: '14px 0' }
const selectStyle      = { background: '#16162a', color: '#e0e0f0', border: '1px solid #2a2a3e', padding: '6px 8px', borderRadius: 4, fontSize: 13 }
const runBtnStyle      = { padding: '8px 18px', background: '#3a7eff', color: 'white', border: 'none', borderRadius: 4, fontSize: 13, cursor: 'pointer' }
const summaryBoxStyle  = { padding: '10px 14px', background: '#16162a', border: '1px solid #2a2a3e', borderRadius: 6, marginBottom: 14, fontSize: 13, color: '#c0c0e0' }
const subHeader        = { color: '#a0a0c0', fontSize: 14, marginTop: 22, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }
const tableStyle       = { width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#e0e0f0', background: '#16162a', borderRadius: 6, overflow: 'hidden' }
const thStyle          = { padding: '6px 12px', textAlign: 'left', color: '#a0a0c0', borderBottom: '1px solid #2a2a3e' }
const tdStyle          = { padding: '6px 12px', borderBottom: '1px solid #2a2a3e', fontVariantNumeric: 'tabular-nums' }
