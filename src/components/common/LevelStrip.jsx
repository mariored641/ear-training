import React from 'react';
import './LevelStrip.css';

/**
 * Horizontal strip of difficulty/preset chips.
 * The last chip is conventionally the "Custom" entry, which opens the
 * exercise's settings panel; selecting any other chip loads its preset.
 *
 * Props:
 *   levels    [{id, label}]   ordered list of chips
 *   activeId  string          currently selected chip id
 *   onChange  (id) => void    called when the user picks a chip
 *   disabled  boolean         visually locked (e.g. session active)
 */
const LevelStrip = ({ levels, activeId, onChange, disabled = false }) => {
  return (
    <div className="level-strip" role="tablist">
      {levels.map((level) => {
        const isActive = activeId === level.id;
        const isCustom = level.id === 'custom';
        const cls = [
          'level-strip-btn',
          isActive ? 'active' : '',
          isCustom ? 'custom' : '',
        ].filter(Boolean).join(' ');
        return (
          <button
            key={level.id}
            role="tab"
            aria-selected={isActive}
            className={cls}
            onClick={() => !disabled && onChange(level.id)}
            disabled={disabled}
            type="button"
          >
            {isCustom && <span className="level-strip-icon" aria-hidden="true">⚙</span>}
            <span className="level-strip-label">{level.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default LevelStrip;
