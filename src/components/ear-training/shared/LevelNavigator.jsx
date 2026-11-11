import { readLastState, writeLastState } from '../../../utils/stateStore.js';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    if (isOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePick = (n) => {
    if (storageKey) {
      try { writeLastState(`levels.${storageKey}`, 1, { value: n }); } catch {}
    }
    onChange?.(n);
    onClose?.();
  };

  return (
    <div className="et-level-overlay" onClick={onClose}>
      <div className="et-level-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="et-level-drawer-header">
          <h3 className="et-level-drawer-title">{t('common.selectLevel')}</h3>
          <button className="et-level-drawer-close" onClick={onClose} aria-label={t('common.close')}>✕</button>
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
              {lvl.number === currentLevel && <span style={{ marginInlineStart: 'auto' }}>✓</span>}
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
    const legacy = parseInt(localStorage.getItem(storageKey), 10);
    const v = readLastState(`levels.${storageKey}`, 1, { value: Number.isFinite(legacy) ? legacy : fallback }).value;
    return Number.isFinite(v) && v > 0 ? v : fallback;
  } catch { return fallback; }
};

export default LevelNavigator;
