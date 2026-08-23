import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatNoteName } from '../../../i18n/musicTerms';
import './earTrainingShared.css';

const KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

/** Cycle through 12 keys with [+]/[−]. value: 'C' | 'D' | ... */
const KeySelector = ({ value = 'C', onChange, label }) => {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const idx = Math.max(0, KEYS.indexOf(value));
  const next = () => onChange?.(KEYS[(idx + 1) % 12]);
  const prev = () => onChange?.(KEYS[(idx + 11) % 12]);
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 13, color: 'var(--color-text-secondary, #666)' }}>{label || t('common.key')}:</span>
      <div className="et-counter">
        <button className="et-counter-btn" onClick={prev} aria-label={t('common.previousKey')}>−</button>
        <span className="et-counter-value note-symbol" style={{ minWidth: 44 }}>{formatNoteName(value, language)}</span>
        <button className="et-counter-btn" onClick={next} aria-label={t('common.nextKey')}>+</button>
      </div>
    </div>
  );
};

export { KEYS };
export default KeySelector;
