import React from 'react';
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
  return (
    <div className="category-card">
      <div className="category-icon">{icon}</div>
      <div className="category-content">
        <h2 className="category-title">
          {icon} {title}
        </h2>
        <h3 className="category-title-hebrew">{titleHebrew}</h3>
        <p className="category-description">{description}</p>
        <div className="category-info">
          {typeof numExercises === 'number'
            ? `${numExercises} Exercises`
            : numExercises}
        </div>
      </div>
      <button className="category-enter-btn" onClick={onEnter}>
        Enter Category
      </button>
    </div>
  );
};

export default CategoryCard;
