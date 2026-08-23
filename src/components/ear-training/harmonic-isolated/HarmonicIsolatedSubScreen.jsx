import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ExerciseCard from '../../home/ExerciseCard';
import { ChordTriadIcon, ChordInversionIcon, Chord7Icon, ChordTensionsIcon } from '../../icons/AppIcons';
import '../../category/CategoryScreen.css';

const HarmonicIsolatedSubScreen = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const exercises = [
    { id: 'H1', icon: <ChordTriadIcon />, path: '/exercise/H1' },
    { id: 'H2', icon: <ChordInversionIcon />, path: '/exercise/H2' },
    { id: 'H3', icon: <Chord7Icon />, path: '/exercise/H3' },
    { id: 'H4', icon: <ChordTensionsIcon />, path: '/exercise/H4' }
  ];

  return (
    <div className="category-screen">
      <header className="category-screen-header">
        <button className="back-button" onClick={() => navigate('/category/ear-training')}>
          {t('categories.backToEarTraining')}
        </button>
        <div className="category-screen-title-container">
          <h1 className="category-screen-title">{t('categories.harmonicIsolated')} (H)</h1>
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

export default HarmonicIsolatedSubScreen;
