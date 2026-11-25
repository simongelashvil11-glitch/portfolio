/*
 * Dates and durations as the admin pages print them. Times are shown in
 * Tbilisi, where the site's owner reads them, whatever zone the server is in.
 */

export const TIME_ZONE = "Asia/Tbilisi";

const whenFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const clockFormat = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" });
const dayKeyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const dayLabelFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** "24 Nov, 16:15" */
export function when(date: Date): string {
  return whenFormat.format(date);
}

/** "16:15" */
export function clock(date: Date): string {
  return clockFormat.format(date);
}

/** The Tbilisi calendar day as "YYYY-MM-DD", for grouping by day. */
export function dayKey(date: Date): string {
  return dayKeyFormat.format(date);
}

/** "2026-11-24" → "24 Nov" */
export function dayLabel(key: string): string {
  return dayLabelFormat.format(new Date(`${key}T00:00:00Z`));
}

/** The `count` day keys ending with `last`, oldest first. */
export function dayKeysEnding(last: string, count: number): string[] {
  const end = new Date(`${last}T00:00:00Z`).getTime();
  return Array.from({ length: count }, (_, index) =>
    new Date(end - (count - 1 - index) * 86_400_000).toISOString().slice(0, 10),
  );
}

/** 0 → "0s", 75 → "1m 15s", 3700 → "1h 1m" */
export function duration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return seconds % 60 ? `${minutes}m ${seconds % 60}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return minutes % 60 ? `${hours}h ${minutes % 60}m` : `${hours}h`;
}

/** "3 visits", "1 visit" */
export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count.toLocaleString("en-US")} ${count === 1 ? one : many}`;
}
