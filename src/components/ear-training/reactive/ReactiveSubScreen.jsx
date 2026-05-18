import React from 'react';
import { useNavigate } from 'react-router-dom';
import ExerciseCard from '../../home/ExerciseCard';
import '../../category/CategoryScreen.css';

const ReactiveSubScreen = () => {
  const navigate = useNavigate();

  const exercises = [
    {
      id: 'R1',
      icon: '🎯',
      title: 'R1 — דיאטוני',
      path: '/exercise/R1',
    },
    {
      id: 'R2',
      icon: '⚡',
      title: 'R2 — אקראי מלא',
      path: '/exercise/R2',
    },
  ];

  return (
    <div className="category-screen">
      <header className="category-screen-header">
        <button className="back-button" onClick={() => navigate('/category/ear-training')}>
          ← חזרה לשמיעה מוזיקלית
        </button>
        <div className="category-screen-title-container">
          <h1 className="category-screen-title">Reactive Ear Training (R)</h1>
          <h2 className="category-screen-title-hebrew">שמיעה ריאקטיבית</h2>
          <p style={{ color: '#666', marginTop: 8, fontSize: 14, maxWidth: 640 }}>
            השיטה: לא לזהות, לא לנתח. רק להגיב.
            האקורד מנוגן sustained, אתה מנסה תווים, מאזין אם הם מתאימים, ומתקן בריאקציה.
            המטרה — לבנות חיבור ישיר אוזן↔אצבע, מתחת לרמה האנליטית.
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
            title={ex.title}
            isAvailable={true}
          />
        ))}
      </div>
    </div>
  );
};

export default ReactiveSubScreen;
