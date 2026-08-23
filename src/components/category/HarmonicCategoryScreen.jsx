import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ExerciseCard from '../home/ExerciseCard';
import './CategoryScreen.css';

const HarmonicCategoryScreen = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const exercises = [
    {
      id: '4a',
      icon: '🎹',
      titleKey: 'legacy.singleChord'
    },
    {
      id: '4b',
      icon: '🎵',
      titleKey: 'legacy.chordToneMelodies'
    },
    {
      id: '4c',
      icon: '🎸',
      titleKey: 'legacy.progressionsBass'
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
          <h1 className="category-screen-title">{t('categories.harmonicLegacy')}</h1>
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

export default HarmonicCategoryScreen;
