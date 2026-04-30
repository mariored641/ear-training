import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Tone from 'tone';
import AudioPlayer from '../../utils/AudioPlayer';
import { PitchDetector, frequencyToNote } from '../../utils/PitchDetector';
import {
  CHROMATIC_NOTES, SCALES, DIFFICULTY_LEVELS,
  DEFAULT_EXERCISE3_SETTINGS, generateMelodySequence,
} from '../../constants/exercise3Defaults';
import Storage from '../../utils/Storage';
import LevelStrip from '../common/LevelStrip';
import './Exercise3.css';

// ── App states ─────────────────────────────────────────────────────────────────
const S = { IDLE: 'idle', COUNTIN: 'countin', PLAYING: 'playing', LISTENING: 'listening', RESULT: 'result' };

const EX3_LEVELS = [
  { id: '1',      label: 'רמה 1' },
  { id: '2',      label: 'רמה 2' },
  { id: '3',      label: 'רמה 3' },
  { id: '4',      label: 'רמה 4' },
  { id: 'custom', label: 'התאמה אישית' },
];

// Count-in beats before first sequence
const COUNT_IN_BEATS = 4;

// Consecutive frames a pitch must be held to count (~330ms @ 60fps)
const HOLD_FRAMES = 20;

// ══════════════════════════════════════════════════════════════════════════════
export default function Exercise3() {
  const navigate = useNavigate();

  // ── Settings (persisted) ───────────────────────────────────────────────────
  const [settings, setSettings] = useState(() =>
    Storage.loadSettings(3, DEFAULT_EXERCISE3_SETTINGS)
  );
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  // Active level: '1'..'4' map to settings.difficulty; 'custom' marks user-customized
  const [activeLevel, setActiveLevel] = useState(() => {
    const stored = Storage.loadSettings(3, DEFAULT_EXERCISE3_SETTINGS);
    return stored.activeLevel || String(stored.difficulty || 1);
  });

  // ── Exercise state ─────────────────────────────────────────────────────────
  const [appState, setAppState]         = useState(S.IDLE);
  const [countInBeat, setCountInBeat]   = useState(0);    // 1-4 during count-in, 0 otherwise
  const [sequence, setSequence]         = useState([]);   // [{noteName,octave,fullNote,midiNote}]
  const [currentBeat, setCurrentBeat]   = useState(-1);   // which beat is highlighted
  const [noteResults, setNoteResults]   = useState([]);   // null | 'correct' | 'wrong'
  const [lastRoundOk, setLastRoundOk]   = useState(null); // null | true | false

  // ── Stats ──────────────────────────────────────────────────────────────────
  const [stats, setStats] = useState({ rounds: 0, correct: 0 });

  // ── Mic / pitch detection ──────────────────────────────────────────────────
  const [micStatus, setMicStatus]       = useState('off');
  const [detectedNote, setDetectedNote] = useState(null);
  const micStatusRef = useRef('off');
  useEffect(() => { micStatusRef.current = micStatus; }, [micStatus]);

  // ── Internal refs ──────────────────────────────────────────────────────────
  const pitchDetRef     = useRef(null);
  const genRef          = useRef(0);          // cancel signal for async loop
  const lastNoteRef     = useRef(null);       // midiNote of last note played (for continuation)
  const pitchWindowRef  = useRef([]);         // pitch names accumulated in current beat window
  const holdRef         = useRef({ n: null, count: 0 }); // for passive mic display
  const clickSynthRef   = useRef(null);       // Tone.js MembraneSynth for metronome click
  const btnInputRef     = useRef(null);       // note name from button press (button mode)
  const btnResolveRef   = useRef(null);       // resolves the current beat-window promise early

  // ── Init click synth ───────────────────────────────────────────────────────
  useEffect(() => {
    Tone.start().then(() => {
      if (!clickSynthRef.current) {
        clickSynthRef.current = new Tone.MembraneSynth({
          pitchDecay: 0.05, octaves: 4,
          envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.1 },
        }).toDestination();
        clickSynthRef.current.volume.value = -18;
      }
    }).catch(() => {});

    return () => {
      stopMic();
      AudioPlayer.stop();
      genRef.current = -1;
      if (clickSynthRef.current) { clickSynthRef.current.dispose(); clickSynthRef.current = null; }
    };
    // eslint-disable-next-line
  }, []);

  // ── Keyboard shortcut (Space) ──────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.code !== 'Space' || e.target !== document.body) return;
      e.preventDefault();
      if (appState === S.IDLE) handleStart();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
    // eslint-disable-next-line
  }, [appState]);

  // ══════════════════════════════════════════════════════════════════════════
  // Settings helpers
  // ══════════════════════════════════════════════════════════════════════════
  const updateSetting = (key, value) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      Storage.saveSettings(3, next);
      return next;
    });
  };

  const handleLevelChange = (id) => {
    if (id === activeLevel) return;
    if (appState !== S.IDLE) return; // locked during active session
    setActiveLevel(id);

    if (id === 'custom') {
      const next = { ...settings, activeLevel: 'custom' };
      setSettings(next);
      Storage.saveSettings(3, next);
    } else {
      const difficultyNum = parseInt(id);
      const next = { ...settings, difficulty: difficultyNum, activeLevel: id };
      setSettings(next);
      Storage.saveSettings(3, next);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // Microphone management
  // ══════════════════════════════════════════════════════════════════════════
  const startMic = async () => {
    setMicStatus('requesting');
    try {
      const det = new PitchDetector();
      await det.start((freq) => {
        const note = frequencyToNote(freq);
        setDetectedNote(note);
        // accumulate for beat-window evaluation
        if (note) pitchWindowRef.current.push(note.noteName);
      });
      pitchDetRef.current = det;
      setMicStatus('active');
    } catch {
      setMicStatus('error');
    }
  };

  const stopMic = () => {
    if (pitchDetRef.current) { pitchDetRef.current.stop(); pitchDetRef.current = null; }
    setMicStatus('off');
    setDetectedNote(null);
    holdRef.current = { n: null, count: 0 };
  };

  // ── Passive pitch display (hold indicator) ─────────────────────────────────
  useEffect(() => {
    if (micStatus !== 'active' || !detectedNote) {
      holdRef.current = { n: null, count: 0 };
      return;
    }
    const { noteName } = detectedNote;
    if (holdRef.current.n !== noteName) {
      holdRef.current = { n: noteName, count: 1 };
    } else {
      holdRef.current.count += 1;
    }
  }, [detectedNote, micStatus]);

  // ══════════════════════════════════════════════════════════════════════════
  // Metronome click
  // ══════════════════════════════════════════════════════════════════════════
  const playClick = useCallback(() => {
    if (clickSynthRef.current) {
      try { clickSynthRef.current.triggerAttackRelease('C2', '16n'); } catch {}
    }
  }, []);

  // ══════════════════════════════════════════════════════════════════════════
  // Note button input during listen phase
  // ══════════════════════════════════════════════════════════════════════════
  const handleNoteButtonClick = useCallback((noteName) => {
    // Record the note and immediately resolve the current beat window
    btnInputRef.current = noteName;
    if (btnResolveRef.current) {
      btnResolveRef.current();
      btnResolveRef.current = null;
    }
  }, []);

  // ══════════════════════════════════════════════════════════════════════════
  // Async exercise loop
  // ══════════════════════════════════════════════════════════════════════════
  const handleStart = useCallback(async () => {
    await Tone.start();
    await AudioPlayer.setInstrument(settingsRef.current.instrument);

    const myGen = ++genRef.current;
    setStats({ rounds: 0, correct: 0 });
    setLastRoundOk(null);
    lastNoteRef.current = null;

    // Helper: sleep that cancels if generation changes
    const sleep = (ms) => new Promise((resolve, reject) => {
      setTimeout(() => {
        if (genRef.current !== myGen) reject(new Error('cancelled'));
        else resolve();
      }, ms);
    });

    // Helper: sleep that can be resolved early by a button press
    const beatSleep = (ms) => new Promise((resolve, reject) => {
      const id = setTimeout(() => {
        btnResolveRef.current = null;
        if (genRef.current !== myGen) reject(new Error('cancelled'));
        else resolve();
      }, ms);
      // allow early resolution by button click
      btnResolveRef.current = () => {
        clearTimeout(id);
        if (genRef.current !== myGen) reject(new Error('cancelled'));
        else resolve();
      };
    });

    try {
      // ── COUNT-IN (one bar of metronome beats) ────────────────────────────
      const countInBeatMs = 60000 / settingsRef.current.tempo;
      setAppState(S.COUNTIN);
      setSequence([]);
      setCurrentBeat(-1);
      setNoteResults([]);

      for (let i = 1; i <= COUNT_IN_BEATS; i++) {
        if (genRef.current !== myGen) return;
        setCountInBeat(i);
        playClick();
        await sleep(countInBeatMs);
      }
      setCountInBeat(0);
      if (genRef.current !== myGen) return;

      // ── MAIN LOOP ────────────────────────────────────────────────────────
      // seq is null  → generate new sequence
      // seq is set   → replay same sequence (student failed, first attempt)
      let seq = null;
      let attempts = 0; // how many times current seq has been attempted

      while (genRef.current === myGen) {
        const s = settingsRef.current;
        const beatMs = 60000 / s.tempo;

        // Generate a new sequence only when needed
        if (seq === null) {
          seq = generateMelodySequence(
            s.root, s.scale, s.difficulty, s.sequenceLength,
            lastNoteRef.current
          );
          attempts = 0;
        }

        setSequence(seq);
        setNoteResults(new Array(seq.length).fill(null));
        setCurrentBeat(-1);
        setLastRoundOk(null);

        // ── PLAY PHASE ────────────────────────────────────────────────────
        setAppState(S.PLAYING);
        await AudioPlayer.init();

        for (let i = 0; i < seq.length; i++) {
          if (genRef.current !== myGen) return;
          setCurrentBeat(i);
          playClick();
          AudioPlayer.playNote(seq[i].fullNote, (beatMs * 0.85) / 1000);
          await sleep(beatMs);
        }
        setCurrentBeat(-1);

        // Brief gap between play & listen
        await sleep(beatMs * 0.25);
        if (genRef.current !== myGen) return;

        // ── LISTEN PHASE ──────────────────────────────────────────────────
        setAppState(S.LISTENING);
        const roundResults = [];

        for (let i = 0; i < seq.length; i++) {
          if (genRef.current !== myGen) return;
          setCurrentBeat(i);
          pitchWindowRef.current = [];
          btnInputRef.current    = null;

          playClick();
          await beatSleep(beatMs);
          if (genRef.current !== myGen) return;

          // Evaluate: take dominant pitch from mic window, or button press
          let userNote = null;
          if (micStatusRef.current === 'active' && pitchWindowRef.current.length > 0) {
            const counts = {};
            pitchWindowRef.current.forEach(n => { counts[n] = (counts[n] || 0) + 1; });
            userNote = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
          } else if (btnInputRef.current) {
            userNote = btnInputRef.current;
          }

          const ok = userNote === seq[i].noteName;
          roundResults.push(ok);

          setNoteResults(prev => {
            const next = [...prev];
            next[i] = ok ? 'correct' : 'wrong';
            return next;
          });
        }

        setCurrentBeat(-1);

        // ── RESULT ────────────────────────────────────────────────────────
        setAppState(S.RESULT);
        const allOk = roundResults.every(Boolean);
        setLastRoundOk(allOk);
        attempts += 1;

        setStats(prev => ({
          rounds:  prev.rounds + 1,
          correct: prev.correct + (allOk ? 1 : 0),
        }));

        if (allOk || attempts >= settingsRef.current.maxAttempts) {
          // Success, or max attempts reached → move to next sequence
          lastNoteRef.current = seq[seq.length - 1].midiNote;
          seq = null;
        }
        // First failure → seq stays set, same sequence will replay once more

        // Result pause: 2 metronome beats so student feels the tempo continuing
        for (let i = 0; i < 2; i++) {
          if (genRef.current !== myGen) break;
          playClick();
          await sleep(beatMs);
        }
      }
    } catch (e) {
      if (e.message !== 'cancelled') console.error(e);
    }
  // eslint-disable-next-line
  }, [playClick]);

  // ══════════════════════════════════════════════════════════════════════════
  // Stop / Skip
  // ══════════════════════════════════════════════════════════════════════════
  const handleStop = useCallback(() => {
    genRef.current = -1; // cancel the loop
    AudioPlayer.stop();
    setAppState(S.IDLE);
    setSequence([]);
    setCurrentBeat(-1);
    setNoteResults([]);
    setLastRoundOk(null);
    setCountInBeat(0);
    btnResolveRef.current = null;
  }, []);

  const handleSkip = useCallback(() => {
    // Interrupt current beat window if waiting
    if (btnResolveRef.current) { btnResolveRef.current(); btnResolveRef.current = null; }
    // Bump generation (cancels current loop), clear last note, restart fresh
    lastNoteRef.current = null;
    genRef.current += 1;
    handleStart();
  }, [handleStart]);

  // ══════════════════════════════════════════════════════════════════════════
  // Derived
  // ══════════════════════════════════════════════════════════════════════════
  const isActive    = appState !== S.IDLE;
  const isListening = appState === S.LISTENING;
  const successRate = stats.rounds > 0 ? Math.round((stats.correct / stats.rounds) * 100) : null;

  // Hold progress bar width for detected note
  const holdWidth = micStatus === 'active'
    ? Math.min(100, (holdRef.current.count / HOLD_FRAMES) * 100)
    : 0;

  // Phase label class
  const phaseCls = [
    'ex3-phase-label',
    appState === S.COUNTIN                          ? 'phase-countin'  : '',
    appState === S.PLAYING                          ? 'phase-playing'  : '',
    appState === S.LISTENING                        ? 'phase-listening': '',
    appState === S.RESULT && lastRoundOk === true   ? 'phase-correct'  : '',
    appState === S.RESULT && lastRoundOk === false  ? 'phase-wrong'    : '',
  ].filter(Boolean).join(' ');

  // ══════════════════════════════════════════════════════════════════════════
  // Render
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="ex3-page">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="ex3-header">
        <div className="ex3-header-left">
          <button className="ex3-back-btn" onClick={() => { handleStop(); navigate('/category/melodic'); }}>←</button>
        </div>
        <div className="ex3-header-center">
          <h1 className="ex3-title">🎵 Melodic Dictation</h1>
          <p className="ex3-subtitle">הכתבה מלודית</p>
        </div>
        <div className="ex3-header-right">
          {stats.rounds > 0 && (
            <span className="ex3-stats-badge">
              {stats.correct}/{stats.rounds}
              {successRate !== null && <span className="ex3-stats-pct"> {successRate}%</span>}
            </span>
          )}
        </div>
      </header>

      <main className="ex3-main">

        <LevelStrip
          levels={EX3_LEVELS}
          activeId={activeLevel}
          onChange={handleLevelChange}
          disabled={appState !== S.IDLE}
        />

        {/* ══════════════════════════════════════════════════════════
            EXERCISE AREA — always visible
        ══════════════════════════════════════════════════════════ */}
        <div className="ex3-exercise-area">

          {/* Phase label */}
          <div className={phaseCls}>
            {appState === S.IDLE      && 'מוכן לתרגול'}
            {appState === S.COUNTIN   && (countInBeat > 0 ? `${countInBeat}...` : '...')}
            {appState === S.PLAYING   && '🎵 הקשב...'}
            {appState === S.LISTENING && '🎸 תורך לנגן!'}
            {appState === S.RESULT && lastRoundOk === true  && '✓ כל הכבוד!'}
            {appState === S.RESULT && lastRoundOk === false && '✗ נסה שוב'}
          </div>

          {/* Beat / note dots */}
          <div className="ex3-beat-row">
            {(sequence.length > 0 ? sequence : Array.from({ length: settings.sequenceLength })).map((note, i) => {
              const status  = noteResults[i];
              const isCur   = currentBeat === i;
              const isEmpty = !note;

              let cls = 'ex3-beat-dot';
              if (isEmpty)                                     cls += ' empty';
              else if (status === 'correct')                   cls += ' correct';
              else if (status === 'wrong')                     cls += ' wrong';
              else if (isCur && appState === S.PLAYING)        cls += ' cur-play';
              else if (isCur && appState === S.LISTENING)      cls += ' cur-listen';

              // Note names are ONLY revealed in the RESULT phase
              const label = (appState === S.RESULT && note) ? note.noteName : '♩';

              return (
                <div key={i} className={cls}>
                  {label}
                </div>
              );
            })}
          </div>

          {/* Pitch display (always shown when mic active) */}
          {micStatus === 'active' && (
            <div className={`ex3-pitch-row ${
              isListening && detectedNote
                ? sequence[currentBeat]?.noteName === detectedNote?.noteName
                  ? 'pitch-correct'
                  : 'pitch-active'
                : ''
            }`}>
              <span className="ex3-pitch-note">
                {detectedNote ? detectedNote.noteName : '—'}
              </span>
              {detectedNote && (
                <span className="ex3-pitch-detail">
                  {detectedNote.fullNote}
                  <span className="ex3-pitch-cents">
                    {detectedNote.cents > 0 ? '+' : ''}{detectedNote.cents}¢
                  </span>
                </span>
              )}
              {/* Hold bar */}
              <div className="ex3-hold-bar-wrap">
                <div
                  className="ex3-hold-bar"
                  style={{ width: `${holdWidth}%` }}
                />
              </div>
            </div>
          )}

        </div>{/* /ex3-exercise-area */}

        {/* ══════════════════════════════════════════════════════════
            SETTINGS AREA — always visible, locked while active
        ══════════════════════════════════════════════════════════ */}
        <div className={`ex3-settings-area ${isActive ? 'locked' : ''}`}>

          {/* Row 1: Tonic + Scale */}
          <div className="ex3-row2">
            <div className="ex3-field">
              <label className="ex3-field-label">תוניקה:</label>
              <select className="ex3-select" value={settings.root}
                onChange={e => updateSetting('root', e.target.value)}
                disabled={isActive}>
                {CHROMATIC_NOTES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="ex3-field ex3-field-wide">
              <label className="ex3-field-label">סוג סולם:</label>
              <select className="ex3-select" value={settings.scale}
                onChange={e => updateSetting('scale', e.target.value)}
                disabled={isActive}>
                {Object.entries(SCALES).map(([k, v]) =>
                  <option key={k} value={k}>{v.name}</option>
                )}
              </select>
            </div>
          </div>

          {/* Row 2: Difficulty */}
          <div className="ex3-field">
            <label className="ex3-field-label">רמת קושי:</label>
            <select className="ex3-select" value={settings.difficulty}
              onChange={e => updateSetting('difficulty', parseInt(e.target.value))}
              disabled={isActive}>
              {DIFFICULTY_LEVELS.map(d =>
                <option key={d.value} value={d.value}>{d.label}</option>
              )}
            </select>
          </div>

          {/* Row 3: Notes + Instrument + Tempo */}
          <div className="ex3-row3">
            <div className="ex3-field">
              <label className="ex3-field-label">מס׳ תווים:</label>
              <div className="ex3-stepper">
                <button className="ex3-step-btn"
                  onClick={() => updateSetting('sequenceLength', Math.max(2, settings.sequenceLength - 1))}
                  disabled={isActive || settings.sequenceLength <= 2}>−</button>
                <span className="ex3-step-val">{settings.sequenceLength}</span>
                <button className="ex3-step-btn"
                  onClick={() => updateSetting('sequenceLength', Math.min(6, settings.sequenceLength + 1))}
                  disabled={isActive || settings.sequenceLength >= 6}>+</button>
              </div>
            </div>

            <div className="ex3-field">
              <label className="ex3-field-label">ניסיונות לפני דילוג:</label>
              <div className="ex3-stepper">
                <button className="ex3-step-btn"
                  onClick={() => updateSetting('maxAttempts', Math.max(1, settings.maxAttempts - 1))}
                  disabled={isActive || settings.maxAttempts <= 1}>−</button>
                <span className="ex3-step-val">{settings.maxAttempts}</span>
                <button className="ex3-step-btn"
                  onClick={() => updateSetting('maxAttempts', Math.min(10, settings.maxAttempts + 1))}
                  disabled={isActive || settings.maxAttempts >= 10}>+</button>
              </div>
            </div>

            <div className="ex3-field">
              <label className="ex3-field-label">סאונד:</label>
              <div className="ex3-seg">
                {[{ v: 'piano', l: 'פסנתר' }, { v: 'guitar', l: 'גיטרה' }].map(o => (
                  <button key={o.v}
                    className={`ex3-seg-btn ${settings.instrument === o.v ? 'active' : ''}`}
                    onClick={() => updateSetting('instrument', o.v)}
                    disabled={isActive}>{o.l}</button>
                ))}
              </div>
            </div>

            <div className="ex3-field ex3-field-tempo">
              <label className="ex3-field-label">טמפו: <strong>{settings.tempo} BPM</strong></label>
              <input type="range" min={40} max={160} step={5}
                value={settings.tempo} className="ex3-slider"
                onChange={e => updateSetting('tempo', parseInt(e.target.value))}
                disabled={isActive} />
            </div>
          </div>

          {/* Mic button */}
          <button
            className={`ex3-mic-btn ${micStatus}`}
            onClick={micStatus === 'active' ? stopMic : startMic}
            disabled={micStatus === 'requesting'}
          >
            🎙{' '}
            {micStatus === 'off'        && 'אפשר מיקרופון'}
            {micStatus === 'requesting' && 'מבקש גישה...'}
            {micStatus === 'active'     && 'מיקרופון מחובר ✓  —  לחץ לניתוק'}
            {micStatus === 'error'      && '⚠ שגיאה — לחץ לנסות שוב'}
          </button>

          {/* Note buttons: visible during listen phase (button mode) */}
          {(appState === S.LISTENING && micStatus !== 'active') && (
            <div className="ex3-note-grid">
              {CHROMATIC_NOTES.map(n => (
                <button key={n} className="ex3-note-btn"
                  onClick={() => handleNoteButtonClick(n)}>
                  {n}
                </button>
              ))}
            </div>
          )}

        </div>{/* /ex3-settings-area */}

        {/* ══════════════════════════════════════════════════════════
            BOTTOM CONTROLS
        ══════════════════════════════════════════════════════════ */}
        <div className="ex3-controls">
          {isActive ? (
            <>
              <button className="ex3-ctrl-btn skip" onClick={handleSkip}>
                ↩ דלג
              </button>
              <button className="ex3-ctrl-btn stop" onClick={handleStop}>
                ■ עצור
              </button>
            </>
          ) : (
            <>
              <button className="ex3-ctrl-btn back"
                onClick={() => navigate('/category/melodic')}>
                ← חזרה
              </button>
              <button className="ex3-ctrl-btn start" onClick={handleStart}>
                ▶ נגן <span className="ex3-space-hint">(Space)</span>
              </button>
            </>
          )}
        </div>

      </main>
    </div>
  );
}
