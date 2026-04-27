import React from 'react'

export function computeStats(values) {
  if (!values.length) return { n: 0, mean: 0, std: 0, min: 0, max: 0, p95: 0, absMax: 0 }
  const n = values.length
  const mean = values.reduce((a, b) => a + b, 0) / n
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n
  const std = Math.sqrt(variance)
  const sorted = [...values].sort((a, b) => a - b)
  const p95 = sorted[Math.min(n - 1, Math.floor(n * 0.95))]
  const min = sorted[0]
  const max = sorted[n - 1]
  const absMax = Math.max(Math.abs(min), Math.abs(max))
  return { n, mean, std, min, max, p95, absMax }
}

const cellStyle = {
  padding: '6px 12px',
  borderBottom: '1px solid #2a2a3e',
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
}
const headerStyle = {
  ...cellStyle,
  textAlign: 'left',
  color: '#a0a0c0',
  fontWeight: 600,
}

export function StatsTable({ rows, unit = 'ms', columns }) {
  const cols = columns || ['n', 'mean', 'std', 'p95', 'absMax']
  const colLabels = {
    n: '#',
    mean: 'mean',
    std: 'std',
    min: 'min',
    max: 'max',
    p95: 'p95',
    absMax: '|max|',
  }

  return (
    <table style={{
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: 13,
      color: '#e0e0f0',
      background: '#16162a',
      borderRadius: 6,
      overflow: 'hidden',
    }}>
      <thead>
        <tr style={{ background: '#1e1e36' }}>
          <th style={{ ...headerStyle, textAlign: 'left' }}>Group</th>
          {cols.map(c => (
            <th key={c} style={headerStyle}>{colLabels[c]} {c !== 'n' && <span style={{opacity:0.5}}>({unit})</span>}</th>
          ))}
          <th style={headerStyle}>Verdict</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          const stats = row.stats || computeStats(row.values || [])
          return (
            <tr key={row.label + i}>
              <td style={{ ...cellStyle, textAlign: 'left', color: row.color || '#e0e0f0' }}>
                {row.label}
              </td>
              {cols.map(c => (
                <td key={c} style={cellStyle}>
                  {c === 'n' ? stats.n : stats[c].toFixed(2)}
                </td>
              ))}
              <td style={{ ...cellStyle, textAlign: 'center' }}>
                {row.verdict ?? renderDefaultVerdict(stats, row.passThreshold)}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function renderDefaultVerdict(stats, threshold) {
  if (!threshold) return '—'
  const ok = stats.std < threshold.std && stats.absMax < threshold.absMax
  return ok
    ? <span style={{ color: '#7eda7e' }}>✓ pass</span>
    : <span style={{ color: '#ff8a8a' }}>✗ fail</span>
}
