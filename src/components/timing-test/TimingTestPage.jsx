/**
 * TimingTestPage.jsx — Backing Track timing analysis tool (v2)
 *
 * Route: /timing-test
 *
 * Measures three things:
 *
 *  1. BEAT INTERVALS — actual wall-clock ms between consecutive onBeat callbacks.
 *     Directly reveals whether the rhythm is uneven (the "7/8" feel).
 *     Expected: all intervals ≈ beatDurationMs (e.g. 500ms @ 120 BPM).
 *
 *  2. NOTE COUNT PER BEAT — how many notes fire at each partBeat slot.
 *     A beat with 0 notes = a silent beat → sounds like a missing beat.
 *
 *  3. SCHED DEVIATION — audioContext.currentTime when setTimeout fires vs
 *     the intended audioTime. Measures JS-side scheduling accuracy.
 */

import React, { useState, useRef, useCallback } from 'react'
import { BackingTrackEngine } from '../../lib/style-engine/BackingTrackEngine'
import { parseSty }           from '../../lib/style-engine/StyleParser'
import * as SFP               from '../../lib/soundfont/SoundFontPlayer'

// ─── Mirror of BackingTrackEngine channel map ────────────────────────────────
const ACCTYPE_TO_CHANNEL = {
  RHYTHM: 9, SUBRHYTHM: 9,
  BASS: 1, CHORD1: 0, CHORD2: 2, PAD: 3, PHRASE1: 4, PHRASE2: 4,
}
const DRUM_CHANNEL = 9

// ─── All styles from the app catalog ─────────────────────────────────────────
const STYLE_OPTIONS = [
  // Jazz
  { id: 'jazz_swing',      label: '🎷 Jazz Swing',        sty: '/styles-appdata/Yamaha/Jazzvocal.s264.sty',       bpm: 120, prog: [{ symbol:'Dm7',beats:4},{symbol:'G7',beats:4},{symbol:'Cmaj7',beats:4},{symbol:'Cmaj7',beats:4}] },
  { id: 'jazz_cool',       label: '🎷 Jazz Cool',          sty: '/styles/Swing&Jazz/LACoolSwing.STY',              bpm: 110, prog: [{ symbol:'Dm7',beats:4},{symbol:'G7',beats:4},{symbol:'Cmaj7',beats:4},{symbol:'Cmaj7',beats:4}] },
  { id: 'jazz_waltz',      label: '🎷 Jazz Waltz',         sty: '/styles-appdata/Yamaha/JazzWaltzFast.S499.sty',   bpm: 180, prog: [{ symbol:'Cmaj7',beats:3},{symbol:'Am7',beats:3},{symbol:'Dm7',beats:3},{symbol:'G7',beats:3}] },
  // Blues
  { id: 'blues_shuffle',   label: '🎸 Blues Shuffle',      sty: "/styles-appdata/Yamaha/MrMac'sBlues.T148.STY",    bpm: 100, prog: [{ symbol:'C7',beats:4},{symbol:'F7',beats:4},{symbol:'G7',beats:4},{symbol:'C7',beats:4}] },
  { id: 'blues_kool',      label: '🎸 Blues Kool',         sty: '/styles/R&B/KoolShuffle.STY',                     bpm: 110, prog: [{ symbol:'C7',beats:4},{symbol:'F7',beats:4},{symbol:'G7',beats:4},{symbol:'C7',beats:4}] },
  { id: 'blues_soul',      label: '🎸 Blues Soul',         sty: '/styles/R&B/SoulShuffle.STY',                     bpm: 95,  prog: [{ symbol:'C7',beats:4},{symbol:'F7',beats:4},{symbol:'G7',beats:4},{symbol:'C7',beats:4}] },
  // Rock
  { id: 'rock_standard',   label: '🤘 Rock Standard',      sty: '/styles-appdata/Yamaha/StandardRock.STY',         bpm: 130, prog: [{ symbol:'C',beats:4},{symbol:'F',beats:4},{symbol:'G',beats:4},{symbol:'C',beats:4}] },
  { id: 'rock_pop',        label: '🤘 Pop Rock',           sty: '/styles/Pop&Rock/PopRock.STY',                    bpm: 125, prog: [{ symbol:'C',beats:4},{symbol:'Am',beats:4},{symbol:'F',beats:4},{symbol:'G',beats:4}] },
  { id: 'rock_power',      label: '🤘 Power Rock',         sty: '/styles/Pop&Rock/PowerRock.STY',                  bpm: 140, prog: [{ symbol:'C',beats:4},{symbol:'Bb',beats:4},{symbol:'F',beats:4},{symbol:'G',beats:4}] },
  // Country
  { id: 'country_train',   label: '🤠 Country Train',      sty: '/styles/Country/CountryTrain Bt.sty',             bpm: 120, prog: [{ symbol:'G',beats:4},{symbol:'C',beats:4},{symbol:'D',beats:4},{symbol:'G',beats:4}] },
  { id: 'country_finger',  label: '🤠 Country Fingerpick', sty: '/styles/Country/FingerPickin.sty',                bpm: 100, prog: [{ symbol:'G',beats:4},{symbol:'C',beats:4},{symbol:'D',beats:4},{symbol:'G',beats:4}] },
  { id: 'country_modern',  label: '🤠 Country Modern',     sty: '/styles-appdata/Yamaha/ModPickin!.T151.STY',      bpm: 115, prog: [{ symbol:'G',beats:4},{symbol:'Em',beats:4},{symbol:'C',beats:4},{symbol:'D',beats:4}] },
]

const TEST_BARS = 8

// ─── Instrumented engine ─────────────────────────────────────────────────────
class TimingTestEngine extends BackingTrackEngine {
  constructor(onSchedEntry, onBeatEntry) {
    super()
    this._onSchedEntry = onSchedEntry
    this._onBeatEntry  = onBeatEntry
  }

  // Intercept the UI-beat callback that fires approximately at the real beat time.
  // We override onBeat setter to wrap it.
  _onBeat(beat, bar) {
    // Record wall-clock time of this beat
    this._onBeatEntry?.({ beat, bar, wallMs: performance.now() })
    super._onBeat(beat, bar)
  }

  // Override _scheduleBeatNotes to instrument every noteOn.
  _scheduleBeatNotes(partBeat) {
    if (!this._pendingNotes) return
    const { phrases, windowAudioTime, beatDuration } = this._pendingNotes
    const now = SFP.getAudioContext().currentTime

    for (const [accType, notes] of Object.entries(phrases)) {
      const channel = ACCTYPE_TO_CHANNEL[accType]
      if (channel === undefined) continue

      const beatNotes = notes.filter(
        n => n.position >= partBeat && n.position < partBeat + 1
      )

      // Record note count for this beat slot (even if beatNotes is empty)
      this._onSchedEntry?.({
        type: 'beatSlot',
        partBeat,
        accType,
        noteCount: beatNotes.length,
        partSize: this._partSize,
        rawPartSize: this._style?.parts[this._partName]?.sizeInBeats ?? '?',
      })

      for (const note of beatNotes) {
        const noteOnAt  = windowAudioTime + note.position * beatDuration
        const noteOffAt = noteOnAt + note.duration * beatDuration
        const onDelay   = Math.max(0, (noteOnAt  - now) * 1000)
        const offDelay  = Math.max(0, (noteOffAt - now) * 1000)

        const onId = setTimeout(() => {
          const actual      = SFP.getAudioContext().currentTime
          const deviationMs = parseFloat(((actual - noteOnAt) * 1000).toFixed(2))
          this._onSchedEntry?.({
            type: 'noteOn',
            partBeat,
            position:         parseFloat(note.position.toFixed(3)),
            accType,
            channel,
            deviationMs,
            scheduledDelayMs: parseFloat(onDelay.toFixed(1)),
            isSeam:           partBeat === 0,
          })
          SFP.noteOn(channel, note.pitch, note.velocity)
        }, onDelay)
        this._noteTimers.push(onId)

        if (channel !== DRUM_CHANNEL) {
          const offId = setTimeout(() => SFP.noteOff(channel, note.pitch), offDelay)
          this._noteTimers.push(offId)
        }
      }
    }

    if (this._noteTimers.length > 2000) this._noteTimers = this._noteTimers.slice(-1000)
  }
}

// ─── Stat helpers ─────────────────────────────────────────────────────────────
function stats(values) {
  if (!values.length) return { mean: 0, max: 0, min: 0, std: 0, n: 0 }
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length
  return {
    mean: parseFloat(mean.toFixed(1)),
    max:  parseFloat(Math.max(...values).toFixed(1)),
    min:  parseFloat(Math.min(...values).toFixed(1)),
    std:  parseFloat(Math.sqrt(variance).toFixed(1)),
    n:    values.length,
  }
}

function devColor(ms, threshold = 20) {
  if (ms < 0)          return '#ff9944'
  if (ms < 8)          return '#44cc88'
  if (ms < threshold)  return '#ffdd44'
  return '#ff4444'
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function TimingTestPage() {
  const [status,      setStatus]      = useState('idle')
  const [report,      setReport]      = useState(null)
  const [barCount,    setBarCount]    = useState(0)
  const [selectedSty, setSelectedSty] = useState('jazz_swing')

  const engineRef    = useRef(null)
  const schedLog     = useRef([])
  const beatLog      = useRef([])
  const barCountRef  = useRef(0)

  // ── Callbacks from engine ──────────────────────────────────────────────────
  const onSchedEntry = useCallback((entry) => {
    schedLog.current.push(entry)
  }, [])

  const onBeatEntry = useCallback((entry) => {
    beatLog.current.push(entry)
  }, [])

  // ── Build report ───────────────────────────────────────────────────────────
  const buildReport = useCallback(() => {
    const sched = schedLog.current
    const beats = beatLog.current

    // --- 1. Beat intervals ---
    // Compute ms between consecutive beats (all), and between beat=0 events (bars)
    const allIntervals = []
    for (let i = 1; i < beats.length; i++) {
      allIntervals.push(parseFloat((beats[i].wallMs - beats[i-1].wallMs).toFixed(1)))
    }
    const barIntervals = []
    const beat0s = beats.filter(b => b.beat === 0)
    for (let i = 1; i < beat0s.length; i++) {
      barIntervals.push(parseFloat((beat0s[i].wallMs - beat0s[i-1].wallMs).toFixed(1)))
    }

    // Per-beat position (0,1,2,3) interval stats
    const byBeatPos = {}
    for (let i = 1; i < beats.length; i++) {
      const beat = beats[i].beat
      if (!byBeatPos[beat]) byBeatPos[beat] = []
      byBeatPos[beat].push(parseFloat((beats[i].wallMs - beats[i-1].wallMs).toFixed(1)))
    }

    // --- 2. Note count per beat slot ---
    // Count actual noteOn events per partBeat
    const noteOnEntries  = sched.filter(e => e.type === 'noteOn')
    const notesPerBeat   = {}   // partBeat → count
    const notesPerType   = {}   // partBeat → { accType → count }
    for (const e of noteOnEntries) {
      notesPerBeat[e.partBeat] = (notesPerBeat[e.partBeat] || 0) + 1
      if (!notesPerType[e.partBeat]) notesPerType[e.partBeat] = {}
      notesPerType[e.partBeat][e.accType] = (notesPerType[e.partBeat][e.accType] || 0) + 1
    }

    // Find the max partBeat seen (= partSize - 1)
    const maxPartBeat = noteOnEntries.length
      ? Math.max(...noteOnEntries.map(e => e.partBeat))
      : 0

    // Part size info from beatSlot entries
    const slotEntry = sched.find(e => e.type === 'beatSlot')
    const partSize    = slotEntry?.partSize    ?? '?'
    const rawPartSize = slotEntry?.rawPartSize ?? '?'

    // --- 3. Sched deviation ---
    const devs     = noteOnEntries.map(e => e.deviationMs)
    const seamDevs = noteOnEntries.filter(e => e.isSeam).map(e => e.deviationMs)
    const normDevs = noteOnEntries.filter(e => !e.isSeam).map(e => e.deviationMs)

    const beatStats = {}
    for (const e of noteOnEntries) {
      if (!beatStats[e.partBeat]) beatStats[e.partBeat] = []
      beatStats[e.partBeat].push(e.deviationMs)
    }

    // Silent beat detection: partBeats with 0 noteOn events
    const allSlots = sched
      .filter(e => e.type === 'beatSlot')
      .map(e => e.partBeat)
    const uniqueScheduledBeats = [...new Set(allSlots)].sort((a, b) => a - b)
    const uniqueFiredBeats     = [...new Set(noteOnEntries.map(e => e.partBeat))].sort((a, b) => a - b)
    const silentBeats = uniqueScheduledBeats.filter(b => !uniqueFiredBeats.includes(b))

    setReport({
      // Beat intervals
      allIntervals:   stats(allIntervals),
      barIntervals:   stats(barIntervals),
      byBeatPos,
      expectedBeatMs: Math.round(60000 / TEST_BPM),
      rawIntervals:   allIntervals.slice(-32),  // last 32 for display

      // Note count
      notesPerBeat,
      notesPerType,
      maxPartBeat,
      partSize,
      rawPartSize,
      silentBeats,
      uniqueScheduledBeats,

      // Sched deviation
      allDev:  stats(devs),
      seamDev: stats(seamDevs),
      normDev: stats(normDevs),
      beatDevStats: Object.entries(beatStats)
        .map(([beat, ds]) => ({ beat: +beat, ...stats(ds) }))
        .sort((a, b) => a.beat - b.beat),

      totalNotes: noteOnEntries.length,
      totalBeats: beats.length,
    })
  }, [])

  // ── Start ──────────────────────────────────────────────────────────────────
  const startTest = useCallback(async () => {
    setStatus('loading')
    setReport(null)
    setBarCount(0)
    schedLog.current   = []
    beatLog.current    = []
    barCountRef.current = 0

    try {
      if (!SFP.isReady()) {
        await new Promise((resolve, reject) => {
          const eng = new BackingTrackEngine()
          eng.init(msg => setStatus(`טוען SF2: ${msg}`)).then(resolve).catch(reject)
        })
      }

      const styOption = STYLE_OPTIONS.find(o => o.id === selectedSty) ?? STYLE_OPTIONS[0]

      setStatus(`טוען ${styOption.label}...`)
      const res = await fetch(styOption.sty)
      if (!res.ok) throw new Error(`HTTP ${res.status} — ${styOption.sty}`)
      const style = parseSty(await res.arrayBuffer())

      const eng = new TimingTestEngine(onSchedEntry, onBeatEntry)
      engineRef.current = eng

      eng.setStyle(style)
      eng.setTempo(styOption.bpm)
      eng.setChordProgression(styOption.prog)

      const bpb = parseInt(style.timeSignature) || 4
      eng.onBeat = ({ beat, bar }) => {
        if (beat === 0) {
          barCountRef.current = bar + 1
          setBarCount(bar + 1)
          if (barCountRef.current >= TEST_BARS) {
            setTimeout(() => {
              eng.stop()
              buildReport()
              setStatus('done')
            }, 0)
          }
        }
      }

      setStatus('running')
      await eng.play()
    } catch (err) {
      console.error('[TimingTest]', err)
      setStatus(`error: ${err.message}`)
    }
  }, [onSchedEntry, onBeatEntry, buildReport])

  const stopTest = useCallback(() => {
    engineRef.current?.stop()
    buildReport()
    setStatus('done')
  }, [buildReport])

  // ── Copy ───────────────────────────────────────────────────────────────────
  const [copied, setCopied] = useState(false)
  const copyReport = useCallback(() => {
    if (!report) return
    const lines = []
    const r = report
    const exp = r.expectedBeatMs

    lines.push(`=== Timing Diagnostic v2 ===`)
    lines.push(`Style: ${TEST_STY_URL.split('/').pop()} | ${TEST_BPM} BPM | ${TEST_BARS} bars`)
    lines.push(`partSize=${r.partSize} rawPartSize=${r.rawPartSize}`)
    lines.push(``)

    lines.push(`--- 1. BEAT INTERVALS (expected=${exp}ms) ---`)
    const bi = r.allIntervals
    lines.push(`All beats: mean=${bi.mean}ms max=${bi.max}ms min=${bi.min}ms std=${bi.std}ms n=${bi.n}`)
    const bri = r.barIntervals
    lines.push(`Bar intervals (beat=0 to beat=0): mean=${bri.mean}ms max=${bri.max}ms min=${bri.min}ms`)
    lines.push(``)
    lines.push(`Per-beat-position intervals:`)
    for (const [pos, arr] of Object.entries(r.byBeatPos).sort((a,b)=>+a[0]-+b[0])) {
      const s = stats(arr)
      lines.push(`  beat ${pos}: mean=${s.mean}ms max=${s.max}ms min=${s.min}ms std=${s.std}ms n=${s.n}`)
    }
    lines.push(``)
    lines.push(`Last 32 intervals: ${r.rawIntervals.join(', ')}`)
    lines.push(``)

    lines.push(`--- 2. NOTES PER BEAT ---`)
    lines.push(`partSize=${r.partSize} (raw=${r.rawPartSize}) maxPartBeat seen=${r.maxPartBeat}`)
    lines.push(`Silent beats: ${r.silentBeats.length ? r.silentBeats.join(',') : 'none'}`)
    for (const beat of r.uniqueScheduledBeats) {
      const count = r.notesPerBeat[beat] || 0
      const types = r.notesPerType[beat]
        ? Object.entries(r.notesPerType[beat]).map(([t,c])=>`${t}:${c}`).join(' ')
        : 'NONE'
      const warn = count === 0 ? ' ← SILENT!' : ''
      lines.push(`  partBeat ${beat}: ${count} notes [${types}]${warn}`)
    }
    lines.push(``)

    lines.push(`--- 3. SCHED DEVIATION (setTimeout accuracy) ---`)
    lines.push(`All:      mean=${r.allDev.mean}ms max=${r.allDev.max}ms std=${r.allDev.std}ms n=${r.allDev.n}`)
    lines.push(`Seam:     mean=${r.seamDev.mean}ms max=${r.seamDev.max}ms`)
    lines.push(`Non-seam: mean=${r.normDev.mean}ms max=${r.normDev.max}ms`)
    lines.push(``)
    lines.push(`Per partBeat:`)
    for (const {beat,mean,max,std,n} of r.beatDevStats) {
      lines.push(`  beat ${beat}: mean=${mean}ms max=${max}ms std=${std}ms n=${n}`)
    }

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }, [report])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ background:'#0f0f1e', color:'#e0e0f0', minHeight:'100vh',
                  fontFamily:'monospace', fontSize:13, padding:24 }}>

      <h2 style={{ color:'#88aaff', marginTop:0 }}>🎯 Timing Diagnostic v2</h2>

      {/* Style selector */}
      <div style={{ marginBottom:16 }}>
        <select
          value={selectedSty}
          onChange={e => setSelectedSty(e.target.value)}
          disabled={status==='running'||status==='loading'}
          style={{
            background:'#1a1a2e', color:'#e0e0f0', border:'1px solid #446',
            borderRadius:6, padding:'6px 12px', fontSize:13, fontFamily:'monospace',
            width: 260, cursor:'pointer',
          }}
        >
          {STYLE_OPTIONS.map(o => (
            <option key={o.id} value={o.id}>{o.label} ({o.bpm} BPM)</option>
          ))}
        </select>
        <span style={{ color:'#555', fontSize:11, marginLeft:10 }}>
          {STYLE_OPTIONS.find(o=>o.id===selectedSty)?.sty.split('/').pop()}
        </span>
      </div>

      {/* Controls */}
      <div style={{ display:'flex', gap:12, marginBottom:20, alignItems:'center' }}>
        <button onClick={startTest}
          disabled={status==='running'||status==='loading'}
          style={btn('#3355ff')}>▶ הפעל ({TEST_BARS} bars)</button>
        <button onClick={stopTest}
          disabled={status!=='running'}
          style={btn('#883333')}>■ עצור</button>
        {report && (
          <button onClick={copyReport} style={btn(copied?'#226633':'#446622')}>
            {copied ? '✓ הועתק!' : '📋 העתק תוצאות'}
          </button>
        )}
        <span style={{ color: status==='running'?'#44cc88':status==='done'?'#88aaff':'#888' }}>
          {status==='running' ? `▶ bar ${barCount}/${TEST_BARS}` : status}
        </span>
      </div>

      {report && <>

        {/* ── Section 1: Beat Intervals ── */}
        <Section title="1. ריווח בין ביטים (Beat Intervals)">
          <p style={{ color:'#aaa', margin:'0 0 10px', fontSize:12 }}>
            expected: <strong style={{color:'#fff'}}>{report.expectedBeatMs}ms</strong>
            {' '}per beat · deviation shows rhythm unevenness
          </p>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,auto)', gap:'8px 24px',
                        marginBottom:14 }}>
            <Stat label="All beats mean"    val={report.allIntervals.mean} unit="ms" expected={report.expectedBeatMs} />
            <Stat label="All beats max"     val={report.allIntervals.max}  unit="ms" expected={report.expectedBeatMs} />
            <Stat label="All beats std"     val={report.allIntervals.std}  unit="ms" expected={0} />
            <Stat label="Bar interval mean" val={report.barIntervals.mean} unit="ms"
                  expected={report.expectedBeatMs * 4} />
            <Stat label="Bar interval max"  val={report.barIntervals.max}  unit="ms"
                  expected={report.expectedBeatMs * 4} />
            <Stat label="Bar interval std"  val={report.barIntervals.std}  unit="ms" expected={0} />
          </div>

          <h4 style={{ color:'#aabbff', margin:'0 0 6px' }}>Per-beat-position (0=kick, etc.)</h4>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {Object.entries(report.byBeatPos).sort((a,b)=>+a[0]-+b[0]).map(([pos, arr]) => {
              const s = stats(arr)
              const diff = Math.abs(s.mean - report.expectedBeatMs)
              return (
                <div key={pos} style={{ background:'#1a1a2e', border:'1px solid #334',
                                        borderRadius:6, padding:'6px 10px', textAlign:'center', minWidth:80 }}>
                  <div style={{ color:'#88aaff', fontWeight:'bold' }}>beat {pos}</div>
                  <div style={{ color: diff>30?'#ff4444':diff>10?'#ffdd44':'#44cc88' }}>
                    μ {s.mean}ms
                  </div>
                  <div style={{ color:'#666', fontSize:11 }}>std {s.std}ms</div>
                  <div style={{ color:'#555', fontSize:11 }}>n={s.n}</div>
                </div>
              )
            })}
          </div>

          <h4 style={{ color:'#aabbff', margin:'10px 0 4px' }}>אחרונים 32 intervals (ms)</h4>
          <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
            {report.rawIntervals.map((v, i) => {
              const diff = Math.abs(v - report.expectedBeatMs)
              return (
                <span key={i} style={{
                  background: diff>50?'#3a1010':diff>20?'#2a2200':'#1a2a1a',
                  border: `1px solid ${diff>50?'#ff4444':diff>20?'#ffdd44':'#334'}`,
                  borderRadius:4, padding:'2px 6px', fontSize:12,
                  color: diff>50?'#ff4444':diff>20?'#ffdd44':'#88cc88',
                }}>
                  {v}
                </span>
              )
            })}
          </div>
        </Section>

        {/* ── Section 2: Notes Per Beat ── */}
        <Section title="2. תווים לפי ביט (Note Coverage)">
          <p style={{ color:'#aaa', margin:'0 0 10px', fontSize:12 }}>
            partSize={report.partSize} (raw={report.rawPartSize}) ·
            {report.silentBeats.length > 0
              ? <span style={{ color:'#ff4444' }}> ⚠ Silent beats: {report.silentBeats.join(', ')}</span>
              : <span style={{ color:'#44cc88' }}> ✓ No silent beats</span>}
          </p>

          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {report.uniqueScheduledBeats.map(beat => {
              const count = report.notesPerBeat[beat] || 0
              const isSilent = count === 0
              const types = report.notesPerType[beat]
                ? Object.entries(report.notesPerType[beat])
                    .sort((a,b) => b[1]-a[1])
                    .map(([t,c]) => `${t}:${c}`)
                    .join('\n')
                : ''
              return (
                <div key={beat} title={types} style={{
                  background: isSilent ? '#3a1010' : beat===0 ? '#1a2a1a' : '#1a1a2e',
                  border: `1px solid ${isSilent?'#ff4444':beat===0?'#44aa66':'#334'}`,
                  borderRadius:6, padding:'6px 10px', textAlign:'center', minWidth:64,
                  cursor: types ? 'help' : 'default',
                }}>
                  <div style={{ color: beat===0?'#88cc88':'#88aaff', fontWeight:'bold' }}>
                    beat {beat}{beat===0?' 🔴':''}
                  </div>
                  <div style={{ color: isSilent?'#ff4444':'#e0e0f0', fontSize:15 }}>
                    {isSilent ? '0 !!!' : count}
                  </div>
                  <div style={{ color:'#555', fontSize:10 }}>notes</div>
                </div>
              )
            })}
          </div>
        </Section>

        {/* ── Section 3: Sched Deviation ── */}
        <Section title="3. דיוק setTimeout (Sched Deviation)">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,auto)',
                        gap:'8px 24px', marginBottom:14 }}>
            <Stat label="All mean"     val={report.allDev.mean}  unit="ms" expected={0} />
            <Stat label="All max"      val={report.allDev.max}   unit="ms" expected={0} />
            <Stat label="Seam mean"    val={report.seamDev.mean} unit="ms" expected={0} />
            <Stat label="Non-seam mean"val={report.normDev.mean} unit="ms" expected={0} />
          </div>

          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {report.beatDevStats.map(({ beat, mean, max, std, n }) => (
              <div key={beat} style={{
                background: beat===0?'#2a1a1a':'#1a1a2e',
                border:`1px solid ${beat===0?'#ff4444':'#334'}`,
                borderRadius:6, padding:'6px 10px', textAlign:'center', minWidth:72,
              }}>
                <div style={{ color: beat===0?'#ff6666':'#88aaff', fontWeight:'bold' }}>
                  beat {beat}
                </div>
                <div style={{ color: devColor(mean) }}>μ {mean}ms</div>
                <div style={{ color:'#666', fontSize:11 }}>max {max}ms</div>
                <div style={{ color:'#555', fontSize:11 }}>n={n}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Verdict ── */}
        <Verdict report={report} />

      </>}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div style={{ background:'#12122a', border:'1px solid #223',
                  borderRadius:8, padding:'14px 16px', marginBottom:16 }}>
      <h3 style={{ color:'#ffcc44', margin:'0 0 12px' }}>{title}</h3>
      {children}
    </div>
  )
}

function Stat({ label, val, unit, expected }) {
  const diff = Math.abs(val - expected)
  const color = diff > 50 ? '#ff4444' : diff > 20 ? '#ffdd44' : '#44cc88'
  return (
    <>
      <span style={{ color:'#888' }}>{label}</span>
      <span style={{ color, fontWeight:'bold' }}>{val}{unit}</span>
      <span style={{ color:'#555' }}>{diff > 0 ? `(Δ${diff.toFixed(0)})` : '✓'}</span>
    </>
  )
}

function Verdict({ report }) {
  const r = report
  const exp = r.expectedBeatMs
  const beatStd = r.allIntervals.std
  const hasSilent = r.silentBeats.length > 0
  const bigIntervalJitter = beatStd > 30
  const partMismatch = r.partSize !== r.rawPartSize

  const issues = []
  if (hasSilent)         issues.push(`⚠ ביטים שקטים: ${r.silentBeats.join(',')} — תבנית לא מכסה את כל ה-partBeat slots`)
  if (bigIntervalJitter) issues.push(`⚠ ריווח ביטים לא אחיד: std=${beatStd}ms (expected <10ms)`)
  if (partMismatch)      issues.push(`⚠ partSize מיושר (${r.partSize}) ≠ rawPartSize (${r.rawPartSize}) — ייתכן פספוס תווים`)
  if (r.allDev.max > 50) issues.push(`⚠ setTimeout max deviation=${r.allDev.max}ms — jitter גבוה`)

  const ok = issues.length === 0

  return (
    <div style={{
      background: ok ? '#0d1a0d' : '#1a100a',
      border:`1px solid ${ok?'#44aa44':'#aa6622'}`,
      borderRadius:8, padding:'14px 16px',
    }}>
      <h3 style={{ color: ok?'#44cc88':'#ffaa44', margin:'0 0 8px' }}>
        {ok ? '✓ לא נמצאו בעיות ברורות' : `⚠ נמצאו ${issues.length} בעיות`}
      </h3>
      {issues.map((issue, i) => (
        <div key={i} style={{ color:'#ffcc88', marginBottom:4 }}>{issue}</div>
      ))}
      {ok && (
        <div style={{ color:'#888', fontSize:12 }}>
          הגליץ' עשוי לנבוע מ-FluidSynth buffer quantization ({Math.round(256/44100*1000)}ms) או
          מבעיה ב-SoundFont/SF2 עצמו.
        </div>
      )}
    </div>
  )
}

// ─── Style helpers ─────────────────────────────────────────────────────────────
function btn(bg) {
  return { background:bg, color:'#fff', border:'none', borderRadius:6,
           padding:'8px 16px', cursor:'pointer', fontSize:13, fontFamily:'monospace' }
}
