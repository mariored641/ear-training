import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import EarTrainingHeader from '../shared/EarTrainingHeader';
import { loadStoredLevel } from '../shared/LevelNavigator';
import '../shared/earTrainingShared.css';
import {
  tiersForMode,
  tierIdByNumber,
  SOUNDS,
  CHORD_DURATIONS,
  DEFAULT_CHORD_DURATION,
  SESSION_DURATIONS,
  DEFAULT_SESSION_MINUTES,
  DIATONIC_KEYS,
} from './reactiveConstants';
import { useReactiveSession } from './useReactiveSession';
import './ReactiveExercise.css';
import { formatNoteName } from '../../../i18n/musicTerms';

function formatTime(sec) {
  if (sec == null) return '∞';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Shared Reactive Ear Training exercise screen.
 * @param {'diatonic'|'random'} mode
 * @param {string} exerciseId   For storage key ("R1" / "R2")
 * @param {string} title        Hebrew title shown in header
 */
const ReactiveExercise = ({ mode, exerciseId }) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const title = `${exerciseId} — ${t(`earTraining.exercises.${exerciseId}`)}`;
  const storageKey = `${exerciseId}_currentLevel`;
  const tiers = tiersForMode(mode);

  // ---- user settings ----
  const [currentLevel, setCurrentLevel] = useState(() => {
    const stored = loadStoredLevel(storageKey, 1);
    // clamp to available tier count for this mode
    return Math.min(stored, tiers.length);
  });
  const [sound, setSound] = useState(SOUNDS[0].id);
  const [chordDuration, setChordDuration] = useState(DEFAULT_CHORD_DURATION);
  const [sessionMinutes, setSessionMinutes] = useState(DEFAULT_SESSION_MINUTES);
  const [diatonicKey, setDiatonicKey] = useState('random');

  const tier = tierIdByNumber(currentLevel, mode);

  const session = useReactiveSession({
    mode,
    tier,
    sound,
    chordDuration,
    sessionMinutes,
    diatonicKey,
  });

  const handleLevelChange = (n) => {
    if (session.isPlaying) return; // disabled during playback
    setCurrentLevel(n);
  };

  const handlePlayClick = () => {
    if (session.isPlaying) {
      session.stopSession(false);
    } else {
      session.startSession();
    }
  };

  const handleBack = () => {
    if (session.isPlaying) session.stopSession(false);
    navigate('/category/ear-training/reactive');
  };

  return (
    <div className="reactive-screen">
      <EarTrainingHeader
        exerciseTitle={title}
        levels={tiers}
        currentLevel={currentLevel}
        onLevelChange={handleLevelChange}
        storageKey={storageKey}
        onBack={handleBack}
      />

      <div className="reactive-body">
        <div className="reactive-session-bar">
          <span className="reactive-session-timer" aria-label={t('earTraining.reactive.timeLeft')}>
            ⏱ {formatTime(session.sessionTimeLeft)}
          </span>
          {mode === 'diatonic' && session.activeKey && session.isPlaying && (
            <span className="reactive-key-active">
              {t('earTraining.reactive.activeKey')}: <strong>{formatNoteName(session.activeKey, i18n.language)}</strong>
            </span>
          )}
        </div>

        {mode === 'diatonic' && (
          <div className="reactive-key-row">
            <label>{t('earTraining.reactive.key')}:</label>
            <select
              value={diatonicKey}
              onChange={(e) => setDiatonicKey(e.target.value)}
              disabled={session.isPlaying}
            >
              {DIATONIC_KEYS.map(k => (
                <option key={k.value} value={k.value}>
                  {k.value === 'random'
                    ? t('earTraining.reactive.randomKey')
                    : `${formatNoteName(k.value, i18n.language)} ${t('common.major')}`}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="reactive-play-area">
          <button
            className={`reactive-play-btn ${session.isPlaying ? 'playing' : ''}`}
            onClick={handlePlayClick}
            disabled={session.isInitializing}
            aria-label={session.isPlaying ? t('common.stop') : t('common.play')}
          >
            {session.isInitializing ? (
              <span className="reactive-play-label">{t('common.loading')}</span>
            ) : session.isPlaying ? (
              <span className="reactive-play-label">⏸<br/>STOP</span>
            ) : (
              <span className="reactive-play-label">▶<br/>PLAY</span>
            )}
          </button>

          {session.initError && (
            <p className="reactive-error">{session.initError}</p>
          )}

          {session.sessionEnded && (
            <div className="reactive-session-end">
              <h2>🎉 {t('earTraining.reactive.sessionEnded')}</h2>
              <p>{t('earTraining.reactive.sessionEndedBody', { count: sessionMinutes })}</p>
            </div>
          )}
        </div>

        <div className="reactive-reveal-row">
          <button
            className={`reactive-reveal-btn ${session.revealBlink && !session.revealShown ? 'blink' : ''} ${session.revealShown ? 'shown' : ''}`}
            onClick={session.revealNow}
            disabled={!session.isPlaying || !session.currentChord}
            aria-label={t('earTraining.reactive.revealChord')}
          >
            {session.revealShown && session.currentChord
              ? <span className="reactive-reveal-symbol">{session.currentChord.displaySymbol}</span>
              : <span>👁 {t('earTraining.reactive.reveal')}</span>}
          </button>

          <label className="reactive-auto-toggle">
            <input
              type="checkbox"
              checked={session.autoReveal}
              onChange={(e) => session.setAutoReveal(e.target.checked)}
            />
            <span>🔁 {t('earTraining.reactive.autoReveal')}</span>
          </label>
        </div>

        <div className="reactive-controls-row">
          <div className="reactive-control">
            <label>{t('earTraining.reactive.sound')}:</label>
            <select value={sound} onChange={(e) => setSound(e.target.value)} disabled={session.isPlaying}>
              {SOUNDS.map(s => (
                <option key={s.id} value={s.id}>{t(`earTraining.reactive.sounds.${s.id}`, { defaultValue: s.label })}</option>
              ))}
            </select>
          </div>

          <div className="reactive-control">
            <label>{t('earTraining.reactive.chordDuration')}:</label>
            <select
              value={chordDuration}
              onChange={(e) => setChordDuration(Number(e.target.value))}
              disabled={session.isPlaying}
            >
              {CHORD_DURATIONS.map(d => (
                <option key={d} value={d}>{t('earTraining.reactive.seconds', { count: d })}</option>
              ))}
            </select>
          </div>

          <div className="reactive-control">
            <label>{t('earTraining.reactive.sessionLength')}:</label>
            <select
              value={sessionMinutes}
              onChange={(e) => setSessionMinutes(Number(e.target.value))}
              disabled={session.isPlaying}
            >
              {SESSION_DURATIONS.map(s => (
                <option key={s.value} value={s.value}>
                  {s.value === 0
                    ? t('earTraining.reactive.unlimited')
                    : t('earTraining.reactive.minutes', { count: s.value })}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReactiveExercise;
