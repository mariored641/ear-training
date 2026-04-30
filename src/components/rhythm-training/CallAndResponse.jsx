/**
 * CallAndResponse — Tab 2: שאלה ותשובה
 *
 * The Transport starts once and runs continuously.
 * Each round is scheduled in advance; onRoundEnd fires 1 beat early
 * so the next round is scheduled before the current one ends — no gaps.
 *
 * Flow (loops until Stop):
 *   APP_PLAYING → STUDENT_PLAYING → APP_PLAYING → ...
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import { generatePattern } from '../../utils/rhythmPatternGenerator';
import rhythmAudio from '../../utils/rhythmTrainingAudio';

const S = { IDLE: 'idle', APP: 'app', STUDENT: 'student' };

export default function CallAndResponse({ settings, onActiveChange }) {
  const { bpm, numBars, level, soundChoice, bassNote } = settings;

  const [appState, setAppState]     = useState(S.IDLE);
  const [currentBeat, setCurrentBeat] = useState({ phase: null, idx: -1 });
  const [roundCount, setRoundCount] = useState(0);

  const activeRef = useRef(false); // tracks whether session is running

  useEffect(() => { onActiveChange(appState !== S.IDLE); }, [appState, onActiveChange]);

  useEffect(() => {
    return () => { activeRef.current = false; rhythmAudio.stop(); };
  }, []);

  // ── Live setting changes ─────────────────────────────────────────
  // BPM update flows through Tone.Transport during active session.
  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  // Sound choice / bass note: reload sound; engine will pick it up on next beat.
  useEffect(() => {
    if (appState !== S.IDLE) {
      rhythmAudio.loadSound(soundChoice, bassNote);
    }
  }, [soundChoice, bassNote, appState]);

  // ── Schedule one round and hook up next-round callback ─────────
  const scheduleRound = useCallback((nextStartSec) => {
    if (!activeRef.current) return;

    const pattern = generatePattern(level, numBars);
    setAppState(S.APP);
    setRoundCount(prev => prev + 1);

    rhythmAudio.scheduleCallResponseRound({
      pattern,
      numBars,
      bpm,
      soundChoice,
      bassNote,
      startSec: nextStartSec,

      onBeat: (phase, idx) => {
        if (!activeRef.current) return;
        setCurrentBeat({ phase, idx });
        if (phase === 'student') setAppState(S.STUDENT);
      },

      onStudentTurn: () => {
        if (activeRef.current) {
          setAppState(S.STUDENT);
          setCurrentBeat({ phase: null, idx: -1 });
        }
      },

      // Fires 1 beat before round ends — schedule the next round now
      onRoundEnd: (nextSec) => {
        if (activeRef.current) {
          setCurrentBeat({ phase: null, idx: -1 });
          scheduleRound(nextSec);
        }
      },
    });
  }, [bpm, numBars, level, soundChoice, bassNote]);

  // ── Start ──────────────────────────────────────────────────────
  const handleStart = useCallback(async () => {
    activeRef.current = true;
    setRoundCount(0);
    setCurrentBeat({ phase: null, idx: -1 });

    // Start Transport; schedule first round immediately (startSec = 0)
    await rhythmAudio.startTransport(bpm, soundChoice, bassNote);
    scheduleRound(0);
  }, [bpm, soundChoice, bassNote, scheduleRound]);

  // ── Stop ───────────────────────────────────────────────────────
  const handleStop = useCallback(() => {
    activeRef.current = false;
    rhythmAudio.stop();
    setAppState(S.IDLE);
    setCurrentBeat({ phase: null, idx: -1 });
  }, []);

  // ── Render ─────────────────────────────────────────────────────
  const isActive = appState !== S.IDLE;

  const phaseClass = {
    [S.IDLE]:    'phase-idle',
    [S.APP]:     'phase-app',
    [S.STUDENT]: 'phase-student',
  }[appState] || '';

  const phaseLabel = {
    [S.IDLE]:    'מוכן לתרגול',
    [S.APP]:     '🎵 תור האפליקציה...',
    [S.STUDENT]: '🎸 תורך לנגן!',
  }[appState] || '';

  return (
    <>
      <div className={`rt-phase ${phaseClass}`}>{phaseLabel}</div>

      <div className="rt-beat-row">
        {buildBeatRows(numBars, currentBeat)}
      </div>

      {roundCount > 0 && (
        <div className="rt-stats" style={{ marginTop: 8 }}>
          סבב <strong>{roundCount}</strong>
        </div>
      )}

      {appState === S.IDLE && (
        <p className="rt-mic-note">
          האפליקציה מנגנת פטרן — הגיב עם גיטרה בסגנון חופשי. לא נדרש מיקרופון.
        </p>
      )}

      <div className="rt-controls">
        {isActive ? (
          <button className="rt-ctrl-btn stop" onClick={handleStop}>■ עצור</button>
        ) : (
          <button className="rt-ctrl-btn start" onClick={handleStart}>▶ התחל</button>
        )}
      </div>
    </>
  );
}

// ── Beat counter ──────────────────────────────────────────────────

function buildBeatRows(numBars, currentBeat) {
  const { phase, idx } = currentBeat;

  const bars = [];
  for (let bar = 0; bar < numBars; bar++) {
    const dots = [];
    for (let beat = 0; beat < 4; beat++) {
      const absIdx = bar * 4 + beat;
      const active = idx === absIdx;

      let cls = 'rt-beat-dot';
      if (beat === 0) cls += ' accent';
      if (active && phase === 'app')     cls += ' active-play';
      if (active && phase === 'student') cls += ' active-student';

      dots.push(<div key={beat} className={cls}>{beat + 1}</div>);
    }
    bars.push(
      <React.Fragment key={bar}>
        {bar > 0 && <span className="rt-bar-label">|</span>}
        <div className="rt-bar-group">{dots}</div>
      </React.Fragment>
    );
  }
  return bars;
}
