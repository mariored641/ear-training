import { usePersistentState } from '../../../utils/lastState';

/** Migrate legacy string settings without changing their existing storage. */
export function useStoredState(storageKey, defaultValue) {
  let fallback = defaultValue;
  try { fallback = localStorage.getItem(storageKey) ?? defaultValue; } catch {}
  return usePersistentState('ear-settings', storageKey, fallback);
}
