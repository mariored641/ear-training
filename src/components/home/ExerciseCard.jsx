import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ExerciseCard.css';

/**
 * Exercise card component for home page
 * @param {Object} props
 * @param {number} props.exerciseId - Exercise ID (1, 2, 3, or 4)
 * @param {string} props.title - Exercise title
 * @param {string} props.icon - Exercise icon (emoji)
 * @param {boolean} props.isAvailable - Whether exercise is available
 */
const ExerciseCard = ({
  exerciseId,
  title,
  icon,
  isAvailable = true
}) => {
  const navigate = useNavigate();

  const handleStart = () => {
    if (isAvailable) {
      navigate(`/exercise${exerciseId}`);
    }
  };

  return (
    <button
      className={`exercise-card ${!isAvailable ? 'disabled' : ''}`}
      onClick={handleStart}
      disabled={!isAvailable}
    >
      <div className="exercise-card-icon">{icon}</div>
      <h3 className="exercise-card-title">{title}</h3>
      {!isAvailable && <div className="exercise-card-badge">Coming Soon</div>}
    </button>
  );
};

export default ExerciseCard;
