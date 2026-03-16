import { useState } from 'react'
import { parseSty } from '../../lib/style-engine/StyleParser'
import { validateStyle, logStyleSummary } from '../../lib/style-engine/StyleValidator'

// Known .sty files available from Vite middleware
const PRESET_FILES = [
  { label: 'Jazz Waltz Fast',   url: '/styles-appdata/Yamaha/JazzWaltzFast.S499.sty' },
  { label: 'Jazz Vocal',        url: '/styles-appdata/Yamaha/Jazzvocal.s264.sty' },
  { label: 'Jazz Rock Cz2k',   url: '/styles-appdata/YamJJazz/JazzRock_Cz2k.S563.sty' },
  { label: 'Samba City',        url: '/styles-appdata/YamJJazz/SambaCity213.s460.sty' },
  { label: 'Bossa Nova (Cool)', url: '/styles/Latin/CoolBossa.S460.sty' },
  { label: 'Guitar Bossa 6',   url: '/styles/Latin/GuitarBossa6.S081.sty' },
  { label: 'Disco House',       url: '/styles/Dance/DiscoHouse.sty' },
]

export default function StyleParserTest() {
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedPart, setSelectedPart] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)

  async function loadUrl(url, label) {
    setLoading(true); setError(null); setResult(null); setSelectedPart(null); setSelectedFile(label)
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)
      const buffer = await res.arrayBuffer()
      const style = parseSty(buffer)
      const validation = validateStyle(style)
      logStyleSummary(style)
      setResult({ style, validation })
    } catch (e) {
      setError(e.message)
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function loadFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setLoading(true); setError(null); setResult(null); setSelectedPart(null); setSelectedFile(file.name)
    try {
      const buffer = await file.arrayBuffer()
      const style = parseSty(buffer)
      const validation = validateStyle(style)
      logStyleSummary(style)
      setResult({ style, validation })
    } catch (err) {
      setError(err.message)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const style = result?.style
  const validation = result?.validation

  return (
    <div style={{ padding: 24, fontFamily: 'monospace', background: '#0f0f1e', color: '#e0e0e0', minHeight: '100vh' }}>
      <h2 style={{ color: '#a78bfa', marginBottom: 16 }}>🎵 Style Parser Test — שלב 2</h2>

      {/* Preset buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {PRESET_FILES.map(f => (
          <button
            key={f.url}
            onClick={() => loadUrl(f.url, f.label)}
            style={{
              padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: selectedFile === f.label ? '#a78bfa' : '#2d2d50',
              color: '#fff', fontSize: 13,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* File upload */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 13, color: '#9ca3af' }}>
          או טען קובץ .sty מקומי:&nbsp;
          <input type="file" accept=".sty,.STY" onChange={loadFile} style={{ color: '#e0e0e0' }} />
        </label>
      </div>

      {loading && <div style={{ color: '#fbbf24' }}>טוען...</div>}
      {error && <div style={{ color: '#f87171', background: '#2d1515', padding: 12, borderRadius: 6 }}>❌ {error}</div>}

      {style && (
        <>
          {/* Header */}
          <div style={{ background: '#1a1a3e', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <h3 style={{ color: '#34d399', margin: '0 0 8px' }}>
              "{style.name}" — {style.sffType}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {[
                ['Tempo', `${style.tempo} BPM`],
                ['Time Sig', style.timeSignature],
                ['TPQ', style.ticksPerQuarter],
                ['Division', style.division],
              ].map(([k, v]) => (
                <div key={k} style={{ background: '#0f0f2e', padding: '8px 12px', borderRadius: 6 }}>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{k}</div>
                  <div style={{ fontWeight: 'bold', color: '#e0e0e0' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Validation */}
          <div style={{ marginBottom: 16 }}>
            {validation.valid
              ? <div style={{ color: '#34d399' }}>✅ Validation passed</div>
              : <div style={{ color: '#f87171' }}>❌ {validation.errors.length} error(s)</div>
            }
            {validation.errors.map((e, i) => <div key={i} style={{ color: '#f87171', fontSize: 12, marginLeft: 16 }}>• {e}</div>)}
            {validation.warnings.map((w, i) => <div key={i} style={{ color: '#fbbf24', fontSize: 12, marginLeft: 16 }}>⚠ {w}</div>)}
          </div>

          {/* Parts list */}
          <h4 style={{ color: '#a78bfa', margin: '0 0 8px' }}>StyleParts ({Object.keys(style.parts).length})</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {Object.keys(style.parts).map(key => (
              <button
                key={key}
                onClick={() => setSelectedPart(selectedPart === key ? null : key)}
                style={{
                  padding: '4px 10px', borderRadius: 5, border: 'none', cursor: 'pointer',
                  background: selectedPart === key ? '#7c3aed' : '#2d2d50', color: '#fff', fontSize: 12
                }}
              >
                {key} ({style.parts[key].sizeInBeats}b)
              </button>
            ))}
          </div>

          {/* Part detail */}
          {selectedPart && style.parts[selectedPart] && (
            <PartDetail partKey={selectedPart} part={style.parts[selectedPart]} />
          )}
        </>
      )}
    </div>
  )
}

function PartDetail({ partKey, part }) {
  const [expandedCh, setExpandedCh] = useState(null)

  return (
    <div style={{ background: '#1a1a3e', padding: 16, borderRadius: 8 }}>
      <h4 style={{ color: '#34d399', margin: '0 0 12px' }}>
        {partKey} — {part.sizeInBeats} beats
      </h4>
      {Object.entries(part.channels).map(([ch, chData]) => {
        const { ctab, notes } = chData
        const main = ctab.ctb2Main
        const isExpanded = expandedCh === ch
        return (
          <div key={ch} style={{ marginBottom: 8, background: '#0f0f2e', borderRadius: 6, overflow: 'hidden' }}>
            <div
              onClick={() => setExpandedCh(isExpanded ? null : ch)}
              style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', gap: 16, alignItems: 'center' }}
            >
              <span style={{ color: '#a78bfa', minWidth: 32 }}>ch{ch}</span>
              <span style={{ color: '#fbbf24', minWidth: 80 }}>{ctab.accType}</span>
              <span style={{ color: '#9ca3af', minWidth: 100 }}>src: {ctab.sourceChordType}</span>
              <span style={{ color: '#60a5fa', minWidth: 180 }}>ntr: {main?.ntr}</span>
              <span style={{ color: '#34d399', minWidth: 140 }}>ntt: {main?.ntt}</span>
              <span style={{ color: '#e0e0e0' }}>{notes.length} notes</span>
              {main?.bassOn && <span style={{ color: '#f87171' }}>BASS</span>}
            </div>
            {isExpanded && (
              <div style={{ padding: '0 12px 12px' }}>
                <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>
                  limits: [{main?.noteLowLimit}–{main?.noteHighLimit}] | rootUpperLimit: {main?.chordRootUpperLimit} | rtr: {main?.rtr}
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>
                  mutedChords: [{ctab.mutedChords.join(', ') || 'none'}]
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>
                  mutedNotes (pitches): [{ctab.mutedNotes.join(', ') || 'none'}]
                </div>
                {/* First 10 notes */}
                {notes.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>
                      First {Math.min(10, notes.length)} notes (pitch, vel, pos, dur):
                    </div>
                    {notes.slice(0, 10).map((n, i) => (
                      <div key={i} style={{ fontSize: 11, color: '#d1d5db' }}>
                        pitch:{n.pitch} vel:{n.velocity} pos:{n.position.toFixed(3)} dur:{n.duration.toFixed(3)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
