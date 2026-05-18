/**
 * Reactive Ear Training — Session Hook
 *
 * Manages:
 *   - SoundFontPlayer init + program change
 *   - Chord rotation (noteOn/noteOff every N seconds)
 *   - Session timer (countdown, finishes on its own)
 *   - Reveal window (last 5 sec of each chord)
 *   - Auto-reveal toggle (persisted in localStorage)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import * as SFP from '../../../lib/soundfont/SoundFontPlayer';
import { buildRandomPool, buildDiatonicPool, pickNextChord, pickRandomKey } from './reactiveChordPool';
import { SOUNDS, REVEAL_WINDOW_SEC } from './reactiveConstants';

const LS_AUTO_REVEAL = 'reactive.autoReveal';

function readAutoReveal() {
  try { return localStorage.getItem(LS_AUTO_REVEAL) === 'true'; }
  catch { return false; }
}
function writeAutoReveal(v) {
  try { localStorage.setItem(LS_AUTO_REVEAL, v ? 'true' : 'false'); }
  catch { /* ignore */ }
}

export function useReactiveSession({ mode, tier, sound, chordDuration, sessionMinutes, diatonicKey }) {
  // ---- state ----
  const [isPlaying, setIsPlaying] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initError, setInitError] = useState(null);
  const [currentChord, setCurrentChord] = useState(null);
  const [revealShown, setRevealShown] = useState(false);
  const [revealBlink, setRevealBlink] = useState(false);
  const [autoReveal, setAutoRevealState] = useState(readAutoReveal);
  const [sessionTimeLeft, setSessionTimeLeft] = useState(null); // seconds or null=infinite
  const [sessionEnded, setSessionEnded] = useState(false);
  const [activeKey, setActiveKey] = useState(null); // for diatonic mode display

  // ---- refs (mutable, don't trigger re-renders) ----
  const playingChordRef = useRef(null);     // chord currently sounding (for noteOff on next switch)
  const channelRef = useRef(SOUNDS[0].channel);
  const nextChordTimerRef = useRef(null);
  const revealTimerRef = useRef(null);
  const sessionTickRef = useRef(null);
  const sessionEndAtRef = useRef(null);
  const autoRevealRef = useRef(autoReveal);
  // activeKey: state is for display only — ref is the source of truth inside timers,
  // because setActiveKey is async and the first playNextChord fires before React re-renders.
  const activeKeyRef = useRef(null);
  const modeRef = useRef(mode);
  const tierRef = useRef(tier);
  const chordDurationRef = useRef(chordDuration);
  // Whether the last-played chord was a mixture (tier 5/6 in R1).
  // Used to enforce "no consecutive mixtures" rule.
  const lastWasMixtureRef = useRef(false);

  // keep refs in sync with latest props/state
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { tierRef.current = tier; }, [tier]);
  useEffect(() => { chordDurationRef.current = chordDuration; }, [chordDuration]);

  // Sync autoReveal to ref so latest value is read inside timeouts
  useEffect(() => { autoRevealRef.current = autoReveal; }, [autoReveal]);

  const setAutoReveal = useCallback((v) => {
    setAutoRevealState(v);
    writeAutoReveal(v);
  }, []);

  // ---- audio helpers ----
  const stopCurrentChord = useCallback(() => {
    const c = playingChordRef.current;
    if (c) {
      for (const m of c.midiNotes) SFP.noteOff(channelRef.current, m);
      playingChordRef.current = null;
    }
  }, []);

  const startChord = useCallback((chord) => {
    if (!chord) return;
    for (const m of chord.midiNotes) SFP.noteOn(channelRef.current, m, 90);
    playingChordRef.current = chord;
  }, []);

  // ---- end-of-session bell (uses an extra channel) ----
  const playEndBell = useCallback(() => {
    const bellCh = 14;
    SFP.programChange(bellCh, 14); // Tubular Bells
    const now = SFP.getAudioContext?.()?.currentTime ?? 0;
    SFP.noteOn(bellCh, 76, 80);
    setTimeout(() => SFP.noteOff(bellCh, 76), 800);
    setTimeout(() => SFP.noteOn(bellCh, 72, 70), 600);
    setTimeout(() => SFP.noteOff(bellCh, 72), 1800);
  }, []);

  // ---- core chord rotation ----
  // Stable callback — reads everything from refs so it survives across closures
  // (setTimeout captures the function at scheduling time; stale closures would
  // freeze tier/key/mode at session start)
  const playNextChord = useCallback(() => {
    const curMode = modeRef.current;
    const curTier = tierRef.current;
    const curKey  = activeKeyRef.current;
    const curDur  = chordDurationRef.current;

    const pool = curMode === 'diatonic'
      ? buildDiatonicPool(curKey || 'C', curTier)
      : buildRandomPool(curTier);

    const prev = playingChordRef.current;
    const next = pickNextChord(pool, prev, lastWasMixtureRef.current);
    if (!next) return;
    lastWasMixtureRef.current = (next.mixtureLevel ?? 0) >= 1;

    stopCurrentChord();
    startChord(next);
    setCurrentChord(next);
    setRevealShown(false);
    setRevealBlink(false);

    // reveal window timer (last REVEAL_WINDOW_SEC seconds)
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    const revealAt = Math.max(0, (curDur - REVEAL_WINDOW_SEC) * 1000);
    revealTimerRef.current = setTimeout(() => {
      setRevealBlink(true);
      if (autoRevealRef.current) setRevealShown(true);
    }, revealAt);

    // schedule next chord
    if (nextChordTimerRef.current) clearTimeout(nextChordTimerRef.current);
    nextChordTimerRef.current = setTimeout(playNextChord, curDur * 1000);
  }, [stopCurrentChord, startChord]);

  // ---- session lifecycle ----
  const stopSession = useCallback((endedByTimer = false) => {
    if (nextChordTimerRef.current) { clearTimeout(nextChordTimerRef.current); nextChordTimerRef.current = null; }
    if (revealTimerRef.current)    { clearTimeout(revealTimerRef.current);    revealTimerRef.current = null; }
    if (sessionTickRef.current)    { clearInterval(sessionTickRef.current);   sessionTickRef.current = null; }
    stopCurrentChord();
    setIsPlaying(false);
    setRevealBlink(false);
    if (endedByTimer) {
      setSessionEnded(true);
      playEndBell();
    }
  }, [stopCurrentChord, playEndBell]);

  const startSession = useCallback(async () => {
    setSessionEnded(false);
    setInitError(null);
    lastWasMixtureRef.current = false; // reset at session start

    // 1. init SoundFont if needed
    if (!SFP.isReady()) {
      setIsInitializing(true);
      try {
        await SFP.init(() => {});
      } catch (e) {
        setInitError(e?.message || 'שגיאה באתחול הסאונד');
        setIsInitializing(false);
        return;
      }
      setIsInitializing(false);
    }
    SFP.resumeAudio?.();

    // 2. apply sound (program change on the chosen channel)
    const soundDef = SOUNDS.find(s => s.id === sound) || SOUNDS[0];
    channelRef.current = soundDef.channel;
    SFP.programChange(soundDef.channel, soundDef.gm);

    // 3. resolve key for diatonic mode
    // CRITICAL: write to ref BEFORE first playNextChord — state set is async.
    if (mode === 'diatonic') {
      const k = (diatonicKey === 'random' || !diatonicKey) ? pickRandomKey() : diatonicKey;
      activeKeyRef.current = k;
      setActiveKey(k);
    } else {
      activeKeyRef.current = null;
      setActiveKey(null);
    }

    // 4. start session timer
    if (sessionMinutes > 0) {
      const totalSec = sessionMinutes * 60;
      setSessionTimeLeft(totalSec);
      sessionEndAtRef.current = Date.now() + totalSec * 1000;
      if (sessionTickRef.current) clearInterval(sessionTickRef.current);
      sessionTickRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.round((sessionEndAtRef.current - Date.now()) / 1000));
        setSessionTimeLeft(remaining);
        if (remaining <= 0) {
          stopSession(true);
        }
      }, 250);
    } else {
      setSessionTimeLeft(null);
    }

    setIsPlaying(true);
    // tiny delay so program change settles before noteOn
    setTimeout(() => playNextChord(), 80);
  }, [sound, mode, diatonicKey, sessionMinutes, playNextChord, stopSession]);

  const revealNow = useCallback(() => setRevealShown(true), []);

  // ---- cleanup on unmount ----
  useEffect(() => {
    return () => {
      if (nextChordTimerRef.current) clearTimeout(nextChordTimerRef.current);
      if (revealTimerRef.current)    clearTimeout(revealTimerRef.current);
      if (sessionTickRef.current)    clearInterval(sessionTickRef.current);
      const c = playingChordRef.current;
      if (c) for (const m of c.midiNotes) SFP.noteOff(channelRef.current, m);
    };
  }, []);

  return {
    isPlaying,
    isInitializing,
    initError,
    currentChord,
    revealShown,
    revealBlink,
    autoReveal,
    sessionTimeLeft,
    sessionEnded,
    activeKey,
    startSession,
    stopSession,
    revealNow,
    setAutoReveal,
  };
}
