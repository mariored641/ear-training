import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './SummaryScreen.css';

/**
 * Summary screen component
 * @param {Object} props
 * @param {number} props.totalQuestions - Total questions completed
 * @param {number} props.correctFirstTry - Questions correct on first try
 * @param {Function} props.onRestart - Restart handler
 * @param {string} props.itemName - Name of items (e.g., 'questions', 'melodies', 'notes')
 * @param {string} props.category - Optional category path (e.g., 'melodic', 'harmonic')
 */
const SummaryScreen = ({
  totalQuestions,
  correctFirstTry,
  onRestart,
  itemName = 'questions',
  category = null
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const neededMoreAttempts = totalQuestions - correctFirstTry;

  return (
    <div className="summary-screen">
      <div className="summary-card">
        <h2 className="summary-title">{t('common.completed')}</h2>

        <div className="summary-stats">
          <p className="summary-stat">
            {t('common.completedItems', { count: totalQuestions, item: itemName })}
          </p>
          <p className="summary-stat success">
            {t('common.correctFirstTry', { count: correctFirstTry })}
          </p>
          <p className="summary-stat">
            {t('common.additionalAttempts', { count: neededMoreAttempts })}
          </p>
        </div>

        <div className="summary-actions">
          <button className="summary-button primary" onClick={onRestart}>
            {t('common.practiceAgain')}
          </button>
          {category && (
            <button
              className="summary-button secondary"
              onClick={() => navigate(`/category/${category}`)}
            >
              {t('common.backCategory')}
            </button>
          )}
          <button
            className="summary-button secondary"
            onClick={() => navigate('/')}
          >
            {t('common.backHome')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SummaryScreen;
