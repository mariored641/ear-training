/**
 * useMicrophone — module-level singleton for a shared MediaStream.
 *
 * Reference-counted: multiple consumers (Tuner + Recorder) share one stream and
 * one permission prompt. Stream is closed when the last subscriber releases.
 */

import { useEffect, useState, useCallback } from 'react';

let currentStream = null;
let refCount = 0;
let pendingPromise = null;
let permissionState = 'unknown'; // 'unknown' | 'granted' | 'denied'
let releaseTimer = null;
const listeners = new Set();

function notify() {
  for (const fn of listeners) {
    try { fn({ permissionState, hasStream: !!currentStream }); } catch {}
  }
}

async function acquireStream() {
  if (currentStream && currentStream.active) {
    refCount++;
    return currentStream;
  }
  if (pendingPromise) {
    await pendingPromise;
    refCount++;
    return currentStream;
  }
  pendingPromise = navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  }).then((stream) => {
    currentStream = stream;
    permissionState = 'granted';
    pendingPromise = null;
    notify();
    return stream;
  }).catch((err) => {
    permissionState = 'denied';
    pendingPromise = null;
    notify();
    throw err;
  });
  await pendingPromise;
  refCount++;
  return currentStream;
}

function releaseStream() {
  if (refCount > 0) refCount--;
  if (refCount === 0) {
    if (releaseTimer) clearTimeout(releaseTimer);
    releaseTimer = setTimeout(() => {
      if (refCount === 0 && currentStream) {
        try {
          for (const t of currentStream.getTracks()) t.stop();
        } catch {}
        currentStream = null;
        notify();
      }
      releaseTimer = null;
    }, 0);
  }
}

export function useMicrophone() {
  const [state, setState] = useState({ permissionState, hasStream: !!currentStream });

  useEffect(() => {
    const fn = (s) => setState(s);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);

  const acquire = useCallback(() => acquireStream(), []);
  const release = useCallback(() => releaseStream(), []);

  return {
    acquire,
    release,
    permissionState: state.permissionState,
    hasStream: state.hasStream,
  };
}

export function getCurrentStream() {
  return currentStream;
}
