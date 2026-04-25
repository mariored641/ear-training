import React from 'react';
import { useNavigate } from 'react-router-dom';
import ExerciseCard from '../../home/ExerciseCard';
import '../../category/CategoryScreen.css';

const VoiceLeadingSubScreen = () => {
  const navigate = useNavigate();

  const exercises = [
    { id: 'V1', icon: '🎻', title: 'V1 — עקיבת קו בס', path: '/exercise/V1' },
    { id: 'V2', icon: '🎤', title: 'V2 — עקיבת קו סופרן', path: '/exercise/V2' }
  ];

  return (
    <div className="category-screen">
      <header className="category-screen-header">
        <button className="back-button" onClick={() => navigate('/category/ear-training')}>
          ← חזרה לשמיעה מוזיקלית
        </button>
        <div className="category-screen-title-container">
          <h1 className="category-screen-title">Voice Leading (V)</h1>
          <h2 className="category-screen-title-hebrew">תנועת קול</h2>
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

export default VoiceLeadingSubScreen;
