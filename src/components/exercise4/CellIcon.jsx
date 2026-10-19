import React from 'react';
import { CELL_STATES } from '../../constants/exercise4Defaults';

// Shared look of a rhythm cell across all Rhythm tabs.
// State -> instrument: accent = bass drum, normal = snare, soft = hi-hat, mute = rest.
// Colors live in Exercise4.css (.rc-<state>); icons inherit them via currentColor.

export const CELL_STATE_ORDER = [
  CELL_STATES.ACCENT,
  CELL_STATES.NORMAL,
  CELL_STATES.SOFT,
  CELL_STATES.MUTE
];

export const nextCellState = (state) => {
  const index = CELL_STATE_ORDER.indexOf(state);
  return CELL_STATE_ORDER[(index + 1) % CELL_STATE_ORDER.length];
};

const ICON_PROPS = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true
};

const ICONS = {
  // Bass drum, front view
  [CELL_STATES.ACCENT]: (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  // Snare drum, side view with snare wires
  [CELL_STATES.NORMAL]: (
    <svg {...ICON_PROPS}>
      <ellipse cx="12" cy="8" rx="8" ry="3" />
      <path d="M4 8v7c0 1.7 3.6 3 8 3s8-1.3 8-3V8" />
      <path d="M8 13.5v3M12 14v3.2M16 13.5v3" />
    </svg>
  ),
  // Hi-hat: two cymbals on a stand
  [CELL_STATES.SOFT]: (
    <svg {...ICON_PROPS}>
      <path d="M3 8.5 12 7l9 1.5" />
      <path d="M3 12.5 12 14l9-1.5" />
      <path d="M12 7V3M12 14v7" />
    </svg>
  ),
  // Rest
  [CELL_STATES.MUTE]: (
    <svg {...ICON_PROPS}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
};

const CellIcon = ({ state, className = '' }) => (
  <span className={`rc-icon ${className}`}>{ICONS[state] || null}</span>
);

export default CellIcon;
