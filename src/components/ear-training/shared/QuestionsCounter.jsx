import React from 'react';
import { useTranslation } from 'react-i18next';
import './earTrainingShared.css';

/**
 * Compact [-] N [+] counter.
 * Props: { value, onChange, min=3, max=30, label='שאלות' }
 */
const QuestionsCounter = ({ value, onChange, min = 3, max = 30, label }) => {
  const { t } = useTranslation();
  const displayLabel = label || t('common.questions');
  const clamp = (n) => Math.max(min, Math.min(max, n));
  return (
    <div className="et-counter" aria-label={displayLabel}>
      <span className="et-counter-label">{displayLabel}:</span>
      <button
        type="button"
        className="et-counter-btn"
        onClick={() => onChange?.(clamp(value - 1))}
        disabled={value <= min}
        aria-label={t('common.decrease')}
      >
        −
      </button>
      <span className="et-counter-value">{value}</span>
      <button
        type="button"
        className="et-counter-btn"
        onClick={() => onChange?.(clamp(value + 1))}
        disabled={value >= max}
        aria-label={t('common.increase')}
      >
        +
      </button>
    </div>
  );
};

export default QuestionsCounter;
