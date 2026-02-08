import React from 'react';
import { useNavigate } from 'react-router-dom';
import CategoryCard from '../common/CategoryCard';
import './HomePage.css';

const HomePage = () => {
  const navigate = useNavigate();

  const categories = [
    {
      id: 'melodic',
      icon: '🎵',
      title: 'Melodic Ear Training',
      titleHebrew: 'חטיבת שמיעה מלודית',
      description: 'Develop relative pitch and fretboard mapping skills',
      numExercises: 2
    },
    {
      id: 'harmonic',
      icon: '🎹',
      title: 'Harmonic Ear Training',
      titleHebrew: 'חטיבת שמיעה הרמונית',
      description: 'Develop chord recognition and harmonic hearing',
      numExercises: 3
    },
    {
      id: 'rhythm',
      icon: '🥁',
      title: 'Rhythm Training',
      titleHebrew: 'חטיבת קצב',
      description: 'Develop rhythmic reading and recognition skills',
      numExercises: 'Active'
    },
    {
      id: 'positions',
      icon: '🎸',
      title: 'Scale Positions',
      titleHebrew: 'חטיבת פוזיציות',
      description: 'CAGED system positions for any scale on the fretboard',
      numExercises: 'Active'
    }
  ];

  const handleEnterCategory = (categoryId) => {
    if (categoryId === 'rhythm') {
      // Rhythm goes directly to the exercise (no category screen)
      navigate('/exercise/4');
    } else if (categoryId === 'positions') {
      // Positions goes directly to the positions page
      navigate('/positions');
    } else {
      // Other categories go to their category screens
      navigate(`/category/${categoryId}`);
    }
  };

  return (
    <div className="home-page">
      <header className="home-header">
        <h1 className="home-title">אלתור בהישג יד - האפליקציה</h1>
        <p className="home-subtitle">Ear Training Application</p>
      </header>

      <div className="home-content">
        {categories.map(category => (
          <CategoryCard
            key={category.id}
            categoryId={category.id}
            icon={category.icon}
            title={category.title}
            titleHebrew={category.titleHebrew}
            description={category.description}
            numExercises={category.numExercises}
            onEnter={() => handleEnterCategory(category.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default HomePage;
