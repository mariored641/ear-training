import React from 'react';
import './Header.css';

/**
 * Header component for exercises
 * @param {Object} props
 * @param {string} props.title - Title to display
 * @param {boolean} props.showSettings - Show settings button
 * @param {boolean} props.showStop - Show stop button
 * @param {number} props.currentQuestion - Current question number
 * @param {number} props.totalQuestions - Total number of questions
 * @param {Function} props.onSettingsClick - Settings click handler
 * @param {Function} props.onStopClick - Stop click handler
 */
const Header = ({
  title,
  showSettings = false,
  showStop = false,
  currentQuestion = null,
  totalQuestions = null,
  onSettingsClick,
  onStopClick
}) => {
  return (
    <div className="header">
      <div className="header-left">
        {showSettings && (
          <button
            className="header-button"
            onClick={onSettingsClick}
            aria-label="Settings"
          >
            ⚙️
          </button>
        )}
        {showStop && (
          <button
            className="header-button stop-button"
            onClick={onStopClick}
            aria-label="Stop"
          >
            ✕ Stop
          </button>
        )}
      </div>

      <div className="header-center">
        <h2 className="header-title">{title}</h2>
      </div>

      <div className="header-right">
        {currentQuestion !== null && totalQuestions !== null && (
          <span className="question-counter">
            Question {currentQuestion}/{totalQuestions}
          </span>
        )}
      </div>
    </div>
  );
};

export default Header;
