import React from 'react';
import { useTranslation } from 'react-i18next';
import './earTrainingShared.css';

/**
 * End-of-session summary screen.
 * Props: { total, firstTry, onRetry, onBack, title?, levelLabel? }
 */
const SessionSummary = ({
  total,
  firstTry,
  onRetry,
  onBack,
  title,
  levelLabel
}) => {
  const { t } = useTranslation();
  const pct = total > 0 ? Math.round((firstTry / total) * 100) : 0;
  return (
    <div className="et-summary">
      <h2 className="et-summary-title">{title || t('common.summary')}</h2>
      {levelLabel && <div className="et-summary-level">{levelLabel}</div>}
      <div className="et-summary-stats">
        <div className="et-summary-stat">
          <div className="et-summary-stat-num">{total}</div>
          <div className="et-summary-stat-label">{t('earTraining.summary.questions')}</div>
        </div>
        <div className="et-summary-stat">
          <div className="et-summary-stat-num">{firstTry}</div>
          <div className="et-summary-stat-label">{t('earTraining.summary.firstTry')}</div>
        </div>
        <div className="et-summary-stat">
          <div className="et-summary-stat-num">{pct}%</div>
          <div className="et-summary-stat-label">{t('earTraining.summary.accuracy')}</div>
        </div>
      </div>
      <div className="et-summary-actions">
        <button className="et-summary-btn et-summary-btn-primary" onClick={onRetry}>
          🔄 {t('common.anotherRound')}
        </button>
        <button className="et-summary-btn" onClick={onBack}>
          {t('common.backMenu')}
        </button>
      </div>
    </div>
  );
};

export default SessionSummary;
