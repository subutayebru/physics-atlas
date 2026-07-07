import { useCallback, useState } from 'react';

const STORAGE_KEY = 'physics-atlas-progress-v1';

function load(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

export interface Progress {
  done: Set<string>;
  isDone: (id: string) => boolean;
  toggle: (id: string) => void;
}

export function useProgress(): Progress {
  const [done, setDone] = useState<Set<string>>(load);

  const toggle = useCallback((id: string) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // private mode / quota — progress just won't persist
      }
      return next;
    });
  }, []);

  const isDone = useCallback((id: string) => done.has(id), [done]);

  return { done, isDone, toggle };
}
