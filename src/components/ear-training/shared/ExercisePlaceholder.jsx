import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../category/CategoryScreen.css';

/**
 * Phase-1 placeholder for ear-training exercises.
 * Will be replaced by real exercise components in Phases 3 & 4.
 */
const ExercisePlaceholder = ({ id, title, titleHebrew, backTo, levelsCount }) => {
  const navigate = useNavigate();

  return (
    <div className="category-screen">
      <header className="category-screen-header">
        <button className="back-button" onClick={() => navigate(backTo)}>
          ← חזרה
        </button>
        <div className="category-screen-title-container">
          <h1 className="category-screen-title">
            {id} — {title}
          </h1>
          <h2 className="category-screen-title-hebrew">{titleHebrew}</h2>
        </div>
      </header>

      <div
        className="category-screen-content"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          padding: '64px 24px',
          textAlign: 'center'
        }}
      >
        <div style={{ fontSize: 64 }}>🚧</div>
        <h2 style={{ color: 'var(--color-text)', margin: 0 }}>בקרוב</h2>
        <p style={{ color: 'var(--color-text-secondary)', maxWidth: 480, lineHeight: 1.6 }}>
          התרגיל הזה יבָּנה בפאזה הבאה של פיתוח חטיבת שמיעה מוזיקלית.
          {levelsCount && (
            <>
              <br />
              <strong>שלבים מתוכננים:</strong> {levelsCount}
            </>
          )}
        </p>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
          (ניווט בלבד — Phase 1)
        </p>
      </div>
    </div>
  );
};

export default ExercisePlaceholder;
