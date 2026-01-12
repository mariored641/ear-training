import React from 'react';
import { useNavigate } from 'react-router-dom';
import './SummaryScreen.css';

/**
 * Summary screen component
 * @param {Object} props
 * @param {number} props.totalQuestions - Total questions completed
 * @param {number} props.correctFirstTry - Questions correct on first try
 * @param {Function} props.onRestart - Restart handler
 * @param {string} props.itemName - Name of items (e.g., 'questions', 'melodies', 'notes')
 * @param {string} props.category - Optional category path (e.g., 'melodic', 'harmonic')
 */
const SummaryScreen = ({
  totalQuestions,
  correctFirstTry,
  onRestart,
  itemName = 'questions',
  category = null
}) => {
  const navigate = useNavigate();
  const neededMoreAttempts = totalQuestions - correctFirstTry;

  return (
    <div className="summary-screen">
      <div className="summary-card">
        <h2 className="summary-title">Completed! 🎉</h2>

        <div className="summary-stats">
          <p className="summary-stat">
            Completed {totalQuestions} {itemName}
          </p>
          <p className="summary-stat success">
            {correctFirstTry} correct on first try
          </p>
          <p className="summary-stat">
            {neededMoreAttempts} required additional attempts
          </p>
        </div>

        <div className="summary-actions">
          <button className="summary-button primary" onClick={onRestart}>
            Practice Again
          </button>
          {category && (
            <button
              className="summary-button secondary"
              onClick={() => navigate(`/category/${category}`)}
            >
              Back to Category
            </button>
          )}
          <button
            className="summary-button secondary"
            onClick={() => navigate('/')}
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default SummaryScreen;
