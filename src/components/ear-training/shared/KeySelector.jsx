import React from 'react';
import './earTrainingShared.css';

const KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

/** Cycle through 12 keys with [+]/[−]. value: 'C' | 'D' | ... */
const KeySelector = ({ value = 'C', onChange, label = 'מפתח' }) => {
  const idx = Math.max(0, KEYS.indexOf(value));
  const next = () => onChange?.(KEYS[(idx + 1) % 12]);
  const prev = () => onChange?.(KEYS[(idx + 11) % 12]);
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 13, color: 'var(--color-text-secondary, #666)' }}>{label}:</span>
      <div className="et-counter">
        <button className="et-counter-btn" onClick={prev} aria-label="מפתח קודם">−</button>
        <span className="et-counter-value" style={{ minWidth: 44 }}>{value}</span>
        <button className="et-counter-btn" onClick={next} aria-label="מפתח הבא">+</button>
      </div>
    </div>
  );
};

export { KEYS };
export default KeySelector;
