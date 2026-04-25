import React from 'react';
import { useNavigate } from 'react-router-dom';
import ExerciseCard from '../../home/ExerciseCard';
import '../../category/CategoryScreen.css';

const MelodicSubScreen = () => {
  const navigate = useNavigate();

  const exercises = [
    { id: 'M1', icon: '🎯', title: 'M1 — זיהוי דרגה מלודית', path: '/exercise/M1' },
    { id: 'M2', icon: '↗️', title: 'M2 — כיוון תנועה מלודית', path: '/exercise/M2' },
    { id: 'M3', icon: '🎼', title: 'M3 — זיהוי סולם', path: '/exercise/M3' }
  ];

  return (
    <div className="category-screen">
      <header className="category-screen-header">
        <button className="back-button" onClick={() => navigate('/category/ear-training')}>
          ← חזרה לשמיעה מוזיקלית
        </button>
        <div className="category-screen-title-container">
          <h1 className="category-screen-title">Melody (M)</h1>
          <h2 className="category-screen-title-hebrew">מלודיה</h2>
        </div>
      </header>

      <div className="category-screen-content">
        {exercises.map(ex => (
          <ExerciseCard
            key={ex.id}
            exerciseId={ex.id}
            path={ex.path}
            icon={ex.icon}
            title={ex.title}
            isAvailable={true}
          />
        ))}
      </div>
    </div>
  );
};

export default MelodicSubScreen;
