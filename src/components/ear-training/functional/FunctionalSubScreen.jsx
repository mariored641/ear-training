import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ExerciseCard from '../../home/ExerciseCard';
import { DegreeRomanIcon, CadenceIcon, HarmonicDictationIcon, MetronomeIcon, ProgressionIcon } from '../../icons/AppIcons';
import '../../category/CategoryScreen.css';

const FunctionalSubScreen = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const exercises = [
    { id: 'F0', icon: <DegreeRomanIcon />, path: '/exercise/F0' },
    { id: 'F1', icon: <CadenceIcon />, path: '/exercise/F1' },
    { id: 'F2', icon: <HarmonicDictationIcon />, path: '/exercise/F2' },
    { id: 'F3', icon: <MetronomeIcon />, path: '/exercise/F3' },
    { id: 'F4', icon: <ProgressionIcon />, path: '/exercise/F4' }
  ];

  return (
    <div className="category-screen">
      <header className="category-screen-header">
        <button className="back-button" onClick={() => navigate('/category/ear-training')}>
          {t('categories.backToEarTraining')}
        </button>
        <div className="category-screen-title-container">
          <h1 className="category-screen-title">{t('categories.functional')} (F)</h1>
        </div>
      </header>

      <div className="category-screen-content">
        {exercises.map(ex => (
          <ExerciseCard
            key={ex.id}
            exerciseId={ex.id}
            path={ex.path}
            icon={ex.icon}
            title={`${ex.id} — ${t(`earTraining.exercises.${ex.id}`)}`}
            isAvailable={true}
          />
        ))}
      </div>
    </div>
  );
};

export default FunctionalSubScreen;
