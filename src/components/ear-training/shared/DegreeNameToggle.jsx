import React from 'react';
import BinaryToggle from './BinaryToggle';

/**
 * Specialized toggle for [I IV V] ↔ [C F G] (used in F2, F4).
 * Props: { mode: 'degrees' | 'names', onToggle: (mode) => void }
 */
const DegreeNameToggle = ({ mode, onToggle }) => (
  <BinaryToggle
    label="תצוגה"
    options={[
      { value: 'degrees', label: 'I IV V' },
      { value: 'names', label: 'C F G' }
    ]}
    value={mode}
    onChange={onToggle}
  />
);

export default DegreeNameToggle;
