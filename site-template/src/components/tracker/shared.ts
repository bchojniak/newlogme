/**
 * Shared types and helpers for tracker components.
 */

// ---- Types ----

export interface WindowEvent {
  timestamp: string;
  app_name: string;
  window_title: string | null;
  browser_url: string | null;
}

export interface KeyEvent {
  timestamp: string;
  key_count: number;
}

export interface Note {
  timestamp: string;
  content: string;
}

export interface DayData {
  logical_date: string;
  window_events: WindowEvent[];
  key_events: KeyEvent[];
  notes: Note[];
  blog: string | null;
}

export interface DateInfo {
  logical_date: string;
  label: string;
}

export interface DailySummary {
  logical_date: string;
  total_keys: number;
  unique_apps: number;
}

// ---- Helpers ----

/**
 * Format a duration in seconds to a human-readable string (e.g. "2h 15m").
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

/**
 * Calculate per-app durations from a sorted list of window events.
 * Caps individual gaps at 30 minutes to handle idle periods.
 * Excludes __LOCKEDSCREEN from results.
 */
export function calculateAppDurations(
  events: WindowEvent[]
): { app: string; duration: number }[] {
  const durations: Record<string, number> = {};

  for (let i = 0; i < events.length; i++) {
    const current = new Date(events[i].timestamp);
    const next = events[i + 1]
      ? new Date(events[i + 1].timestamp)
      : current;

    const durationSecs = (next.getTime() - current.getTime()) / 1000;
    const cappedDuration = Math.min(durationSecs, 30 * 60);

    const app = events[i].app_name;
    durations[app] = (durations[app] || 0) + cappedDuration;
  }

  return Object.entries(durations)
    .filter(([app]) => app !== "__LOCKEDSCREEN")
    .sort((a, b) => b[1] - a[1])
    .map(([app, duration]) => ({ app, duration }));
}

/**
 * Chart color palette (CSS custom properties).
 */
export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];
