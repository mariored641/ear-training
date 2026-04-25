import React from 'react';
import { useNavigate } from 'react-router-dom';
import ExerciseCard from '../../home/ExerciseCard';
import '../../category/CategoryScreen.css';

const FunctionalSubScreen = () => {
  const navigate = useNavigate();

  const exercises = [
    { id: 'F0', icon: '🎯', title: 'F0 — דרגת אקורד בודד', path: '/exercise/F0' },
    { id: 'F1', icon: '🏁', title: 'F1 — זיהוי קדנצה', path: '/exercise/F1' },
    { id: 'F2', icon: '📝', title: 'F2 — הכתבה הרמונית', path: '/exercise/F2' },
    { id: 'F3', icon: '⏱️', title: 'F3 — ריתמוס הרמוני', path: '/exercise/F3' },
    { id: 'F4', icon: '🎼', title: 'F4 — מהלך מוכר', path: '/exercise/F4' }
  ];

  return (
    <div className="category-screen">
      <header className="category-screen-header">
        <button className="back-button" onClick={() => navigate('/category/ear-training')}>
          ← חזרה לשמיעה מוזיקלית
        </button>
        <div className="category-screen-title-container">
          <h1 className="category-screen-title">Functional Harmony (F)</h1>
          <h2 className="category-screen-title-hebrew">הרמוניה פונקציונלית</h2>
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

export default FunctionalSubScreen;
