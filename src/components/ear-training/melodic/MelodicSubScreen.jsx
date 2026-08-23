import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ExerciseCard from '../../home/ExerciseCard';
import { TargetIcon, DirectionUpIcon, ScaleAscendingIcon } from '../../icons/AppIcons';
import '../../category/CategoryScreen.css';

const MelodicSubScreen = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const exercises = [
    { id: 'M1', icon: <TargetIcon />, path: '/exercise/M1' },
    { id: 'M2', icon: <DirectionUpIcon />, path: '/exercise/M2' },
    { id: 'M3', icon: <ScaleAscendingIcon />, path: '/exercise/M3' }
  ];

  return (
    <div className="category-screen">
      <header className="category-screen-header">
        <button className="back-button" onClick={() => navigate('/category/ear-training')}>
          {t('categories.backToEarTraining')}
        </button>
        <div className="category-screen-title-container">
          <h1 className="category-screen-title">{t('categories.melodic')} (M)</h1>
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

export default MelodicSubScreen;
