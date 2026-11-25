import { gte, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import { visits } from "@/db/schema";

/** The time ranges the Visitors and Signals pages and their CSV exports offer. */
export const RANGES = [
  { key: "24h", label: "24 hours", days: 1 },
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
  { key: "all", label: "All time", days: null },
] as const;

export type Range = (typeof RANGES)[number];

/** The range named in the URL, defaulting to 30 days. */
export function pickRange(requested: unknown): Range {
  return RANGES.find((item) => item.key === requested) ?? RANGES[2];
}

/**
 * The cutoff is worked out by the database, so nothing reads the clock while
 * rendering. The column holds UTC without a zone, so "now" is taken in UTC to
 * compare like with like.
 */
export function rangeCutoff(range: Range): SQL | null {
  return range.days ? sql`(now() at time zone 'UTC') - make_interval(days => ${range.days})` : null;
}

/**
 * A where-clause for the range, or undefined for all time. `visits` keeps
 * UTC without a zone; `signals` (created by hand) keeps a real timestamptz,
 * which compares against now() directly — pass `zoned` for that one.
 */
export function inRange(
  range: Range,
  column: AnyPgColumn = visits.createdAt,
  { zoned = false }: { zoned?: boolean } = {},
): SQL | undefined {
  if (!range.days) return undefined;
  return gte(column, zoned ? sql`now() - make_interval(days => ${range.days})` : rangeCutoff(range)!);
}
