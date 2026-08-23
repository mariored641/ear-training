import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ExerciseCard from '../home/ExerciseCard';
import './CategoryScreen.css';

const MelodicCategoryScreen = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const exercises = [
    {
      id: 1,
      icon: '🎵',
      titleKey: 'legacy.intervalRecognition'
    },
    {
      id: 2,
      icon: '🎸',
      titleKey: 'legacy.fretboardMapping'
    }
  ];

  const handleBackToHome = () => {
    navigate('/');
  };

  return (
    <div className="category-screen">
      <header className="category-screen-header">
        <button className="back-button" onClick={handleBackToHome}>
          {t('common.backHome')}
        </button>
        <div className="category-screen-title-container">
          <h1 className="category-screen-title">{t('categories.melodicLegacy')}</h1>
        </div>
      </header>

      <div className="category-screen-content">
        {exercises.map(exercise => (
          <ExerciseCard
            key={exercise.id}
            exerciseId={exercise.id}
            icon={exercise.icon}
            title={t(exercise.titleKey)}
            isAvailable={true}
          />
        ))}
      </div>
    </div>
  );
};

export default MelodicCategoryScreen;
