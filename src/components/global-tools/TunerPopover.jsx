/**
 * TunerPopover — compact floating tuner.
 *
 * Mic → AnalyserNode → pitchy McLeod detector → note + cents needle.
 * Two modes: chromatic (any note) | guitar (snaps to EADGBE).
 */

import React, { useEffect, useRef, useState } from 'react';
import { PitchDetector } from 'pitchy';
import { useMicrophone } from './useMicrophone.js';
import { useTools } from './ToolsContext.jsx';
import { analyzeChromatic, analyzeGuitar } from './pitch.js';

const FFT_SIZE = 2048;
const CLARITY_THRESHOLD = 0.9;
const HZ_MIN = 60;
const HZ_MAX = 1320;
const EMA_ALPHA = 0.25;

export default function TunerPopover() {
  const mic = useMicrophone();
  const { getAudioContext } = useTools();
  const [mode, setMode] = useState('chromatic'); // 'chromatic' | 'guitar'
  const [reading, setReading] = useState(null); // { name, octave, cents }
  const [permError, setPermError] = useState(null);

  const rafRef = useRef(0);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const detectorRef = useRef(null);
  const bufRef = useRef(null);
  const emaRef = useRef(0);
  const lastValidRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let acquired = false;

    (async () => {
      try {
        const stream = await mic.acquire();
        if (cancelled) { mic.release(); return; }
        acquired = true;

        const ctx = getAudioContext();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = FFT_SIZE;
        analyser.smoothingTimeConstant = 0;
        source.connect(analyser);

        const detector = PitchDetector.forFloat32Array(FFT_SIZE);
        const buf = new Float32Array(FFT_SIZE);

        sourceRef.current = source;
        analyserRef.current = analyser;
        detectorRef.current = detector;
        bufRef.current = buf;

        const tick = () => {
          if (cancelled) return;
          analyser.getFloatTimeDomainData(buf);
          const [pitch, clarity] = detector.findPitch(buf, ctx.sampleRate);
          if (clarity >= CLARITY_THRESHOLD && pitch >= HZ_MIN && pitch <= HZ_MAX) {
            const smoothed = emaRef.current
              ? emaRef.current + EMA_ALPHA * (pitch - emaRef.current)
              : pitch;
            emaRef.current = smoothed;
            lastValidRef.current = performance.now();
            const r = mode === 'guitar'
              ? analyzeGuitar(smoothed)
              : analyzeChromatic(smoothed);
            if (r) setReading(r);
          } else if (performance.now() - lastValidRef.current > 800) {
            // signal gone — reset
            emaRef.current = 0;
            setReading(null);
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (err) {
        setPermError(err?.message || 'אין הרשאה למיקרופון');
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      try { sourceRef.current?.disconnect(); } catch {}
      try { analyserRef.current?.disconnect(); } catch {}
      sourceRef.current = null;
      analyserRef.current = null;
      detectorRef.current = null;
      bufRef.current = null;
      if (acquired) mic.release();
    };
  }, [mic, getAudioContext, mode]);

  const inTune = reading && Math.abs(reading.cents) <= 5;
  const cents = reading?.cents ?? 0;
  const needlePct = Math.max(-50, Math.min(50, cents)) + 50; // 0..100

  return (
    <div className="gt-popover gt-tuner" role="dialog" aria-label="טיונר">
      <div className="gt-popover-head">
        <div className="gt-mode-toggle" role="tablist">
          <button
            type="button"
            className={`gt-mode-btn ${mode === 'chromatic' ? 'active' : ''}`}
            onClick={() => setMode('chromatic')}
          >כרומטי</button>
          <button
            type="button"
            className={`gt-mode-btn ${mode === 'guitar' ? 'active' : ''}`}
            onClick={() => setMode('guitar')}
          >גיטרה</button>
        </div>
      </div>

      {permError ? (
        <div className="gt-popover-error">{permError}</div>
      ) : (
        <>
          <div className={`gt-tuner-note ${inTune ? 'in-tune' : ''}`}>
            {reading ? (
              <>
                <span className="gt-note-name">{reading.name}</span>
                <span className="gt-note-octave">{reading.octave}</span>
              </>
            ) : (
              <span className="gt-note-placeholder">—</span>
            )}
          </div>
          <div className="gt-cents-bar">
            <div className="gt-cents-track">
              <div className="gt-cents-tick gt-cents-tick-center" />
              <div className="gt-cents-tick gt-cents-tick-edge gt-cents-tick-left" />
              <div className="gt-cents-tick gt-cents-tick-edge gt-cents-tick-right" />
              <div
                className="gt-cents-needle"
                style={{ left: `${needlePct}%` }}
              />
            </div>
            <div className="gt-cents-labels">
              <span>-50</span>
              <span>0</span>
              <span>+50</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
