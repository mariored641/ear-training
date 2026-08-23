import React from 'react';
import { useTranslation } from 'react-i18next';
import BinaryToggle from './BinaryToggle';

/**
 * Specialized toggle for [I IV V] ↔ [C F G] (used in F2, F4).
 * Props: { mode: 'degrees' | 'names', onToggle: (mode) => void }
 */
const DegreeNameToggle = ({ mode, onToggle }) => {
  const { t } = useTranslation();
  return (
    <BinaryToggle
      label={t('common.display')}
      options={[
        { value: 'degrees', label: 'I IV V' },
        { value: 'names', label: 'C F G' }
      ]}
      value={mode}
      onChange={onToggle}
    />
  );
};

export default DegreeNameToggle;
