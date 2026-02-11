import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CategoryCard from '../common/CategoryCard';
import './HomePage.css';

const HomePage = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(true);

  useEffect(() => {
    // Check if app is already installed (running in standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                      window.navigator.standalone;

    if (standalone) {
      setShowInstallButton(false);
      return;
    }

    // Check if we already caught the event globally (in main.jsx)
    if (window.__pwaInstallPrompt) {
      setDeferredPrompt(window.__pwaInstallPrompt);
      console.log('✅ Found global install prompt');
    }

    // Also listen for future events
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      window.__pwaInstallPrompt = e;
      console.log('✅ Install prompt captured');
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listen for successful installation
    const installHandler = () => {
      setShowInstallButton(false);
      setDeferredPrompt(null);
      window.__pwaInstallPrompt = null;
      console.log('✅ App installed successfully');
    };

    window.addEventListener('appinstalled', installHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installHandler);
    };
  }, []);

  const handleInstallClick = () => {
    const prompt = deferredPrompt || window.__pwaInstallPrompt;

    if (prompt) {
      prompt.prompt();
      prompt.userChoice.then(({ outcome }) => {
        console.log(`User choice: ${outcome}`);
        if (outcome === 'accepted') {
          setShowInstallButton(false);
        }
        setDeferredPrompt(null);
        window.__pwaInstallPrompt = null;
      });
    } else {
      // Better fallback
      const isChrome = /Chrome/.test(navigator.userAgent) && !/Edge/.test(navigator.userAgent);
      const isEdge = /Edg/.test(navigator.userAgent);

      if (isChrome || isEdge) {
        alert('חפש את אייקון ההתקנה ⊕ בצד ימין של שורת הכתובת בדפדפן');
      } else {
        alert('להתקנה: פתח את תפריט הדפדפן ובחר "הוסף למסך הבית"');
      }
    }
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
