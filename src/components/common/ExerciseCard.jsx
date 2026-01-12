import React from 'react';
import './ExerciseCard.css';

const ExerciseCard = ({
  exerciseId,
  icon,
  title,
  titleHebrew,
  description,
  pedagogicalGoals,
  practiceMethods,
  onStart
}) => {
  return (
    <div className="exercise-card">
      <div className="exercise-card-header">
        <h2 className="exercise-title">
          {icon} {title}
        </h2>
        <h3 className="exercise-title-hebrew">{titleHebrew}</h3>
      </div>

      <p className="exercise-description">{description}</p>

      {pedagogicalGoals && pedagogicalGoals.length > 0 && (
        <div className="exercise-section">
          <h4 className="exercise-section-title">Pedagogical Goals:</h4>
          <ul className="exercise-list">
            {pedagogicalGoals.map((goal, index) => (
              <li key={index}>{goal}</li>
            ))}
          </ul>
        </div>
      )}

      {practiceMethods && practiceMethods.length > 0 && (
        <div className="exercise-section">
          <h4 className="exercise-section-title">Practice Methods:</h4>
          <ul className="exercise-list">
            {practiceMethods.map((method, index) => (
              <li key={index}>{method}</li>
            ))}
          </ul>
        </div>
      )}

      <button className="exercise-start-btn" onClick={onStart}>
        Start Practice
      </button>
    </div>
  );
};

export default ExerciseCard;
