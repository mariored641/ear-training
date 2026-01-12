import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ExerciseCard.css';

/**
 * Exercise card component for home page and category screens
 * @param {Object} props
 * @param {number|string} props.exerciseId - Exercise ID (1, 2, 4, '4a', '4b', '4c')
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
      // Handle both numeric IDs (1, 2, 4) and string IDs ('4a', '4b', '4c')
      const path = typeof exerciseId === 'string' && exerciseId.includes('4')
        ? `/exercise/${exerciseId}`
        : `/exercise${exerciseId}`;
      navigate(path);
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
