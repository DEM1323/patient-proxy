import { useCallback, useState } from "react";

const prefix = "patient-proxy:";

/**
 * State that survives a reload of this tab, for requests whose response may
 * have been lost. Storage can be unavailable (private windows, blocked site
 * data); the state then lasts only as long as the page.
 */
export function useSessionState<T>(
  key: string,
): [T | null, (value: T | null) => void] {
  const [value, setValue] = useState<T | null>(() => read<T>(key));
  const update = useCallback(
    (next: T | null) => {
      write(key, next);
      setValue(next);
    },
    [key],
  );
  return [value, update];
}

function read<T>(key: string): T | null {
  try {
    const stored = window.sessionStorage.getItem(prefix + key);
    return stored === null ? null : (JSON.parse(stored) as T);
  } catch {
    return null;
  }
}

function write<T>(key: string, value: T | null) {
  try {
    if (value === null) {
      window.sessionStorage.removeItem(prefix + key);
    } else {
      window.sessionStorage.setItem(prefix + key, JSON.stringify(value));
    }
  } catch {
    // The in-memory state still applies for this page.
  }
}
