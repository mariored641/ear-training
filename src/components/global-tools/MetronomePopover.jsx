/**
 * MetronomePopover — compact metronome with BPM, beats-per-bar dots, +/- controls.
 * State lives in ToolsContext so the metronome survives panel close / navigation.
 */

import React, { useEffect, useRef } from 'react';
import { useTools } from './ToolsContext.jsx';

const BPM_MIN = 40;
const BPM_MAX = 240;
const BEATS_MIN = 2;
const BEATS_MAX = 8;

export default function MetronomePopover() {
  const {
    metroBpm, setMetroBpm,
    metroBeatsPerBar, setMetroBeatsPerBar,
    metroVolume, setMetroVolume,
    metroIsRunning, metroCurrentBeat,
    metroStart, metroStop,
    metroKeepAlive, setMetroKeepAlive,
  } = useTools();

  const tapsRef = useRef([]);

  // Keep a ref to the current keepAlive so the cleanup can read it without stale closure
  const keepAliveRef = useRef(metroKeepAlive);
  useEffect(() => { keepAliveRef.current = metroKeepAlive; }, [metroKeepAlive]);

  // Stop metro when panel closes, unless keepAlive is on
  useEffect(() => () => {
    if (!keepAliveRef.current) metroStop();
  }, [metroStop]);

  const toggle = () => (metroIsRunning ? metroStop() : metroStart());

  const bumpBpm = (delta) => {
    setMetroBpm(Math.max(BPM_MIN, Math.min(BPM_MAX, metroBpm + delta)));
  };

  const bumpBeats = (delta) => {
    setMetroBeatsPerBar(Math.max(BEATS_MIN, Math.min(BEATS_MAX, metroBeatsPerBar + delta)));
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
      if (newBpm >= BPM_MIN && newBpm <= BPM_MAX) setMetroBpm(newBpm);
    }
  };

  return (
    <div className="gt-popover gt-metro" role="dialog" aria-label="מטרונום">
      <div className="gt-metro-bpm-row">
        <button type="button" className="gt-step-btn" onClick={() => bumpBpm(-1)} aria-label="−1 BPM">−</button>
        <div className="gt-metro-bpm">
          <span className="gt-metro-bpm-num">{metroBpm}</span>
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
        value={metroBpm}
        onChange={(e) => setMetroBpm(Number(e.target.value))}
        aria-label="BPM"
      />

      <div className="gt-metro-volume-row">
        <span className="gt-metro-volume-icon">{metroVolume === 0 ? '🔇' : metroVolume < 0.5 ? '🔈' : '🔊'}</span>
        <input
          type="range"
          className="gt-metro-slider"
          min={0}
          max={1}
          step={0.05}
          value={metroVolume}
          onChange={(e) => setMetroVolume(Number(e.target.value))}
          aria-label="עוצמת קול"
        />
        <span className="gt-metro-volume-pct">{Math.round(metroVolume * 100)}%</span>
      </div>

      <div className="gt-metro-dots-row">
        <button type="button" className="gt-step-btn gt-step-btn-sm" onClick={() => bumpBeats(-1)} aria-label="הורד נקודה">−</button>
        <div className="gt-metro-dots">
          {Array.from({ length: metroBeatsPerBar }).map((_, i) => (
            <div
              key={i}
              className={`gt-metro-dot ${i === 0 ? 'accent' : ''} ${metroCurrentBeat === i ? 'live' : ''}`}
            />
          ))}
        </div>
        <button type="button" className="gt-step-btn gt-step-btn-sm" onClick={() => bumpBeats(1)} aria-label="הוסף נקודה">+</button>
      </div>

      <div className="gt-metro-actions">
        <button type="button" className="gt-tap-btn" onClick={handleTap}>TAP</button>
        <button
          type="button"
          className={`gt-startstop-btn ${metroIsRunning ? 'is-on' : ''}`}
          onClick={toggle}
        >
          {metroIsRunning ? 'עצור' : 'הפעל'}
        </button>
      </div>

      <button
        type="button"
        className={`gt-metro-keepalive-btn ${metroKeepAlive ? 'is-on' : ''}`}
        onClick={() => setMetroKeepAlive(!metroKeepAlive)}
        aria-pressed={metroKeepAlive}
      >
        המשך ברקע
      </button>
    </div>
  );
}
