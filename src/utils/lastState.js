import { useEffect, useRef } from 'react';

/**
 * Lightweight per-tool memory. Each tool stores one JSON blob:
 *   { v: <version>, data: { ...plain fields } }
 * A bad, missing, or outdated blob falls back to the caller's defaults.
 * Playback flags are never part of this store — callers simply omit them.
 */
const PREFIX = 'ear-training:last-state:';

function keyFor(toolId) {
  return PREFIX + toolId;
}

export function readLastState(toolId, version, fallback) {
  try {
    const raw = localStorage.getItem(keyFor(toolId));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.v !== version || !parsed.data || typeof parsed.data !== 'object' || Array.isArray(parsed.data)) {
      return fallback;
    }
    return { ...fallback, ...parsed.data };
  } catch {
    return fallback;
  }
}

export function writeLastState(toolId, version, data) {
  try {
    const clean = JSON.parse(JSON.stringify(data));
    localStorage.setItem(keyFor(toolId), JSON.stringify({ v: version, data: clean }));
  } catch {
    // Private mode or a full disk. The page still works from memory.
  }
}

/** Write `data` whenever it changes. Safe to call with a fresh object each render. */
export function useRemember(toolId, version, data) {
  const previous = useRef('');
  let json = '';
  try { json = JSON.stringify(data); } catch { json = ''; }

  useEffect(() => {
    if (!json || json === previous.current) return;
    previous.current = json;
    writeLastState(toolId, version, JSON.parse(json));
  }, [toolId, version, json]);
}
