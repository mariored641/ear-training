import React from 'react';
import './earTrainingShared.css';

/**
 * Toggleable chips. Always at least `minActive` chips remain active.
 * Props:
 *   items: [{ id, label }]
 *   activeIds: string[]
 *   onToggle: (id) => void
 *   minActive?: number (default 2)
 */
const ChipSelector = ({ items, activeIds, onToggle, minActive = 2 }) => {
  const handle = (id) => {
    const isActive = activeIds.includes(id);
    if (isActive && activeIds.length <= minActive) return;
    onToggle?.(id);
  };
  return (
    <div className="et-chips">
      {items.map(({ id, label }) => {
        const active = activeIds.includes(id);
        return (
          <button
            key={id}
            className={`et-chip ${active ? 'active' : ''}`}
            onClick={() => handle(id)}
            aria-pressed={active}
          >
            {label} {active ? '✓' : ''}
          </button>
        );
      })}
    </div>
  );
};

export default ChipSelector;
