"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Small persisted UI preference (last-used account, collapsed sections).
 * Reads after mount so server and client markup match.
 */
export function useLocalPreference<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(`sprout:${key}`);
      if (raw != null) setValue(JSON.parse(raw) as T);
    } catch {
      // Ignore corrupt or unavailable storage.
    }
    setReady(true);
  }, [key]);

  const update = useCallback(
    (next: T | ((current: T) => T)) => {
      setValue((current) => {
        const resolved = typeof next === "function" ? (next as (current: T) => T)(current) : next;
        try {
          window.localStorage.setItem(`sprout:${key}`, JSON.stringify(resolved));
        } catch {
          // Storage may be full or blocked; the in-memory value still applies.
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, update, ready] as const;
}
