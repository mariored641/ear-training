/**
 * RhythmDictation — Tab 1: הכתבה קצבית
 *
 * The entire PLAYING → WAITING → RECORDING sequence is scheduled in ONE
 * continuous Transport run — the metronome never stops between phases.
 *
 * Flow:
 *   IDLE → PLAYING → WAITING (1-bar count-in) → RECORDING → RESULT → repeat
 *   IDLE → CALIBRATING → IDLE
 *
 * Success → new pattern | Failure → same pattern replayed
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { generatePattern, computeExpectedOnsets, evaluateOnsets } from '../../utils/rhythmPatternGenerator';
import rhythmAudio from '../../utils/rhythmTrainingAudio';
import { RhythmOnsetDetector } from '../../utils/rhythmOnsetDetector';
import { EVALUATION_CONFIG } from '../../constants/rhythmTrainingDefaults';

const S = {
  IDLE:        'idle',
  PLAYING:     'playing',
  WAITING:     'waiting',
  RECORDING:   'recording',
  RESULT:      'result',
  CALIBRATING: 'calibrating',
  DONE:        'done',
};

const CALIB_BPM   = 80;
const CALIB_BEATS = 8;

export default function RhythmDictation({ settings, onActiveChange }) {
  const { bpm, numBars, level, soundChoice, bassNote, numQuestions } = settings;

  const [appState, setAppState]     = useState(S.IDLE);
  const [currentBeat, setCurrentBeat] = useState({ phase: null, idx: -1 });
  const [lastResult, setLastResult]   = useState(null);
  const [stats, setStats]   = useState({ rounds: 0, correct: 0 });
  const [audioLevel, setAudioLevel] = useState(0);

  // Per-session calibration (fluxThreshold + latencyCompMs)
  const [calibration, setCalibration] = useState({ fluxThreshold: 8, latencyCompMs: 65 });
  const [calibResult, setCalibResult] = useState(null); // {matched, newLatency, newFlux} | 'fail'

  const genRef      = useRef(0);
  const patternRef  = useRef(null);
  const detectorRef = useRef(null);
  const monitorRef  = useRef(null); // always-on VU meter in IDLE
  const levelRafRef = useRef(null);
  const lastPollRef = useRef(0);
  const calibRef    = useRef(calibration); // kept in sync for async handlers

  // Keep calibRef in sync
  useEffect(() => { calibRef.current = calibration; }, [calibration]);

  useEffect(() => {
    onActiveChange(appState !== S.IDLE && appState !== S.DONE);
  }, [appState, onActiveChange]);

  // ── Monitor detector: always-on for VU meter in IDLE ──────────
  const startMonitor = useCallback(async () => {
    if (monitorRef.current?.isRunning) return;
    try {
      const mon = new RhythmOnsetDetector({ fluxThreshold: Infinity, latencyCompMs: 0 });
      await mon.start();
      monitorRef.current = mon;
    } catch { /* mic denied — VU stays at 0 */ }
  }, []);

  const stopMonitor = useCallback(() => {
    monitorRef.current?.stop();
    monitorRef.current = null;
  }, []);

  // Start monitor on mount, stop on unmount
  useEffect(() => {
    startMonitor();
    return () => {
      genRef.current = -1;
      rhythmAudio.stop();
      detectorRef.current?.stop();
      stopMonitor();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── VU meter polling (~30 fps) ─────────────────────────────────
  useEffect(() => {
    const poll = (ts) => {
      if (ts - lastPollRef.current >= 33) {
        lastPollRef.current = ts;
        // In IDLE/CALIBRATING use monitor; otherwise use active detector
        const det = (appState === S.IDLE || appState === S.CALIBRATING)
          ? monitorRef.current
          : detectorRef.current;
        setAudioLevel(det?.getLevel() ?? 0);
      }
      levelRafRef.current = requestAnimationFrame(poll);
    };
    levelRafRef.current = requestAnimationFrame(poll);
    return () => { if (levelRafRef.current) { cancelAnimationFrame(levelRafRef.current); levelRafRef.current = null; } };
  }, [appState]);

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // ── Main exercise loop ─────────────────────────────────────────
  const runLoop = useCallback(async (keepPattern = false) => {
    const myGen = ++genRef.current;
    const alive = () => genRef.current === myGen;

    const beatMs = 60000 / bpm;

    if (!keepPattern || !patternRef.current) {
      patternRef.current = generatePattern(level, numBars);
    }
    const pattern = patternRef.current;

    // Stop monitor while mic is used by the exercise detector
    stopMonitor();

    const { fluxThreshold, latencyCompMs } = calibRef.current;
    const detector = new RhythmOnsetDetector({ fluxThreshold, latencyCompMs });
    detectorRef.current = detector;
    let micReady = false;
    try {
      await detector.start();
      micReady = true;
    } catch { /* no mic — will auto-pass */ }

    if (!alive()) { detector.stop(); startMonitor(); return; }

    setAppState(S.PLAYING);
    setCurrentBeat({ phase: null, idx: -1 });
    setLastResult(null);

    await new Promise((resolve, reject) => {
      if (!alive()) { reject(new Error('cancelled')); return; }

      rhythmAudio.scheduleDictation({
        pattern, numBars, bpm, soundChoice, bassNote,

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

    if (!alive()) { startMonitor(); return; }
    setCurrentBeat({ phase: null, idx: -1 });

    // ── Evaluate ──────────────────────────────────────────────────
    const detected = micReady && detectorRef.current
      ? detectorRef.current.getRecordingOnsets()
      : [];
    detectorRef.current?.stop();
    detectorRef.current = null;

    const expected = computeExpectedOnsets(pattern, bpm);

    // Debug log
    console.group('%c[RhythmDictation] Onset Debug', 'color:#7ec8e3;font-weight:bold');
    console.log('Expected (ms):', expected.map(t => Math.round(t)));
    console.log('Detected (ms):', detected.map(t => Math.round(t)));
    console.log(`fluxThreshold: ${fluxThreshold} | latencyCompMs: ${latencyCompMs} | toleranceMs: ${EVALUATION_CONFIG.toleranceMs}`);
    console.groupEnd();

    const evalResult = (!micReady || expected.length === 0)
      ? { pass: true, matchPct: 1, matched: expected.length, total: expected.length, extraHits: 0 }
      : evaluateOnsets(expected, detected, EVALUATION_CONFIG.toleranceMs, EVALUATION_CONFIG.minMatchPct);

    setAppState(S.RESULT);
    setLastResult(evalResult);

    let newStats;
    setStats(prev => {
      newStats = {
        rounds:  prev.rounds + 1,
        correct: prev.correct + (evalResult.pass ? 1 : 0),
      };
      return newStats;
    });

    await sleep(beatMs * 2);
    if (!alive()) { startMonitor(); return; }

    // Check if the question limit has been reached
    if (numQuestions > 0 && newStats.rounds >= numQuestions) {
      setAppState(S.DONE);
      startMonitor();
      return;
    }

    if (evalResult.pass) patternRef.current = null;
    runLoop(!evalResult.pass);

  }, [bpm, numBars, level, soundChoice, bassNote, numQuestions, startMonitor, stopMonitor]);

  // ── Calibration ────────────────────────────────────────────────
  const handleCalibrate = useCallback(async () => {
    const myGen = ++genRef.current;
    const alive = () => genRef.current === myGen;

    stopMonitor();

    // Use very low threshold to catch all taps; no comp (we measure raw delay)
    const det = new RhythmOnsetDetector({ fluxThreshold: 3, latencyCompMs: 0 });
    try {
      await det.start();
    } catch {
      startMonitor();
      return;
    }

    if (!alive()) { det.stop(); startMonitor(); return; }

    setAppState(S.CALIBRATING);
    setCurrentBeat({ phase: null, idx: -1 });
    setCalibResult(null);

    const beatMs = 60000 / CALIB_BPM;
    let recordingStartMarked = false;

    await new Promise(resolve => {
      rhythmAudio.scheduleCalibration({
        bpm: CALIB_BPM,
        numBeats: CALIB_BEATS,
        onBeat: (b) => {
          if (!alive()) return;
          // Mark recording start on the first beat
          if (b === 0 && !recordingStartMarked) {
            det.markRecordingStart();
            recordingStartMarked = true;
          }
          setCurrentBeat({ phase: 'calibrating', idx: b });
        },
        onComplete: resolve,
      });
    });

    if (!alive()) { det.stop(); startMonitor(); return; }

    const rawOnsets = det.getRawRecordingOnsets(); // [{time, flux}]
    det.stop();

    // Expected beat times relative to first beat
    const expectedTimes = Array.from({ length: CALIB_BEATS }, (_, i) => i * beatMs);

    // Greedy match: each raw onset → closest expected beat (±300ms window)
    const MATCH_WINDOW = 300;
    const usedBeat = new Set();
    const matched = [];

    for (const onset of rawOnsets) {
      let bestBeat = -1, bestDist = Infinity;
      for (let i = 0; i < expectedTimes.length; i++) {
        if (usedBeat.has(i)) continue;
        const dist = Math.abs(onset.time - expectedTimes[i]);
        if (dist < MATCH_WINDOW && dist < bestDist) {
          bestDist = dist;
          bestBeat = i;
        }
      }
      if (bestBeat >= 0) {
        matched.push({ ...onset, expected: expectedTimes[bestBeat] });
        usedBeat.add(bestBeat);
      }
    }

    console.group('%c[Calibration]', 'color:#38bdf8;font-weight:bold');
    console.log('Raw onsets:', rawOnsets);
    console.log('Matched:', matched);

    if (matched.length < 5) {
      console.log('FAIL — fewer than 5 taps matched');
      console.groupEnd();
      setCalibResult('fail');
      await sleep(2500);
      if (!alive()) return;
      setCalibResult(null);
      setCurrentBeat({ phase: null, idx: -1 });
      setAppState(S.IDLE);
      startMonitor();
      return;
    }

    // Compute new latencyCompMs = median of (raw_time - expected_time)
    const errors = matched.map(m => m.time - m.expected).sort((a, b) => a - b);
    const mid = Math.floor(errors.length / 2);
    const medianErr = errors.length % 2 === 0
      ? Math.round((errors[mid - 1] + errors[mid]) / 2)
      : errors[mid];
    const newLatency = Math.max(0, Math.min(250, medianErr));

    // Compute new fluxThreshold = 65% of softest matched tap flux
    const minFlux = Math.min(...matched.map(m => m.flux));
    const newFlux = Math.max(2, Math.min(50, Math.floor(minFlux * 0.65)));

    console.log(`New latencyCompMs: ${newLatency}ms (median error: ${medianErr}ms)`);
    console.log(`New fluxThreshold: ${newFlux} (min tap flux: ${minFlux.toFixed(1)})`);
    console.groupEnd();

    const newCalib = { fluxThreshold: newFlux, latencyCompMs: newLatency };
    setCalibration(newCalib);
    setCalibResult({ matched: matched.length, newLatency, newFlux });

    await sleep(2500);
    if (!alive()) return;

    setCalibResult(null);
    setCurrentBeat({ phase: null, idx: -1 });
    setAppState(S.IDLE);
    startMonitor();

  }, [startMonitor, stopMonitor]);

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
    startMonitor();
  }, [startMonitor]);

  const handleSkip = useCallback(() => {
    genRef.current += 1;
    rhythmAudio.stop();
    detectorRef.current?.stop();
    detectorRef.current = null;
    patternRef.current = null;
    setTimeout(() => runLoop(false), 50);
  }, [runLoop]);

  const handleCancelCalib = useCallback(() => {
    genRef.current += 1;
    rhythmAudio.stop();
    setCalibResult(null);
    setCurrentBeat({ phase: null, idx: -1 });
    setAppState(S.IDLE);
    startMonitor();
  }, [startMonitor]);

  // ── Derived ────────────────────────────────────────────────────
  const isActive    = appState !== S.IDLE && appState !== S.CALIBRATING && appState !== S.DONE;
  const successRate = stats.rounds > 0
    ? Math.round((stats.correct / stats.rounds) * 100) : null;

  const phaseClass = {
    [S.IDLE]:        'phase-idle',
    [S.PLAYING]:     'phase-playing',
    [S.WAITING]:     'phase-waiting',
    [S.RECORDING]:   'phase-recording',
    [S.CALIBRATING]: 'phase-calibrating',
    [S.DONE]:        successRate >= 80 ? 'phase-correct' : 'phase-wrong',
    [S.RESULT]:      lastResult?.pass ? 'phase-correct' : 'phase-wrong',
  }[appState] || '';

  const phaseLabel = {
    [S.IDLE]:        'מוכן לתרגול',
    [S.PLAYING]:     '🎵 הקשב לפטרן...',
    [S.WAITING]:     '⏱ עכשיו תורך!',
    [S.RECORDING]:   '🎸 נגן עכשיו!',
    [S.CALIBRATING]: `⚙ כיול — נגן עם כל פעמה (${CALIB_BEATS} פעמות)`,
    [S.DONE]:        `סיום! ${stats.correct}/${stats.rounds} (${successRate ?? 0}%)`,
    [S.RESULT]:      lastResult?.pass ? '✓ כל הכבוד!' : '✗ נסה שוב',
  }[appState] || '';

  return (
    <>
      <div className="rt-exercise-area">
        <div className={`rt-phase ${phaseClass} ${appState === S.RESULT ? 'rt-result-anim' : ''}`}>
          {phaseLabel}
        </div>

        <div className="rt-beat-row">
          {buildBeatRows(
            appState === S.CALIBRATING ? 2 : numBars,
            currentBeat,
            appState === S.CALIBRATING,
          )}
        </div>

        {/* VU meter — always visible */}
        <div className="rt-vu-row">
          <VUMeter level={audioLevel} recording={appState === S.RECORDING} />
          {appState === S.IDLE && (
            <button className="rt-calib-btn" onClick={handleCalibrate} title="כיול אוטומטי">
              ⚙ כיול
            </button>
          )}
        </div>

        {/* Calibration result banner */}
        {calibResult && (
          <div className={`rt-calib-result ${calibResult === 'fail' ? 'fail' : 'pass'}`}>
            {calibResult === 'fail'
              ? '✗ לא זוהו מספיק הקשות — נסה שוב'
              : `✓ כויל! רגישות: ${calibResult.newFlux} | עיכוב: ${calibResult.newLatency}ms (${calibResult.matched}/${CALIB_BEATS} הלמות)`
            }
          </div>
        )}

        {/* Exercise result bar */}
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

        {/* Session stats */}
        {stats.rounds > 0 && appState !== S.CALIBRATING && appState !== S.DONE && (
          <div className="rt-stats">
            <strong>{stats.correct}</strong>/{stats.rounds} הצלחות
            {successRate !== null && <> · {successRate}%</>}
          </div>
        )}

        {/* Calibration info */}
        {calibration.fluxThreshold !== 8 || calibration.latencyCompMs !== 65 ? (
          <div className="rt-calib-info">
            ⚙ מכויל: רגישות {calibration.fluxThreshold} | עיכוב {calibration.latencyCompMs}ms
          </div>
        ) : null}

        {appState === S.IDLE && (
          <p className="rt-mic-note">
            🎙 נדרשת גישה למיקרופון. לחץ ⚙ כיול לכיול אוטומטי לפני התרגול.
          </p>
        )}
      </div>

      <div className="rt-controls">
        {appState === S.CALIBRATING ? (
          <button className="rt-ctrl-btn stop" onClick={handleCancelCalib}>✕ ביטול</button>
        ) : appState === S.DONE ? (
          <button className="rt-ctrl-btn start" onClick={handleStart}>↺ התחל מחדש</button>
        ) : isActive ? (
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

// ── VU Meter ───────────────────────────────────────────────────────

const SEGS = 16;

function VUMeter({ level, recording }) {
  const filled   = Math.min(1, level * 4);
  const litCount = Math.round(filled * SEGS);

  return (
    <div className="rt-vu-wrap">
      <span className="rt-vu-label">🎙</span>
      <div className="rt-vu-meter">
        {Array.from({ length: SEGS }, (_, i) => {
          const lit = i < litCount;
          let colorClass = '';
          if (lit) {
            if (i < SEGS * 0.6)       colorClass = 'green';
            else if (i < SEGS * 0.85) colorClass = 'yellow';
            else                       colorClass = 'red';
          }
          return (
            <div key={i} className={`rt-vu-seg${lit ? ` lit ${colorClass}` : ''}`} />
          );
        })}
      </div>
      {recording && <span className="rt-vu-rec">REC</span>}
    </div>
  );
}

// ── Beat counter ───────────────────────────────────────────────────

function buildBeatRows(numBars, currentBeat, isCalibrating = false) {
  const { phase, idx } = currentBeat;

  const bars = [];
  for (let bar = 0; bar < numBars; bar++) {
    const dots = [];
    for (let beat = 0; beat < 4; beat++) {
      const absIdx = bar * 4 + beat;
      const active = idx === absIdx;

      let cls = 'rt-beat-dot';
      if (beat === 0) cls += ' accent';
      if (active && (phase === 'playing' || phase === 'waiting')) cls += ' active-play';
      if (active && phase === 'recording')                        cls += ' active-rec';
      if (active && phase === 'calibrating')                      cls += ' active-calib';

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
