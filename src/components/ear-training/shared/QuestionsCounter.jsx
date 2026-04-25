import React from 'react';
import './earTrainingShared.css';

/**
 * Compact [-] N [+] counter.
 * Props: { value, onChange, min=3, max=30, label='שאלות' }
 */
const QuestionsCounter = ({ value, onChange, min = 3, max = 30, label = 'שאלות' }) => {
  const clamp = (n) => Math.max(min, Math.min(max, n));
  return (
    <div className="et-counter" aria-label={label}>
      <span className="et-counter-label">{label}:</span>
      <button
        type="button"
        className="et-counter-btn"
        onClick={() => onChange?.(clamp(value - 1))}
        disabled={value <= min}
        aria-label="הפחת"
      >
        −
      </button>
      <span className="et-counter-value">{value}</span>
      <button
        type="button"
        className="et-counter-btn"
        onClick={() => onChange?.(clamp(value + 1))}
        disabled={value >= max}
        aria-label="הוסף"
      >
        +
      </button>
    </div>
  );
};

export default QuestionsCounter;
