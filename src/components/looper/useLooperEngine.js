import { useCallback, useEffect, useMemo, useState } from 'react';
import { audioEngine } from '../../lib/looperEngine';

export default function useLooperEngine() {
  const [snapshot, setSnapshot] = useState(() => audioEngine.getSnapshot());
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [recordingElapsed, setRecordingElapsed] = useState(0);
  const [inputLevel, setInputLevel] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = audioEngine.subscribe(setSnapshot);
    audioEngine.restoreLatest().catch(() => {});
    return () => {
      unsubscribe();
      audioEngine.dispose();
    };
  }, []);

  useEffect(() => {
    const active = ['playing', 'recording', 'counting-in'].includes(snapshot.engineState);
    if (!active) {
      setCurrentBeat(-1);
      setPlaybackPosition(0);
      if (snapshot.engineState !== 'recording') setRecordingElapsed(0);
      return undefined;
    }

    let rafId;
    let lastPaint = 0;
    const poll = (now) => {
      if (now - lastPaint >= 33) {
        setPlaybackPosition(audioEngine.getPlaybackPosition());
        setCurrentBeat(audioEngine.getBeatIndex());
        setRecordingElapsed(audioEngine.getRecordingElapsed());
        setInputLevel(audioEngine.getInputLevel());
        lastPaint = now;
      }
      rafId = requestAnimationFrame(poll);
    };
    rafId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rafId);
  }, [snapshot.engineState]);

  const run = useCallback(async (operation) => {
    try {
      setError('');
      return await operation();
    } catch (operationError) {
      setError(operationError?.message || 'הפעולה לא הצליחה.');
      return undefined;
    }
  }, []);

  const actions = useMemo(() => ({
    play: () => run(() => audioEngine.play()),
    stop: () => audioEngine.stop(),
    startRecording: (trackId) => run(() => audioEngine.startRecordingTrack(trackId)),
    stopRecording: () => run(() => audioEngine.stopRecordingTrack(snapshot.activeRecordingTrackId)),
    setTrackVolume: (trackId, value) => audioEngine.setTrackVolume(trackId, value),
    setTrackMute: (trackId, value) => audioEngine.setTrackMute(trackId, value),
    setTrackSolo: (trackId, value) => audioEngine.setTrackSolo(trackId, value),
    setTrackPan: (trackId, value) => audioEngine.setTrackPan(trackId, value),
    renameTrack: (trackId, label) => audioEngine.renameTrack(trackId, label),
    deleteTrack: (trackId) => audioEngine.deleteTrack(trackId),
    undoLast: () => audioEngine.undoLastRecording(),
    setBpm: (value) => audioEngine.setBpm(value),
    tapTempo: () => audioEngine.tapTempo(),
    setTimeSignature: (numerator, denominator) => audioEngine.setTimeSignature(numerator, denominator),
    setCountInBars: (value) => audioEngine.setCountInBars(value),
    setClickVolume: (value) => audioEngine.setClickVolume(value),
    resetSession: () => run(() => audioEngine.resetSession()),
    exportMix: async (options) => {
      try {
        setError('');
        return await audioEngine.exportMix(options);
      } catch (exportError) {
        setError(exportError?.message || 'הייצוא לא הצליח.');
        throw exportError;
      }
    },
    clearError: () => setError(''),
  }), [run, snapshot.activeRecordingTrackId]);

  return {
    ...snapshot,
    playbackPosition,
    currentBeat,
    recordingElapsed,
    inputLevel,
    error,
    actions,
  };
}
