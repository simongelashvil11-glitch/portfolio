/* Formatting shared by CreativeOS's server pages and its client components. */

/** "$0.0123" for small sums, "$1.23" otherwise, "—" when unknown. */
export function usd(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "—";
  if (amount === 0) return "$0.00";
  return amount < 0.1 ? `$${amount.toFixed(4)}` : `$${amount.toFixed(2)}`;
}

/** 12345 → "12,345" */
export function count(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : value.toLocaleString("en-US");
}

/** Spoken length of a script at a natural ad pace (~150 words a minute). */
export function spokenSeconds(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.round((words / 150) * 60);
}

export const EFFORTS = ["low", "medium", "high"] as const;
export type Effort = (typeof EFFORTS)[number];

export const STATUS_LABEL: Record<string, string> = {
  authorized: "Authorized",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
  refused: "Declined by the model",
  blocked: "Blocked by budget",
};
