import React, { useState, useEffect } from 'react';

/**
 * Click-to-answer guitar fretboard (used by G1 — Fretboard Mapping).
 *
 * Strings (high → low): e B G D A E (display top→bottom)
 * Frets: 0..maxFret
 *
 * Props:
 *   maxFret       — number (default 5)
 *   activeStrings — string[] e.g. ['E','A','D','G','B','e']  (subset to enable)
 *   correct       — { string: 'E'|'A'|...|'e', fret: number }
 *   onAnswer      — (clicked: {string,fret}, correct: boolean) => void
 *   resetKey      — change to clear marker
 *   labelMode     — 'inOrder' | 'free' (placeholder; affects labelling later)
 */
const STRING_ORDER = ['e', 'B', 'G', 'D', 'A', 'E']; // top → bottom

const FretboardAnswer = ({
  maxFret = 5,
  activeStrings = STRING_ORDER,
  correct,
  onAnswer,
  resetKey
}) => {
  const [picked, setPicked] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setPicked(null);
    setSubmitted(false);
  }, [resetKey]);

  const handleClick = (string, fret) => {
    if (submitted) return;
    setPicked({ string, fret });
    setSubmitted(true);
    const isCorrect = correct && string === correct.string && fret === correct.fret;
    onAnswer?.({ string, fret }, isCorrect);
  };

  const cellState = (s, f) => {
    if (!submitted) {
      return picked && picked.string === s && picked.fret === f ? 'picked' : 'idle';
    }
    if (correct && s === correct.string && f === correct.fret) {
      if (picked && picked.string === s && picked.fret === f) return 'correct';
      return 'shouldBe';
    }
    if (picked && picked.string === s && picked.fret === f) return 'wrong';
    return 'idle';
  };

  const cellStyle = (state) => {
    const base = {
      width: 44, height: 36, border: '1px solid #aaa', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12,
      background: '#fff', color: '#333'
    };
    if (state === 'picked') return { ...base, background: 'var(--color-primary, #4a90e2)', color: '#fff' };
    if (state === 'correct') return { ...base, background: '#2dbb5b', color: '#fff' };
    if (state === 'wrong') return { ...base, background: '#e74c3c', color: '#fff' };
    if (state === 'shouldBe') return { ...base, background: '#fff7cc', borderColor: '#e0a000' };
    return base;
  };

  return (
    <div style={{ direction: 'ltr', overflowX: 'auto', padding: 16 }}>
      <table style={{ borderCollapse: 'collapse', margin: '0 auto' }}>
        <thead>
          <tr>
            <th style={headStyle}></th>
            {Array.from({ length: maxFret + 1 }, (_, f) => (
              <th key={f} style={headStyle}>{f}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {STRING_ORDER.map(s => {
            const enabled = activeStrings.includes(s);
            return (
              <tr key={s} style={{ opacity: enabled ? 1 : 0.3 }}>
                <td style={headStyle}>{s}</td>
                {Array.from({ length: maxFret + 1 }, (_, f) => {
                  const state = cellState(s, f);
                  return (
                    <td
                      key={f}
                      style={cellStyle(state)}
                      onClick={enabled ? () => handleClick(s, f) : undefined}
                    >
                      {state === 'picked' || state === 'wrong' || state === 'correct' ? '●' : ''}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const headStyle = {
  padding: 6, fontSize: 12, fontWeight: 700,
  background: '#f5f5f5', border: '1px solid #aaa', minWidth: 32, textAlign: 'center'
};

export { STRING_ORDER };
export default FretboardAnswer;
