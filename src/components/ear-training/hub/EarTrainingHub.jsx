import React from 'react';
import { useNavigate } from 'react-router-dom';
import CategoryCard from '../../common/CategoryCard';
import '../../home/HomePage.css';

const EarTrainingHub = () => {
  const navigate = useNavigate();

  const subCategories = [
    {
      id: 'melodic',
      icon: '🎵',
      title: 'Melody',
      titleHebrew: 'מלודיה',
      description: 'זיהוי דרגות, כיוון תנועה וסולמות',
      numExercises: 3,
      route: '/category/ear-training/melodic'
    },
    {
      id: 'harmonic-isolated',
      icon: '🎹',
      title: 'Isolated Harmony',
      titleHebrew: 'הרמוניה מבודדת',
      description: 'אופי אקורד, היפוך, סוג וטנשנים',
      numExercises: 4,
      route: '/category/ear-training/harmonic-isolated'
    },
    {
      id: 'functional',
      icon: '🎼',
      title: 'Functional Harmony',
      titleHebrew: 'הרמוניה פונקציונלית',
      description: 'דרגות, קדנצות, מהלכים והכתבה',
      numExercises: 5,
      route: '/category/ear-training/functional'
    },
    {
      id: 'voice-leading',
      icon: '🎶',
      title: 'Voice Leading',
      titleHebrew: 'תנועת קול',
      description: 'עקיבה אחר קו בס וקו סופרן',
      numExercises: 2,
      route: '/category/ear-training/voice-leading'
    },
    {
      id: 'solfege',
      icon: '🎤',
      title: 'Solfège',
      titleHebrew: 'סולפז\'',
      description: 'שירה מתווים וזיהוי תיווי',
      numExercises: 2,
      route: '/category/ear-training/solfege'
    },
    {
      id: 'guitar',
      icon: '🎸',
      title: 'Guitar',
      titleHebrew: 'גיטרה',
      description: 'מיפוי צוואר ושמיעה צבעונית',
      numExercises: 1,
      route: '/category/ear-training/guitar'
    }
  ];

  const handleBackToHome = () => navigate('/');

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="header-content">
          <div className="header-text">
            <button
              onClick={handleBackToHome}
              style={{
                alignSelf: 'flex-start',
                padding: '10px 20px',
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--color-primary)',
                background: 'white',
                border: '2px solid var(--color-primary)',
                borderRadius: 10,
                cursor: 'pointer',
                marginBottom: 16
              }}
            >
              ← Back to Home
            </button>
            <h1 className="home-title">שמיעה מוזיקלית</h1>
            <p className="home-subtitle">Musical Ear Training — 17 Exercises Across 6 Sub-Categories</p>
          </div>
        </div>
      </header>

      <div className="home-content">
        {subCategories.map(cat => (
          <CategoryCard
            key={cat.id}
            categoryId={cat.id}
            icon={cat.icon}
            title={cat.title}
            titleHebrew={cat.titleHebrew}
            description={cat.description}
            numExercises={cat.numExercises}
            onEnter={() => navigate(cat.route)}
          />
        ))}
      </div>
    </div>
  );
};

export default EarTrainingHub;
