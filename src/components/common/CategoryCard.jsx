import React from 'react';
import { useTranslation } from 'react-i18next';
import './CategoryCard.css';

const CategoryCard = ({
  categoryId,
  icon,
  title,
  titleHebrew,
  description,
  numExercises,
  onEnter
}) => {
  const { t } = useTranslation();
  return (
    <div className="category-card">
      <div className="category-icon">{icon}</div>
      <div className="category-content">
        <h2 className="category-title">
          {icon} {title}
        </h2>
        {titleHebrew && titleHebrew !== title && (
          <h3 className="category-title-hebrew">{titleHebrew}</h3>
        )}
        <p className="category-description">{description}</p>
        <div className="category-info">
          {typeof numExercises === 'number'
            ? t('common.exercises', { count: numExercises })
            : numExercises}
        </div>
      </div>
      <button className="category-enter-btn" onClick={onEnter}>
        {t('earTraining.enterCategory')}
      </button>
    </div>
  );
};

export default CategoryCard;
