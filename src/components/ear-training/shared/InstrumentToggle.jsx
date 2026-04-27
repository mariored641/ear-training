import React from 'react';
import BinaryToggle from './BinaryToggle';

/** [פסנתר][גיטרה] toggle. value: 'piano' | 'guitar' */
const InstrumentToggle = ({ value, onChange, label = 'כלי' }) => (
  <BinaryToggle
    label={label}
    options={[
      { value: 'piano', label: 'פסנתר' },
      { value: 'guitar', label: 'גיטרה' }
    ]}
    value={value}
    onChange={onChange}
  />
);

export default InstrumentToggle;
