/**
 * ToolsContext — provider for the global tools FAB.
 *
 * Owns:
 *  - Shared AudioContext (lazy, resumed on first user gesture).
 *  - Recorder state machine (survives navigation between pages).
 */

import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { useMicrophone } from './useMicrophone.js';
import { AudioMetronome } from '../../lib/audio/AudioMetronome.js';

const ToolsContext = createContext(null);

export function useTools() {
  const ctx = useContext(ToolsContext);
  if (!ctx) throw new Error('useTools must be used within <ToolsProvider>');
  return ctx;
}

function pickMime() {
  if (typeof MediaRecorder === 'undefined') return null;
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4;codecs=mp4a.40.5',
    'audio/mp4',
  ];
  for (const m of candidates) {
    try { if (MediaRecorder.isTypeSupported(m)) return m; } catch {}
  }
  return '';
}

function mimeToExt(mime) {
  if (!mime) return 'webm';
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('mp4')) return 'm4a';
  return 'webm';
}

const METRO_BPM_KEY = 'globalTools.metro.bpm';
const METRO_KEEP_ALIVE_KEY = 'globalTools.metro.keepAlive';

function readMetroBpm() {
  try { const v = Number(localStorage.getItem(METRO_BPM_KEY)); return v >= 40 && v <= 240 ? v : 100; } catch { return 100; }
}
function readMetroKeepAlive() {
  try { return localStorage.getItem(METRO_KEEP_ALIVE_KEY) === 'true'; } catch { return false; }
}

export function ToolsProvider({ children }) {
  const audioCtxRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(0);
  const mime = useRef(pickMime());

  // ─── Metronome (instance lives here so it survives panel close / navigation) ───
  const metroRef = useRef(null);
  const metroBpmRef = useRef(readMetroBpm());
  const metroBeatsPerBarRef = useRef(4);
  const [metroBpm, setMetroBpmState] = useState(metroBpmRef.current);
  const [metroBeatsPerBar, setMetroBeatsPerBarState] = useState(4);
  const [metroIsRunning, setMetroIsRunning] = useState(false);
  const [metroCurrentBeat, setMetroCurrentBeat] = useState(-1);
  const [metroKeepAlive, setMetroKeepAliveState] = useState(readMetroKeepAlive);

  // Cleanup on unmount
  useEffect(() => () => {
    try { metroRef.current?.stop(); } catch {}
    metroRef.current = null;
  }, []);

  const [recordingState, setRecordingState] = useState('idle'); // 'idle' | 'starting' | 'recording' | 'ready'
  const [lastResult, setLastResult] = useState(null); // { blob, mime, ext, durationSec, url }
  const [error, setError] = useState(null);

  const mic = useMicrophone();

  const setMetroBpm = useCallback((bpm) => {
    metroBpmRef.current = bpm;
    setMetroBpmState(bpm);
    try { localStorage.setItem(METRO_BPM_KEY, String(bpm)); } catch {}
    if (metroRef.current) metroRef.current.setTempo(bpm);
  }, []);

  const setMetroBeatsPerBar = useCallback((n) => {
    metroBeatsPerBarRef.current = n;
    setMetroBeatsPerBarState(n);
    if (metroRef.current) metroRef.current.setBeatsPerBar(n);
  }, []);

  const setMetroKeepAlive = useCallback((val) => {
    setMetroKeepAliveState(val);
    try { localStorage.setItem(METRO_KEEP_ALIVE_KEY, String(val)); } catch {}
  }, []);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new Ctx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  const metroStart = useCallback(() => {
    const ctx = getAudioContext();
    const metro = new AudioMetronome(ctx, metroBpmRef.current, {
      beatsPerBar: metroBeatsPerBarRef.current,
      onBeat: (beatInBar) => setMetroCurrentBeat(beatInBar),
    });
    metroRef.current = metro;
    metro.start(ctx.currentTime + 0.05);
    setMetroIsRunning(true);
  }, [getAudioContext]);

  const metroStop = useCallback(() => {
    try { metroRef.current?.stop(); } catch {}
    metroRef.current = null;
    setMetroIsRunning(false);
    setMetroCurrentBeat(-1);
  }, []);

  const startRecording = useCallback(async () => {
    if (recordingState !== 'idle') return;
    setError(null);
    setRecordingState('starting');
    try {
      const stream = await mic.acquire();
      chunksRef.current = [];
      const m = mime.current;
      const rec = m
        ? new MediaRecorder(stream, { mimeType: m })
        : new MediaRecorder(stream);
      rec.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      rec.onstop = () => {
        const effectiveMime = m || (chunksRef.current[0]?.type) || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: effectiveMime });
        const durationSec = Math.round((Date.now() - startedAtRef.current) / 1000);
        const url = URL.createObjectURL(blob);
        const ext = mimeToExt(effectiveMime);
        setLastResult({ blob, mime: effectiveMime, ext, durationSec, url });
        setRecordingState('ready');
        mediaRecorderRef.current = null;
        chunksRef.current = [];
        mic.release();
      };
      rec.onerror = (ev) => {
        setError(ev?.error?.message || 'Recording error');
        setRecordingState('idle');
        mic.release();
      };
      mediaRecorderRef.current = rec;
      startedAtRef.current = Date.now();
      rec.start(250);
      setRecordingState('recording');
    } catch (err) {
      setError(err?.message || 'Microphone access denied');
      setRecordingState('idle');
    }
  }, [recordingState, mic]);

  const stopRecording = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state === 'inactive') return;
    try { rec.stop(); } catch {}
  }, []);

  const clearResult = useCallback(() => {
    if (lastResult?.url) {
      try { URL.revokeObjectURL(lastResult.url); } catch {}
    }
    setLastResult(null);
    setRecordingState('idle');
  }, [lastResult]);

  const getRecordingStartedAt = useCallback(() => startedAtRef.current, []);

  const value = {
    getAudioContext,
    recordingState,
    lastResult,
    error,
    startRecording,
    stopRecording,
    clearResult,
    getRecordingStartedAt,
    micPermission: mic.permissionState,
    // Metronome
    metroBpm,
    setMetroBpm,
    metroBeatsPerBar,
    setMetroBeatsPerBar,
    metroIsRunning,
    metroCurrentBeat,
    metroStart,
    metroStop,
    metroKeepAlive,
    setMetroKeepAlive,
  };

  return <ToolsContext.Provider value={value}>{children}</ToolsContext.Provider>;
}
