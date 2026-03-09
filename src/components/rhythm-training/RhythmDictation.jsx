/**
 * RhythmDictation — Tab 1: הכתבה קצבית
 *
 * The entire PLAYING → WAITING → RECORDING sequence is scheduled in ONE
 * continuous Transport run — the metronome never stops between phases.
 *
 * Flow:
 *   IDLE → PLAYING → WAITING (1-bar count-in) → RECORDING → RESULT → repeat
 *
 * Success → new pattern | Failure → same pattern replayed
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { generatePattern, computeExpectedOnsets, evaluateOnsets } from '../../utils/rhythmPatternGenerator';
import rhythmAudio from '../../utils/rhythmTrainingAudio';
import { RhythmOnsetDetector } from '../../utils/rhythmOnsetDetector';
import { EVALUATION_CONFIG } from '../../constants/rhythmTrainingDefaults';

const S = {
  IDLE:      'idle',
  PLAYING:   'playing',
  WAITING:   'waiting',
  RECORDING: 'recording',
  RESULT:    'result',
};

export default function RhythmDictation({ settings, onActiveChange }) {
  const { bpm, numBars, level, soundChoice, bassNote } = settings;

  const [appState, setAppState]   = useState(S.IDLE);
  const [currentBeat, setCurrentBeat] = useState({ phase: null, idx: -1 });
  const [lastResult, setLastResult]   = useState(null);
  const [stats, setStats] = useState({ rounds: 0, correct: 0 });

  const genRef      = useRef(0);
  const patternRef  = useRef(null);
  const detectorRef = useRef(null);

  useEffect(() => { onActiveChange(appState !== S.IDLE); }, [appState, onActiveChange]);

  useEffect(() => {
    return () => {
      genRef.current = -1;
      rhythmAudio.stop();
      detectorRef.current?.stop();
    };
  }, []);

  // Simple promise-based sleep (used only in RESULT pause — Transport already done)
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // ── Main exercise loop ─────────────────────────────────────────
  const runLoop = useCallback(async (keepPattern = false) => {
    const myGen = ++genRef.current;
    const alive = () => genRef.current === myGen;

    const beatMs = 60000 / bpm;

    // Generate or reuse pattern
    if (!keepPattern || !patternRef.current) {
      patternRef.current = generatePattern(level, numBars);
    }
    const pattern = patternRef.current;

    // Pre-start mic before audio begins (avoids latency on recording start)
    const detector = new RhythmOnsetDetector();
    detectorRef.current = detector;
    let micReady = false;
    try {
      await detector.start();
      micReady = true;
    } catch { /* no mic — will auto-pass */ }

    if (!alive()) { detector.stop(); return; }

    setAppState(S.PLAYING);
    setCurrentBeat({ phase: null, idx: -1 });
    setLastResult(null);

    // ── Schedule full session (one Transport run, no gaps) ───────
    await new Promise((resolve, reject) => {
      if (!alive()) { reject(new Error('cancelled')); return; }

      rhythmAudio.scheduleDictation({
        pattern,
        numBars,
        bpm,
        soundChoice,
        bassNote,

        onBeat: (phase, idx) => {
          if (alive()) setCurrentBeat({ phase, idx });
        },

        onWaiting: () => {
          if (alive()) {
            setAppState(S.WAITING);
            setCurrentBeat({ phase: null, idx: -1 });
          }
        },

        onRecording: () => {
          if (alive()) {
            setAppState(S.RECORDING);
            setCurrentBeat({ phase: null, idx: -1 });
            // Mark exactly when recording starts (while Transport keeps running)
            if (micReady && detectorRef.current) {
              detectorRef.current.markRecordingStart();
            }
          }
        },

        onComplete: resolve,
      });
    }).catch(err => {
      if (err.message !== 'cancelled') console.error(err);
      return Promise.reject(err);
    });

    if (!alive()) return;
    setCurrentBeat({ phase: null, idx: -1 });

    // ── Evaluate ──────────────────────────────────────────────────
    const detected = micReady && detectorRef.current
      ? detectorRef.current.getRecordingOnsets()
      : [];
    detectorRef.current?.stop();
    detectorRef.current = null;

    const expected = computeExpectedOnsets(pattern, bpm);
    const evalResult = (!micReady || expected.length === 0)
      ? { pass: true, matchPct: 1, matched: expected.length, total: expected.length, extraHits: 0 }
      : evaluateOnsets(expected, detected, EVALUATION_CONFIG.toleranceMs, EVALUATION_CONFIG.minMatchPct);

    setAppState(S.RESULT);
    setLastResult(evalResult);
    setStats(prev => ({
      rounds:  prev.rounds + 1,
      correct: prev.correct + (evalResult.pass ? 1 : 0),
    }));

    // Brief result pause (2 beats of silence)
    await sleep(beatMs * 2);
    if (!alive()) return;

    if (evalResult.pass) patternRef.current = null; // new pattern next round
    runLoop(!evalResult.pass);

  }, [bpm, numBars, level, soundChoice, bassNote]);

  // ── Controls ───────────────────────────────────────────────────
  const handleStart = useCallback(() => {
    patternRef.current = null;
    setStats({ rounds: 0, correct: 0 });
    runLoop(false);
  }, [runLoop]);

  const handleStop = useCallback(() => {
    genRef.current += 1;
    rhythmAudio.stop();
    detectorRef.current?.stop();
    detectorRef.current = null;
    setAppState(S.IDLE);
    setCurrentBeat({ phase: null, idx: -1 });
    setLastResult(null);
    patternRef.current = null;
  }, []);

  const handleSkip = useCallback(() => {
    genRef.current += 1;
    rhythmAudio.stop();
    detectorRef.current?.stop();
    detectorRef.current = null;
    patternRef.current = null;
    setTimeout(() => runLoop(false), 50);
  }, [runLoop]);

  // ── Derived ────────────────────────────────────────────────────
  const isActive     = appState !== S.IDLE;
  const successRate  = stats.rounds > 0
    ? Math.round((stats.correct / stats.rounds) * 100) : null;

  const phaseClass = {
    [S.IDLE]:      'phase-idle',
    [S.PLAYING]:   'phase-playing',
    [S.WAITING]:   'phase-waiting',
    [S.RECORDING]: 'phase-recording',
    [S.RESULT]:    lastResult?.pass ? 'phase-correct' : 'phase-wrong',
  }[appState] || '';

  const phaseLabel = {
    [S.IDLE]:      'מוכן לתרגול',
    [S.PLAYING]:   '🎵 הקשב לפטרן...',
    [S.WAITING]:   '⏱ עכשיו תורך!',
    [S.RECORDING]: '🎸 נגן עכשיו!',
    [S.RESULT]:    lastResult?.pass ? '✓ כל הכבוד!' : '✗ נסה שוב',
  }[appState] || '';

  return (
    <>
      <div className={`rt-phase ${phaseClass} ${appState === S.RESULT ? 'rt-result-anim' : ''}`}>
        {phaseLabel}
      </div>

      <div className="rt-beat-row">
        {buildBeatRows(numBars, currentBeat)}
      </div>

      {appState === S.RESULT && lastResult && (
        <div className={`rt-eval-bar ${lastResult.pass ? 'pass' : 'fail'}`}>
          <span className="ev-title">{lastResult.pass ? '✓ עבר' : '✗ לא עבר'}</span>
          <span className="ev-detail">
            {lastResult.matched}/{lastResult.total} הלמות הותאמו
            ({Math.round(lastResult.matchPct * 100)}%)
            {lastResult.extraHits > 0 && ` · ${lastResult.extraHits} עודפות`}
          </span>
        </div>
      )}

      {stats.rounds > 0 && (
        <div className="rt-stats" style={{ marginTop: 8 }}>
          <strong>{stats.correct}</strong>/{stats.rounds} הצלחות
          {successRate !== null && <> · {successRate}%</>}
        </div>
      )}

      {appState === S.IDLE && (
        <p className="rt-mic-note">
          🎙 נדרשת גישה למיקרופון. נגן עם גיטרה אקוסטית בסביבה שקטה.
        </p>
      )}

      <div className="rt-controls">
        {isActive ? (
          <>
            <button className="rt-ctrl-btn skip" onClick={handleSkip}>↩ דלג</button>
            <button className="rt-ctrl-btn stop" onClick={handleStop}>■ עצור</button>
          </>
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
      const absIdx  = bar * 4 + beat;
      const active  = idx === absIdx;

      let cls = 'rt-beat-dot';
      if (beat === 0) cls += ' accent';
      if (active && (phase === 'playing' || phase === 'waiting')) cls += ' active-play';
      if (active && phase === 'recording')                        cls += ' active-rec';

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
