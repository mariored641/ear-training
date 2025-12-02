import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ExerciseCard.css';

/**
 * Exercise card component for home page
 * @param {Object} props
 * @param {number} props.exerciseId - Exercise ID (1, 2, or 3)
 * @param {string} props.title - Exercise title
 * @param {string} props.description - Exercise description
 * @param {Array<string>} props.pedagogicalGoals - Pedagogical goals
 * @param {Array<string>} props.practiceMethods - Practice methods
 * @param {boolean} props.isAvailable - Whether exercise is available
 */
const ExerciseCard = ({
  exerciseId,
  title,
  description,
  pedagogicalGoals,
  practiceMethods,
  isAvailable = true
}) => {
  const navigate = useNavigate();

  const handleStart = () => {
    if (isAvailable) {
      navigate(`/exercise${exerciseId}`);
    }
  };

  return (
    <div className="exercise-card">
      <h3 className="exercise-card-title">{title}</h3>

      <div className="exercise-card-section">
        <p className="exercise-card-description">{description}</p>
      </div>

      <div className="exercise-card-section">
        <h4 className="exercise-card-subtitle">Pedagogical Goals:</h4>
        <ul className="exercise-card-list">
          {pedagogicalGoals.map((goal, index) => (
            <li key={index}>{goal}</li>
          ))}
        </ul>
      </div>

      <div className="exercise-card-section">
        <h4 className="exercise-card-subtitle">Practice Methods:</h4>
        <ol className="exercise-card-list">
          {practiceMethods.map((method, index) => (
            <li key={index}>{method}</li>
          ))}
        </ol>
      </div>

      <button
        className={`exercise-card-button ${!isAvailable ? 'disabled' : ''}`}
        onClick={handleStart}
        disabled={!isAvailable}
      >
        {isAvailable ? 'Start Practice' : 'Coming Soon'}
      </button>
    </div>
  );
};

export default ExerciseCard;
