import React from 'react';
import BinaryToggle from './BinaryToggle';

/** [קדנצה][אקורד][תו] toggle. value: 'cadence' | 'chord' | 'note' */
const ReferenceToggle = ({ value, onChange, label = 'רפרנס' }) => (
  <BinaryToggle
    label={label}
    options={[
      { value: 'cadence', label: 'קדנצה' },
      { value: 'chord', label: 'אקורד' },
      { value: 'note', label: 'תו' }
    ]}
    value={value}
    onChange={onChange}
  />
);

export default ReferenceToggle;
