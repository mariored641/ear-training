import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ExerciseCard from '../../home/ExerciseCard';
import { SightSingingIcon, SheetReadingIcon } from '../../icons/AppIcons';
import '../../category/CategoryScreen.css';

const SolfegeSubScreen = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const exercises = [
    { id: 'S1', icon: <SightSingingIcon />, path: '/exercise/S1' },
    { id: 'S2', icon: <SheetReadingIcon />, path: '/exercise/S2' }
  ];

  return (
    <div className="category-screen">
      <header className="category-screen-header">
        <button className="back-button" onClick={() => navigate('/category/ear-training')}>
          {t('categories.backToEarTraining')}
        </button>
        <div className="category-screen-title-container">
          <h1 className="category-screen-title">{t('categories.solfege')} (S)</h1>
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

export default SolfegeSubScreen;
