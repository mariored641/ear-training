import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import './QuickReferencePopup.css';

const QuickReferencePopup = ({ onClose }) => {
  const { t } = useTranslation();
  const overlayRef = useRef(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  return (
    <div className="quick-ref-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="quick-ref-modal">
        <div className="quick-ref-header">
          <h3>{t('positions.quickRef.title')}</h3>
          <button className="quick-ref-close" onClick={onClose} aria-label={t('common.close')}>&times;</button>
        </div>

        <div className="quick-ref-content">
          <table className="quick-ref-table">
            <thead>
              <tr>
                <th>{t('positions.quickRef.position')}</th>
                <th>{t('positions.quickRef.rootString')}</th>
                <th>{t('positions.quickRef.shape')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="position-cell">C</td>
                <td>5 (A)</td>
                <td>{t('positions.quickRef.openC')}</td>
              </tr>
              <tr>
                <td className="position-cell">A</td>
                <td>5 (A)</td>
                <td>{t('positions.quickRef.barre')}</td>
              </tr>
              <tr>
                <td className="position-cell">G</td>
                <td>6 (E)</td>
                <td>{t('positions.quickRef.openG')}</td>
              </tr>
              <tr>
                <td className="position-cell">E</td>
                <td>6 (E)</td>
                <td>{t('positions.quickRef.openE')}</td>
              </tr>
              <tr>
                <td className="position-cell">D</td>
                <td>4 (D)</td>
                <td>{t('positions.quickRef.openD')}</td>
              </tr>
            </tbody>
          </table>

          <div className="quick-ref-note">
            <div className="color-legend">
              <div className="legend-item">
                <span className="legend-dot major-dot"></span>
                <span>{t('positions.quickRef.majorRoot')}</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot minor-dot"></span>
                <span>{t('positions.quickRef.minorRoot')}</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot scale-dot"></span>
                <span>{t('positions.quickRef.scaleTone')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickReferencePopup;
