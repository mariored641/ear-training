import { useEffect, useRef, useState } from 'react';
import { readLastState, writeLastState } from './stateStore.js';
export { readLastState, writeLastState, hasLastState } from './stateStore.js';

/** Debounce edits, but flush synchronously on route unmount/background/close. */
export function useRemember(toolId, version, data) {
  let json = '';
  try { json = JSON.stringify(data); } catch { /* Ignore non-serializable transient data. */ }
  const latest = useRef(json);
  latest.current = json;
  const written = useRef(null);
  const flush = () => {
    if (!latest.current || written.current === latest.current) return;
    writeLastState(toolId, version, JSON.parse(latest.current));
    written.current = latest.current;
  };
  useEffect(() => {
    const timer = setTimeout(flush, 180);
    return () => clearTimeout(timer);
  }, [toolId, version, json]);
  useEffect(() => {
    const hidden = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      flush();
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [toolId, version]);
}

export function usePersistentState(toolId, field, fallback) {
  const [value, setValue] = useState(() => readLastState(`${toolId}.${field}`, 1, { value: fallback }).value);
  useRemember(`${toolId}.${field}`, 1, { value });
  return [value, setValue];
}
