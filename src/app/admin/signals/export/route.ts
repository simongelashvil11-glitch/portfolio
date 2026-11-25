import { desc } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { db } from "@/db";
import { signals, type Signal } from "@/db/schema";
import { describeSignal } from "@/lib/activity";
import { getSession } from "@/lib/auth";
import { csvResponse } from "@/lib/csv";
import { inRange, pickRange } from "@/lib/visit-ranges";

/*
 * Every engagement signal in the chosen range as a CSV file, newest first,
 * each with a plain-words description beside its raw fields. Admin only: the
 * middleware guards /admin/*, and the session is checked again here because
 * this returns data rather than a page.
 */

const COLUMNS = [
  ["time_utc", (row) => row.createdAt.toISOString()],
  ["ip", (row) => row.ip],
  ["network", (row) => row.network],
  ["asn", (row) => row.asn],
  ["cloud_or_vpn", (row) => (row.cloud === null ? "" : row.cloud ? "yes" : "no")],
  ["country", (row) => row.country],
  ["region", (row) => row.region],
  ["city", (row) => row.city],
  ["device", (row) => row.device],
  ["browser", (row) => row.browser],
  ["os", (row) => row.os],
  ["session", (row) => row.sessionId],
  ["page", (row) => row.path],
  ["what", (row) => describeSignal(row)],
  ["type", (row) => row.signalType],
  ["key", (row) => row.signalKey],
  ["value", (row) => row.signalValue],
] as const satisfies readonly (readonly [string, (row: Signal) => unknown])[];

export async function GET(request: NextRequest) {
  if (!(await getSession())) return new Response("Not signed in", { status: 401 });

  const range = pickRange(request.nextUrl.searchParams.get("range"));
  const rows = await db
    .select()
    .from(signals)
    .where(inRange(range, signals.createdAt, { zoned: true }))
    .orderBy(desc(signals.createdAt));

  return csvResponse(`signals-${range.key}.csv`, COLUMNS, rows);
}
