import React from 'react';
import { useTranslation } from 'react-i18next';
import BinaryToggle from './BinaryToggle';

/** [4/4][3/4][6/8] meter toggle. value: '4/4' | '3/4' | '6/8' */
const MeterToggle = ({ value = '4/4', onChange, label }) => {
  const { t } = useTranslation();
  return (
    <BinaryToggle
      label={label || t('common.meter')}
      options={[
        { value: '4/4', label: '4/4' },
        { value: '3/4', label: '3/4' },
        { value: '6/8', label: '6/8' }
      ]}
      value={value}
      onChange={onChange}
    />
  );
};

export default MeterToggle;
