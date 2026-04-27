import React from 'react';

/**
 * Minimal notation card — renders a melody as note names + a contour SVG.
 * Used by S2 to show 4 candidate transcriptions for the played melody.
 *
 * Props:
 *   notes        — string[] like ['C4','E4','G4','E4']
 *   onClick      — () => void
 *   highlight    — 'correct' | 'wrong' | null
 *   selected     — boolean
 */
const NotationCard = ({ notes = [], onClick, highlight, selected }) => {
  const cardStyle = {
    border: '2px solid var(--border-color, #ddd)',
    borderRadius: 12,
    padding: 12,
    background: '#fff',
    cursor: onClick ? 'pointer' : 'default',
    minWidth: 160,
    transition: 'all 0.15s',
    ...(selected ? { borderColor: 'var(--color-primary, #4a90e2)', boxShadow: '0 0 0 3px rgba(74,144,226,0.2)' } : {}),
    ...(highlight === 'correct' ? { borderColor: '#2dbb5b', background: '#eaf9ee' } : {}),
    ...(highlight === 'wrong' ? { borderColor: '#e74c3c', background: '#fdecea' } : {})
  };

  // simple SVG contour: y axis = pitch, x axis = note index
  const w = 140, h = 60, pad = 8;
  const midis = notes.map(noteToMidi).filter(n => n != null);
  const min = Math.min(...midis, 60);
  const max = Math.max(...midis, 72);
  const range = Math.max(1, max - min);
  const points = midis.map((m, i) => {
    const x = pad + (i / Math.max(1, midis.length - 1)) * (w - pad * 2);
    const y = h - pad - ((m - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });

  return (
    <div style={cardStyle} onClick={onClick}>
      <svg width={w} height={h} style={{ display: 'block' }}>
        <line x1="0" y1={h / 2} x2={w} y2={h / 2} stroke="#eee" />
        {points.length > 1 && (
          <polyline points={points.join(' ')} fill="none" stroke="var(--color-primary, #4a90e2)" strokeWidth="2" />
        )}
        {points.map((p, i) => {
          const [x, y] = p.split(',').map(Number);
          return <circle key={i} cx={x} cy={y} r="3" fill="var(--color-primary, #4a90e2)" />;
        })}
      </svg>
      <div style={{ marginTop: 6, fontSize: 12, fontFamily: 'monospace', textAlign: 'center', color: 'var(--color-text-secondary, #666)' }}>
        {notes.map(n => stripOctave(n)).join(' • ')}
      </div>
    </div>
  );
};

const NOTE_TO_SEMITONE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
function noteToMidi(note) {
  const m = String(note).match(/^([A-G][b#]?)(-?\d+)$/);
  if (!m) return null;
  const semi = NOTE_TO_SEMITONE[m[1]];
  if (semi == null) return null;
  return (parseInt(m[2], 10) + 1) * 12 + semi;
}
function stripOctave(note) {
  return String(note).replace(/-?\d+$/, '');
}

export default NotationCard;
