import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  return (
    <div className="exercise-card">
      <div className="exercise-card-header">
        <h2 className="exercise-title">
          {icon} {title}
        </h2>
        {titleHebrew && titleHebrew !== title && (
          <h3 className="exercise-title-hebrew">{titleHebrew}</h3>
        )}
      </div>

      <p className="exercise-description">{description}</p>

      {pedagogicalGoals && pedagogicalGoals.length > 0 && (
        <div className="exercise-section">
          <h4 className="exercise-section-title">{t('legacy.pedagogicalGoals')}:</h4>
          <ul className="exercise-list">
            {pedagogicalGoals.map((goal, index) => (
              <li key={index}>{goal}</li>
            ))}
          </ul>
        </div>
      )}

      {practiceMethods && practiceMethods.length > 0 && (
        <div className="exercise-section">
          <h4 className="exercise-section-title">{t('legacy.practiceMethods')}:</h4>
          <ul className="exercise-list">
            {practiceMethods.map((method, index) => (
              <li key={index}>{method}</li>
            ))}
          </ul>
        </div>
      )}

      <button className="exercise-start-btn" onClick={onStart}>
        {t('legacy.startPractice')}
      </button>
    </div>
  );
};

export default ExerciseCard;
