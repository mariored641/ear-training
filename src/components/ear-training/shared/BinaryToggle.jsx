import React from 'react';
import './earTrainingShared.css';

/**
 * 2-option toggle. Generic — also works for 3+ options.
 * Props:
 *   options: [{ value, label }]
 *   value: any
 *   onChange: (value) => void
 *   label?: string
 */
const BinaryToggle = ({ options, value, onChange, label }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
    {label && <span style={{ fontSize: 13, color: 'var(--color-text-secondary, #666)' }}>{label}:</span>}
    <div className="et-toggle-group">
      {options.map(opt => (
        <button
          key={opt.value}
          className={`et-toggle-btn ${value === opt.value ? 'active' : ''}`}
          onClick={() => onChange?.(opt.value)}
          aria-pressed={value === opt.value}
        >
          {opt.label}
        </button>
      ))}
    </div>
  </div>
);

export default BinaryToggle;
