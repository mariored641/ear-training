import React from 'react';
import ExerciseCard from './ExerciseCard';
import './HomePage.css';

const HomePage = () => {
  const exercises = [
    {
      id: 1,
      title: 'Interval Recognition',
      icon: '🎵',
      isAvailable: true
    },
    {
      id: 2,
      title: 'Guitar Fretboard',
      icon: '🎸',
      isAvailable: true
    },
    {
      id: 3,
      title: 'Melody Creation',
      icon: '🎼',
      isAvailable: false
    },
    {
      id: 4,
      title: 'Rhythm Training',
      icon: '🥁',
      isAvailable: true
    }
  ];

  return (
    <div className="home-page">
      <header className="home-header">
        <h1 className="home-title">אלתור בהישג יד - האפליקציה</h1>
        <p className="home-subtitle">Ear Training Application</p>
      </header>

      <div className="home-content">
        {exercises.map(exercise => (
          <ExerciseCard
            key={exercise.id}
            exerciseId={exercise.id}
            title={exercise.title}
            icon={exercise.icon}
            isAvailable={exercise.isAvailable}
          />
        ))}
      </div>
    </div>
  );
};

export default HomePage;
