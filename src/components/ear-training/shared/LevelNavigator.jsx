import React, { useEffect } from 'react';
import './earTrainingShared.css';

/**
 * Drawer for selecting a level. Saves the selection to localStorage if storageKey provided.
 * Props:
 *   levels: [{ number, label }]
 *   currentLevel: number
 *   onChange: (number) => void
 *   onClose: () => void
 *   isOpen: bool
 *   storageKey?: string  (e.g. 'M1_currentLevel')
 */
const LevelNavigator = ({ levels, currentLevel, onChange, onClose, isOpen, storageKey }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    if (isOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePick = (n) => {
    if (storageKey) {
      try { localStorage.setItem(storageKey, String(n)); } catch {}
    }
    onChange?.(n);
    onClose?.();
  };

  return (
    <div className="et-level-overlay" onClick={onClose}>
      <div className="et-level-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="et-level-drawer-header">
          <h3 className="et-level-drawer-title">בחר שלב</h3>
          <button className="et-level-drawer-close" onClick={onClose} aria-label="סגור">✕</button>
        </div>
        <ul className="et-level-drawer-list">
          {levels.map((lvl) => (
            <li
              key={lvl.number}
              className={`et-level-drawer-item ${lvl.number === currentLevel ? 'active' : ''}`}
              onClick={() => handlePick(lvl.number)}
            >
              <span className="et-level-drawer-item-num">{lvl.number}</span>
              <span>{lvl.label}</span>
              {lvl.number === currentLevel && <span style={{ marginRight: 'auto' }}>✓</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export const loadStoredLevel = (storageKey, fallback = 1) => {
  if (!storageKey) return fallback;
  try {
    const v = parseInt(localStorage.getItem(storageKey), 10);
    return Number.isFinite(v) && v > 0 ? v : fallback;
  } catch { return fallback; }
};

export default LevelNavigator;
