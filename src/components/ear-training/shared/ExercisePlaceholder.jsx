import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../../category/CategoryScreen.css';

/**
 * Phase-1 placeholder for ear-training exercises.
 * Will be replaced by real exercise components in Phases 3 & 4.
 */
const ExercisePlaceholder = ({ id, title, titleHebrew, backTo, levelsCount }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="category-screen">
      <header className="category-screen-header">
        <button className="back-button" onClick={() => navigate(backTo)}>
          {t('common.back')}
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
        <h2 style={{ color: 'var(--color-text)', margin: 0 }}>{t('common.comingSoon')}</h2>
        <p style={{ color: 'var(--color-text-secondary)', maxWidth: 480, lineHeight: 1.6 }}>
          {t('earTraining.placeholder.body')}
          {levelsCount && (
            <>
              <br />
              <strong>{t('common.plannedLevels')}:</strong> {levelsCount}
            </>
          )}
        </p>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
          ({t('earTraining.placeholder.navigationOnly')})
        </p>
      </div>
    </div>
  );
};

export default ExercisePlaceholder;
