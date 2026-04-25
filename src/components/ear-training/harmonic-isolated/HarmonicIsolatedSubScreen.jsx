import React from 'react';
import { useNavigate } from 'react-router-dom';
import ExerciseCard from '../../home/ExerciseCard';
import '../../category/CategoryScreen.css';

const HarmonicIsolatedSubScreen = () => {
  const navigate = useNavigate();

  const exercises = [
    { id: 'H1', icon: '🎹', title: 'H1 — אופי אקורד', path: '/exercise/H1' },
    { id: 'H2', icon: '🔄', title: 'H2 — היפוך אקורד', path: '/exercise/H2' },
    { id: 'H3', icon: '🎶', title: 'H3 — סוג אקורד', path: '/exercise/H3' },
    { id: 'H4', icon: '🎷', title: 'H4 — טנשנים (ג\'אז)', path: '/exercise/H4' }
  ];

  return (
    <div className="category-screen">
      <header className="category-screen-header">
        <button className="back-button" onClick={() => navigate('/category/ear-training')}>
          ← חזרה לשמיעה מוזיקלית
        </button>
        <div className="category-screen-title-container">
          <h1 className="category-screen-title">Isolated Harmony (H)</h1>
          <h2 className="category-screen-title-hebrew">הרמוניה מבודדת</h2>
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

export default HarmonicIsolatedSubScreen;
