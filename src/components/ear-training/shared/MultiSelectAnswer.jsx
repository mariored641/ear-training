import React, { useState, useEffect } from 'react';
import './earTrainingShared.css';

/**
 * Multi-select answer chips + [אשר] button. For exercises like H4 where the user
 * marks multiple checkboxes (which tensions are present).
 *
 * Props:
 *   options       — [{ id, label }]
 *   correctIds    — string[] (the right answer set)
 *   onConfirm     — (selected: string[], correct: boolean) => void
 *   confirmLabel  — default "אשר"
 *   resetKey      — change this to clear selection between questions
 */
const MultiSelectAnswer = ({
  options,
  correctIds,
  onConfirm,
  confirmLabel = 'אשר',
  resetKey
}) => {
  const [selected, setSelected] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setSelected([]);
    setSubmitted(false);
  }, [resetKey]);

  const toggle = (id) => {
    if (submitted) return;
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleConfirm = () => {
    if (submitted) return;
    setSubmitted(true);
    const correct =
      selected.length === correctIds.length &&
      selected.every(id => correctIds.includes(id));
    onConfirm?.(selected, correct);
  };

  const getChipStyle = (id) => {
    const isSel = selected.includes(id);
    if (!submitted) {
      return isSel ? activeStyle : baseStyle;
    }
    const isCorrect = correctIds.includes(id);
    if (isSel && isCorrect) return correctChipStyle;   // chose & right
    if (isSel && !isCorrect) return wrongChipStyle;    // chose & wrong
    if (!isSel && isCorrect) return missedChipStyle;   // missed it
    return baseStyle;                                   // not chosen, not correct
  };

  return (
    <div style={{ textAlign: 'center', padding: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        {options.map(opt => (
          <button
            key={opt.id}
            onClick={() => toggle(opt.id)}
            style={getChipStyle(opt.id)}
            disabled={submitted}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        <button
          onClick={handleConfirm}
          disabled={submitted || selected.length === 0}
          style={confirmBtnStyle}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
};

const baseStyle = {
  padding: '8px 16px',
  border: '2px solid var(--border-color, #ddd)',
  borderRadius: 999,
  background: '#fff',
  color: 'var(--color-text, #222)',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 14
};
const activeStyle = { ...baseStyle, background: 'var(--color-primary, #4a90e2)', color: '#fff', borderColor: 'var(--color-primary, #4a90e2)' };
const correctChipStyle = { ...baseStyle, background: '#2dbb5b', color: '#fff', borderColor: '#2dbb5b' };
const wrongChipStyle = { ...baseStyle, background: '#e74c3c', color: '#fff', borderColor: '#e74c3c' };
const missedChipStyle = { ...baseStyle, borderColor: '#2dbb5b', borderStyle: 'dashed', color: '#2dbb5b' };
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

export default MultiSelectAnswer;
