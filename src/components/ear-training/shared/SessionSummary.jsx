import React from 'react';
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
  title = 'סיכום',
  levelLabel
}) => {
  const pct = total > 0 ? Math.round((firstTry / total) * 100) : 0;
  return (
    <div className="et-summary">
      <h2 className="et-summary-title">{title}</h2>
      {levelLabel && <div className="et-summary-level">{levelLabel}</div>}
      <div className="et-summary-stats">
        <div className="et-summary-stat">
          <div className="et-summary-stat-num">{total}</div>
          <div className="et-summary-stat-label">שאלות</div>
        </div>
        <div className="et-summary-stat">
          <div className="et-summary-stat-num">{firstTry}</div>
          <div className="et-summary-stat-label">מהפעם הראשונה</div>
        </div>
        <div className="et-summary-stat">
          <div className="et-summary-stat-num">{pct}%</div>
          <div className="et-summary-stat-label">דיוק</div>
        </div>
      </div>
      <div className="et-summary-actions">
        <button className="et-summary-btn et-summary-btn-primary" onClick={onRetry}>
          🔄 סיבוב נוסף
        </button>
        <button className="et-summary-btn" onClick={onBack}>
          ← חזרה לתפריט
        </button>
      </div>
    </div>
  );
};

export default SessionSummary;
