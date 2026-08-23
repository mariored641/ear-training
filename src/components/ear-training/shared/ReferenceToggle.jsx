import React from 'react';
import { useTranslation } from 'react-i18next';
import BinaryToggle from './BinaryToggle';

/** [קדנצה][אקורד][תו][ללא] toggle. value: 'cadence' | 'chord' | 'note' | 'none' */
const ReferenceToggle = ({ value, onChange, label }) => {
  const { t } = useTranslation();
  return (
    <BinaryToggle
      label={label || t('common.reference')}
      options={[
        { value: 'cadence', label: t('common.cadence') },
        { value: 'chord', label: t('common.chord') },
        { value: 'note', label: t('common.note') },
        { value: 'none', label: t('common.none') }
      ]}
      value={value}
      onChange={onChange}
    />
  );
};

export default ReferenceToggle;
