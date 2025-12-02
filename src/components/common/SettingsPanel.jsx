import React from 'react';
import './SettingsPanel.css';

/**
 * Generic sliding settings panel
 * @param {Object} props
 * @param {boolean} props.isOpen - Panel open state
 * @param {Function} props.onClose - Close handler
 * @param {string} props.title - Panel title
 * @param {React.ReactNode} props.children - Panel content
 */
const SettingsPanel = ({ isOpen, onClose, title = 'Settings', children }) => {
  return (
    <>
      {isOpen && <div className="settings-overlay" onClick={onClose} />}
      <div className={`settings-panel ${isOpen ? 'open' : ''}`}>
        <div className="settings-header">
          <h3 className="settings-title">{title}</h3>
          <button
            className="settings-close"
            onClick={onClose}
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>
        <div className="settings-content">{children}</div>
      </div>
    </>
  );
};

export default SettingsPanel;
