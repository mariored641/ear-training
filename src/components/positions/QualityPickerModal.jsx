import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CHORD_QUALITIES, QUALITY_FAMILIES } from '../../utils/partialChordShapes';
import './QualityPickerModal.css';

function QualityPickerModal({ value, onSelect, onClose }) {
  const { t } = useTranslation();
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const byFamily = QUALITY_FAMILIES.map((fam) => ({
    ...fam,
    items: Object.entries(CHORD_QUALITIES)
      .filter(([, q]) => q.family === fam.id)
      .map(([id, q]) => ({ id, ...q })),
  }));

  return (
    <div className="qpm-overlay" onClick={onClose}>
      <div className="qpm-content" onClick={(e) => e.stopPropagation()}>
        <div className="qpm-header">
          <span>{t('positions.pickQuality')}</span>
          <button className="qpm-close" onClick={onClose} aria-label={t('common.close')}>×</button>
        </div>

        {byFamily.map((fam) => (
          <div className="qpm-family" key={fam.id}>
            <div className="qpm-family-label">{t(`positions.qualityFamilies.${fam.id}`, { defaultValue: fam.label })}</div>
            <div className="qpm-grid">
              {fam.items.map(({ id, label, intervals }) => (
                <button
                  key={id}
                  className={`qpm-tile ${value === id ? 'active' : ''}`}
                  onClick={() => {
                    onSelect(id);
                    onClose();
                  }}
                  title={intervals.join(' · ')}
                >
                  <div className="qpm-tile-label">{label || 'Maj'}</div>
                  <div className="qpm-tile-intervals">{intervals.join(' · ')}</div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default QualityPickerModal;
