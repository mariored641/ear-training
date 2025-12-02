import React from 'react';
import './ProgressBar.css';

/**
 * Progress bar component
 * @param {Object} props
 * @param {number} props.current - Current progress value
 * @param {number} props.total - Total value
 * @param {boolean} props.showPercentage - Show percentage text
 */
const ProgressBar = ({ current, total, showPercentage = true }) => {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="progress-bar-container">
      <div className="progress-bar">
        <div
          className="progress-bar-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showPercentage && (
        <span className="progress-percentage">{percentage}%</span>
      )}
    </div>
  );
};

export default ProgressBar;
