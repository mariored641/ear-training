import React from 'react';
import { useNavigate } from 'react-router-dom';
import ExerciseCard from '../home/ExerciseCard';
import './CategoryScreen.css';

const MelodicCategoryScreen = () => {
  const navigate = useNavigate();

  const exercises = [
    {
      id: 1,
      icon: '🎵',
      title: 'Interval Recognition'
    },
    {
      id: 2,
      icon: '🎸',
      title: 'Fretboard Mapping'
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
          <h1 className="category-screen-title">Melodic Ear Training</h1>
          <h2 className="category-screen-title-hebrew">חטיבת שמיעה מלודית</h2>
        </div>
      </header>

      <div className="category-screen-content">
        {exercises.map(exercise => (
          <ExerciseCard
            key={exercise.id}
            exerciseId={exercise.id}
            icon={exercise.icon}
            title={exercise.title}
            isAvailable={true}
          />
        ))}
      </div>
    </div>
  );
};

export default MelodicCategoryScreen;
