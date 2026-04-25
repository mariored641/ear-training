import React from 'react';
import './earTrainingShared.css';

/**
 * Visual flash on correct/wrong answer.
 * Props: { state: 'correct' | 'wrong' | null, message?: string }
 */
const FeedbackOverlay = ({ state, message }) => {
  if (!state) return null;
  const icon = state === 'correct' ? '✓' : '✗';
  return (
    <div className={`et-feedback ${state}`} role="status" aria-live="polite">
      <div className="et-feedback-icon">{icon}</div>
      {message && <div className="et-feedback-msg">{message}</div>}
    </div>
  );
};

export default FeedbackOverlay;
