import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CategoryCard from '../common/CategoryCard';
import './HomePage.css';

const HomePage = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(true);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is already installed (running in standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                      window.navigator.standalone ||
                      document.referrer.includes('android-app://');

    setIsStandalone(standalone);
    setShowInstallButton(!standalone);

    // Listen for the beforeinstallprompt event
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // If no prompt available, show instructions
      alert('להתקנת האפליקציה:\n\n' +
            '1. לחץ על כפתור התפריט (⋮) בדפדפן\n' +
            '2. בחר "התקן אפליקציה" או "הוסף למסך הבית"\n' +
            '3. אשר את ההתקנה\n\n' +
            'או חפש אייקון ⊕ בשורת הכתובת');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowInstallButton(false);
    }

    setDeferredPrompt(null);
  };

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
        <div className="header-content">
          <div className="header-text">
            <h1 className="home-title">אלתור בהישג יד - האפליקציה</h1>
            <p className="home-subtitle">Ear Training Application</p>
          </div>
          {showInstallButton && (
            <button
              className="install-button"
              onClick={handleInstallClick}
              title="התקן את האפליקציה לשימוש אופליין"
            >
              💾 Download
            </button>
          )}
        </div>
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
