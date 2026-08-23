import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const exerciseId = /^([A-Z]\d+)/.exec(exerciseTitle || '')?.[1];
  const localizedLevels = levels?.map((level) => ({
    ...level,
    label: exerciseId
      ? t(`earTraining.levels.${exerciseId}.${level.number}`, { defaultValue: level.label })
      : level.label,
  }));
  const currentLabel = localizedLevels?.find(l => l.number === currentLevel)?.label ?? t('common.level', { level: currentLevel });
  const showProgress = Number.isFinite(progressCurrent) && Number.isFinite(progressTotal) && progressTotal > 0;
  const pct = showProgress ? Math.round((progressCurrent / progressTotal) * 100) : 0;

  return (
    <>
      <header className="et-header">
        <button className="et-header-back" onClick={onBack}>{t('common.back')}</button>

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
          <button className="et-header-stop" onClick={onStop} aria-label={t('common.stop')}>■ {t('common.stop')}</button>
        )}
      </header>

      <LevelNavigator
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        levels={localizedLevels || levels}
        currentLevel={currentLevel}
        onChange={onLevelChange}
        storageKey={storageKey}
      />
    </>
  );
};

export default EarTrainingHeader;
