import React from 'react';
import { useNavigate } from 'react-router-dom';
import CategoryCard from '../../common/CategoryCard';
import {
  QuarterNoteIcon,
  PianoOctaveIcon,
  HubRomanIcon,
  VoicesCrossIcon,
  SingerStaffIcon,
  GuitarPickIcon,
  BoltAuraIcon,
} from '../../icons/AppIcons';
import './EarTrainingHub.css';

const EarTrainingHub = () => {
  const navigate = useNavigate();

  const subCategories = [
    {
      id: 'melodic',
      icon: <QuarterNoteIcon />,
      title: 'Melody',
      titleHebrew: 'מלודיה',
      description: 'זיהוי דרגות, כיוון תנועה וסולמות',
      numExercises: 3,
      route: '/category/ear-training/melodic'
    },
    {
      id: 'harmonic-isolated',
      icon: <PianoOctaveIcon />,
      title: 'Isolated Harmony',
      titleHebrew: 'הרמוניה מבודדת',
      description: 'אופי אקורד, היפוך, סוג וטנשנים',
      numExercises: 4,
      route: '/category/ear-training/harmonic-isolated'
    },
    {
      id: 'functional',
      icon: <HubRomanIcon />,
      title: 'Functional Harmony',
      titleHebrew: 'הרמוניה פונקציונלית',
      description: 'דרגות, קדנצות, מהלכים והכתבה',
      numExercises: 5,
      route: '/category/ear-training/functional'
    },
    {
      id: 'voice-leading',
      icon: <VoicesCrossIcon />,
      title: 'Voice Leading',
      titleHebrew: 'תנועת קול',
      description: 'עקיבה אחר קו בס וקו סופרן',
      numExercises: 2,
      route: '/category/ear-training/voice-leading'
    },
    {
      id: 'solfege',
      icon: <SingerStaffIcon />,
      title: 'Solfège',
      titleHebrew: 'סולפז\'',
      description: 'שירה מתווים וזיהוי תיווי',
      numExercises: 2,
      route: '/category/ear-training/solfege'
    },
    {
      id: 'guitar',
      icon: <GuitarPickIcon />,
      title: 'Guitar',
      titleHebrew: 'גיטרה',
      description: 'מיפוי צוואר ושמיעה צבעונית',
      numExercises: 1,
      route: '/category/ear-training/guitar'
    },
    {
      id: 'reactive',
      icon: <BoltAuraIcon />,
      title: 'Reactive',
      titleHebrew: 'שמיעה ריאקטיבית',
      description: 'בלי לחשוב, בלי לתייג — רק להגיב לאקורד',
      numExercises: 2,
      route: '/category/ear-training/reactive'
    }
  ];

  const handleBackToHome = () => navigate('/');

  return (
    <div className="et-hub-page">
      <header className="et-hub-header">
        <button onClick={handleBackToHome} className="et-hub-back-btn">
          ← Back to Home
        </button>
        <div className="et-hub-title-block">
          <h1 className="et-hub-title">שמיעה מוזיקלית</h1>
          <p className="et-hub-subtitle">Musical Ear Training — 19 Exercises Across 7 Sub-Categories</p>
        </div>
      </header>

      <div className="et-hub-grid">
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
