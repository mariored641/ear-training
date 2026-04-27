import React, { useState, useEffect } from 'react';

/**
 * Interactive rhythm grid for F3 — harmonic rhythm.
 * Each row = one measure; each cell = one subdivision.
 * Click a cell to mark a chord change at that beat.
 *
 * Props:
 *   measures      — number of measures
 *   subdivisions  — beats per measure (e.g. 8 for 4/4 with 8th notes)
 *   correctSet    — Set<string> of "m:b" keys where changes occur
 *   resetKey      — change to reset selection
 *   onConfirm     — (selected: string[], correct: boolean) => void
 *   showCheck     — boolean (auto-check after click vs explicit confirm)
 */
const RhythmGrid = ({
  measures = 2,
  subdivisions = 8,
  correctSet = new Set(),
  resetKey,
  onConfirm
}) => {
  const [selected, setSelected] = useState(new Set());
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setSelected(new Set());
    setSubmitted(false);
  }, [resetKey]);

  const toggle = (key) => {
    if (submitted) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleConfirm = () => {
    if (submitted) return;
    setSubmitted(true);
    const correctArr = Array.from(correctSet);
    const selArr = Array.from(selected);
    const isCorrect =
      selArr.length === correctArr.length &&
      selArr.every(k => correctSet.has(k));
    onConfirm?.(selArr, isCorrect);
  };

  const getCellStyle = (key) => {
    const isSel = selected.has(key);
    if (!submitted) return isSel ? selStyle : cellStyle;
    const isCorrect = correctSet.has(key);
    if (isSel && isCorrect) return correctCell;
    if (isSel && !isCorrect) return wrongCell;
    if (!isSel && isCorrect) return missedCell;
    return cellStyle;
  };

  const beatLabel = (b) => {
    // for 8 subdivisions: 1, +, 2, +, 3, +, 4, +
    if (subdivisions === 8) {
      const half = b % 2;
      const beat = Math.floor(b / 2) + 1;
      return half === 0 ? String(beat) : '+';
    }
    return String(b + 1);
  };

  return (
    <div style={{ padding: 16, maxWidth: 720, margin: '0 auto' }}>
      {Array.from({ length: measures }).map((_, m) => (
        <div key={m} style={rowStyle}>
          <div style={measureLabelStyle}>טקט {m + 1}</div>
          <div style={cellsStyle}>
            {Array.from({ length: subdivisions }).map((_, b) => {
              const key = `${m}:${b}`;
              return (
                <button
                  key={b}
                  onClick={() => toggle(key)}
                  style={getCellStyle(key)}
                  disabled={submitted}
                >
                  {beatLabel(b)}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <button onClick={handleConfirm} disabled={submitted} style={confirmBtnStyle}>
          בדוק
        </button>
      </div>
    </div>
  );
};

const rowStyle = { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, direction: 'rtl' };
const measureLabelStyle = { minWidth: 60, fontSize: 14, fontWeight: 600, color: 'var(--color-text-secondary, #666)' };
const cellsStyle = { display: 'flex', gap: 4, flex: 1 };
const cellStyle = {
  flex: 1,
  minWidth: 36,
  height: 44,
  border: '2px solid var(--border-color, #ddd)',
  borderRadius: 6,
  background: '#fff',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--color-text-secondary, #666)'
};
const selStyle = { ...cellStyle, background: 'var(--color-primary, #4a90e2)', color: '#fff', borderColor: 'var(--color-primary, #4a90e2)' };
const correctCell = { ...cellStyle, background: '#2dbb5b', color: '#fff', borderColor: '#2dbb5b' };
const wrongCell = { ...cellStyle, background: '#e74c3c', color: '#fff', borderColor: '#e74c3c' };
const missedCell = { ...cellStyle, borderColor: '#2dbb5b', borderStyle: 'dashed', color: '#2dbb5b' };
const confirmBtnStyle = {
  padding: '12px 32px',
  borderRadius: 12,
  border: '2px solid var(--color-primary, #4a90e2)',
  background: 'var(--color-primary, #4a90e2)',
  color: '#fff',
  fontWeight: 700,
  fontSize: 16,
  cursor: 'pointer'
};

export default RhythmGrid;
