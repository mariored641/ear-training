import React, { useEffect, useRef } from 'react';
import './QuickReferencePopup.css';

const QuickReferencePopup = ({ onClose }) => {
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
          <h3>Position Quick Reference</h3>
          <button className="quick-ref-close" onClick={onClose}>&times;</button>
        </div>

        <div className="quick-ref-content">
          <table className="quick-ref-table">
            <thead>
              <tr>
                <th>Position</th>
                <th>Root String</th>
                <th>Shape</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="position-cell">C</td>
                <td>5 (A)</td>
                <td>Open C shape</td>
              </tr>
              <tr>
                <td className="position-cell">A</td>
                <td>5 (A)</td>
                <td>Barre chord shape</td>
              </tr>
              <tr>
                <td className="position-cell">G</td>
                <td>6 (E)</td>
                <td>Open G shape</td>
              </tr>
              <tr>
                <td className="position-cell">E</td>
                <td>6 (E)</td>
                <td>Open E shape</td>
              </tr>
              <tr>
                <td className="position-cell">D</td>
                <td>4 (D)</td>
                <td>Open D shape</td>
              </tr>
            </tbody>
          </table>

          <div className="quick-ref-note">
            <div className="color-legend">
              <div className="legend-item">
                <span className="legend-dot major-dot"></span>
                <span>Major root (red)</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot minor-dot"></span>
                <span>Minor root (blue)</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot scale-dot"></span>
                <span>Scale tone (gray)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickReferencePopup;
