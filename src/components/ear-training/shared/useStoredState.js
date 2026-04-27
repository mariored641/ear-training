import { useState, useCallback } from 'react';

/**
 * State hook that persists string values to localStorage.
 * Returns [value, setValue] like useState. setValue writes through to storage.
 */
export function useStoredState(storageKey, defaultValue) {
  const [val, setVal] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored !== null ? stored : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setStored = useCallback((v) => {
    setVal(v);
    try {
      localStorage.setItem(storageKey, String(v));
    } catch {}
  }, [storageKey]);

  return [val, setStored];
}
