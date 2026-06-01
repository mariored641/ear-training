/**
 * MetronomePopover — compact metronome with BPM, beats-per-bar dots, +/- controls.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AudioMetronome } from '../../lib/audio/AudioMetronome.js';
import { useTools } from './ToolsContext.jsx';

const BPM_MIN = 40;
const BPM_MAX = 240;
const BEATS_MIN = 2;
const BEATS_MAX = 8;

export default function MetronomePopover() {
  const { getAudioContext } = useTools();
  const [bpm, setBpm] = useState(100);
  const [beatsPerBar, setBeatsPerBar] = useState(4);
  const [isRunning, setIsRunning] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(-1);

  const metroRef = useRef(null);
  const tapsRef = useRef([]);

  useEffect(() => () => {
    try { metroRef.current?.stop(); } catch {}
    metroRef.current = null;
  }, []);

  useEffect(() => {
    if (metroRef.current) metroRef.current.setTempo(bpm);
  }, [bpm]);

  useEffect(() => {
    if (metroRef.current) metroRef.current.setBeatsPerBar(beatsPerBar);
  }, [beatsPerBar]);

  const handleStart = useCallback(() => {
    const ctx = getAudioContext();
    const metro = new AudioMetronome(ctx, bpm, {
      beatsPerBar,
      onBeat: (beatInBar) => setCurrentBeat(beatInBar),
    });
    metroRef.current = metro;
    metro.start(ctx.currentTime + 0.05);
    setIsRunning(true);
  }, [getAudioContext, bpm, beatsPerBar]);

  const handleStop = useCallback(() => {
    try { metroRef.current?.stop(); } catch {}
    metroRef.current = null;
    setIsRunning(false);
    setCurrentBeat(-1);
  }, []);

  const toggle = () => (isRunning ? handleStop() : handleStart());

  const bumpBpm = (delta) => {
    setBpm((b) => Math.max(BPM_MIN, Math.min(BPM_MAX, b + delta)));
  };

  const bumpBeats = (delta) => {
    setBeatsPerBar((n) => Math.max(BEATS_MIN, Math.min(BEATS_MAX, n + delta)));
  };

  const handleTap = () => {
    const now = performance.now();
    const taps = tapsRef.current;
    if (taps.length && now - taps[taps.length - 1] > 2000) taps.length = 0;
    taps.push(now);
    if (taps.length > 4) taps.shift();
    if (taps.length >= 2) {
      const intervals = [];
      for (let i = 1; i < taps.length; i++) intervals.push(taps[i] - taps[i - 1]);
      const sorted = [...intervals].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const newBpm = Math.round(60000 / median);
      if (newBpm >= BPM_MIN && newBpm <= BPM_MAX) setBpm(newBpm);
    }
  };

  return (
    <div className="gt-popover gt-metro" role="dialog" aria-label="מטרונום">
      <div className="gt-metro-bpm-row">
        <button type="button" className="gt-step-btn" onClick={() => bumpBpm(-1)} aria-label="−1 BPM">−</button>
        <div className="gt-metro-bpm">
          <span className="gt-metro-bpm-num">{bpm}</span>
          <span className="gt-metro-bpm-lbl">BPM</span>
        </div>
        <button type="button" className="gt-step-btn" onClick={() => bumpBpm(1)} aria-label="+1 BPM">+</button>
      </div>

      <input
        type="range"
        className="gt-metro-slider"
        min={BPM_MIN}
        max={BPM_MAX}
        step={1}
        value={bpm}
        onChange={(e) => setBpm(Number(e.target.value))}
        aria-label="BPM"
      />

      <div className="gt-metro-dots-row">
        <button type="button" className="gt-step-btn gt-step-btn-sm" onClick={() => bumpBeats(-1)} aria-label="הורד נקודה">−</button>
        <div className="gt-metro-dots">
          {Array.from({ length: beatsPerBar }).map((_, i) => (
            <div
              key={i}
              className={`gt-metro-dot ${i === 0 ? 'accent' : ''} ${currentBeat === i ? 'live' : ''}`}
            />
          ))}
        </div>
        <button type="button" className="gt-step-btn gt-step-btn-sm" onClick={() => bumpBeats(1)} aria-label="הוסף נקודה">+</button>
      </div>

      <div className="gt-metro-actions">
        <button type="button" className="gt-tap-btn" onClick={handleTap}>TAP</button>
        <button
          type="button"
          className={`gt-startstop-btn ${isRunning ? 'is-on' : ''}`}
          onClick={toggle}
        >
          {isRunning ? 'עצור' : 'הפעל'}
        </button>
      </div>
    </div>
  );
}
