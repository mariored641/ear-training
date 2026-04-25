import React, { useState } from 'react';
import LevelNavigator from './LevelNavigator';
import './earTrainingShared.css';

/**
 * Sticky header for an ear-training exercise.
 * Props:
 *   exerciseTitle: string  (e.g. "M1 — זיהוי דרגה")
 *   levels: [{ number, label }]
 *   currentLevel: number
 *   onLevelChange: (number) => void
 *   storageKey?: string
 *   onBack: () => void
 *   onStop?: () => void
 *   progressCurrent?: number
 *   progressTotal?: number
 */
const EarTrainingHeader = ({
  exerciseTitle,
  levels,
  currentLevel,
  onLevelChange,
  storageKey,
  onBack,
  onStop,
  progressCurrent,
  progressTotal
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const currentLabel = levels?.find(l => l.number === currentLevel)?.label ?? `שלב ${currentLevel}`;
  const showProgress = Number.isFinite(progressCurrent) && Number.isFinite(progressTotal) && progressTotal > 0;
  const pct = showProgress ? Math.round((progressCurrent / progressTotal) * 100) : 0;

  return (
    <>
      <header className="et-header">
        <button className="et-header-back" onClick={onBack}>← חזרה</button>

        <button
          className="et-header-level-trigger"
          onClick={() => setDrawerOpen(true)}
          title={exerciseTitle}
        >
          <span>{exerciseTitle}</span>
          <span style={{ opacity: 0.6 }}>· {currentLabel}</span>
          <span>▼</span>
        </button>

        {showProgress && (
          <div className="et-header-progress" title={`${progressCurrent} / ${progressTotal}`}>
            <div className="et-header-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        )}

        {onStop && (
          <button className="et-header-stop" onClick={onStop} aria-label="עצור">■ עצור</button>
        )}
      </header>

      <LevelNavigator
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        levels={levels}
        currentLevel={currentLevel}
        onChange={onLevelChange}
        storageKey={storageKey}
      />
    </>
  );
};

export default EarTrainingHeader;
