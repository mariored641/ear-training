import React from 'react';
import { useNavigate } from 'react-router-dom';
import ExerciseCard from '../../home/ExerciseCard';
import '../../category/CategoryScreen.css';

const SolfegeSubScreen = () => {
  const navigate = useNavigate();

  const exercises = [
    { id: 'S1', icon: '🎼', title: 'S1 — שירה מתוך תווים', path: '/exercise/S1' },
    { id: 'S2', icon: '👁️', title: 'S2 — זיהוי תיווי מנגינה', path: '/exercise/S2' }
  ];

  return (
    <div className="category-screen">
      <header className="category-screen-header">
        <button className="back-button" onClick={() => navigate('/category/ear-training')}>
          ← חזרה לשמיעה מוזיקלית
        </button>
        <div className="category-screen-title-container">
          <h1 className="category-screen-title">Solfège (S)</h1>
          <h2 className="category-screen-title-hebrew">סולפז'</h2>
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

export default SolfegeSubScreen;
