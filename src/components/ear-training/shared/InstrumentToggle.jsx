import React from 'react';
import { useTranslation } from 'react-i18next';
import BinaryToggle from './BinaryToggle';

/** [פסנתר][גיטרה] toggle. value: 'piano' | 'guitar' */
const InstrumentToggle = ({ value, onChange, label }) => {
  const { t } = useTranslation();
  return (
    <BinaryToggle
      label={label || t('common.instrument')}
      options={[
        { value: 'piano', label: t('common.piano') },
        { value: 'guitar', label: t('common.guitar') }
      ]}
      value={value}
      onChange={onChange}
    />
  );
};

export default InstrumentToggle;
