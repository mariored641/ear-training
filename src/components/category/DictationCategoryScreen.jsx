import React from 'react';
import { useNavigate } from 'react-router-dom';
import ExerciseCard from '../home/ExerciseCard';
import './CategoryScreen.css';

const DictationCategoryScreen = () => {
  const navigate = useNavigate();

  const exercises = [
    {
      id: 'rhythm-dictation',
      path: '/rhythm-training',
      icon: '🎯',
      title: 'Rhythmic Dictation'
    },
    {
      id: 3,
      icon: '🎼',
      title: 'Melodic Dictation'
    }
  ];

  const handleBackToHome = () => {
    navigate('/');
  };

  return (
    <div className="category-screen">
      <header className="category-screen-header">
        <button className="back-button" onClick={handleBackToHome}>
          ← Back to Home
        </button>
        <div className="category-screen-title-container">
          <h1 className="category-screen-title">Dictation</h1>
          <h2 className="category-screen-title-hebrew">חטיבת הכתבה</h2>
        </div>
      </header>

      <div className="category-screen-content">
        {exercises.map(exercise => (
          <ExerciseCard
            key={exercise.id}
            exerciseId={exercise.id}
            path={exercise.path}
            icon={exercise.icon}
            title={exercise.title}
            isAvailable={true}
          />
        ))}
      </div>
    </div>
  );
};

export default DictationCategoryScreen;
