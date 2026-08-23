import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ExerciseCard from '../../home/ExerciseCard';
import { TargetIcon, BoltClassicIcon } from '../../icons/AppIcons';
import '../../category/CategoryScreen.css';

const ReactiveSubScreen = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const exercises = [
    {
      id: 'R1',
      icon: <TargetIcon />,
      path: '/exercise/R1',
    },
    {
      id: 'R2',
      icon: <BoltClassicIcon />,
      path: '/exercise/R2',
    },
  ];

  return (
    <div className="category-screen">
      <header className="category-screen-header">
        <button className="back-button" onClick={() => navigate('/category/ear-training')}>
          {t('categories.backToEarTraining')}
        </button>
        <div className="category-screen-title-container">
          <h1 className="category-screen-title">{t('categories.reactive')} (R)</h1>
          <p style={{ color: '#666', marginTop: 8, fontSize: 14, maxWidth: 640 }}>
            {t('earTraining.reactiveMethod')}
          </p>
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

export default ReactiveSubScreen;
