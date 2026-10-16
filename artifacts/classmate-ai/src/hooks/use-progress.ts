import { useState, useCallback } from "react";

const STORAGE_KEY = "kurspal_progress_v1";

interface DayProgress {
  date: string;
  sessions: number;
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function readProgress(): DayProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { date: getTodayKey(), sessions: 0 };
    const parsed = JSON.parse(raw) as DayProgress;
    if (parsed.date !== getTodayKey()) return { date: getTodayKey(), sessions: 0 };
    return parsed;
  } catch {
    return { date: getTodayKey(), sessions: 0 };
  }
}

export function useProgress() {
  const [sessions, setSessions] = useState(() => readProgress().sessions);

  const trackSession = useCallback(() => {
    const prog = readProgress();
    const updated: DayProgress = { date: getTodayKey(), sessions: prog.sessions + 1 };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
    setSessions(updated.sessions);
  }, []);

  return { sessions, trackSession };
}
