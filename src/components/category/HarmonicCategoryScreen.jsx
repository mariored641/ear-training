import React from 'react';
import { useNavigate } from 'react-router-dom';
import ExerciseCard from '../home/ExerciseCard';
import './CategoryScreen.css';

const HarmonicCategoryScreen = () => {
  const navigate = useNavigate();

  const exercises = [
    {
      id: '4a',
      icon: '🎹',
      title: 'Single Chord Recognition'
    },
    {
      id: '4b',
      icon: '🎵',
      title: 'Chord Tone Melodies'
    },
    {
      id: '4c',
      icon: '🎸',
      title: 'Progressions with Bass'
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
          <h1 className="category-screen-title">Harmonic Ear Training</h1>
          <h2 className="category-screen-title-hebrew">חטיבת שמיעה הרמונית</h2>
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

export default HarmonicCategoryScreen;
