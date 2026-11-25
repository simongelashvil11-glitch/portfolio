import { desc } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { db } from "@/db";
import { visits } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { csvResponse } from "@/lib/csv";
import { inRange, pickRange } from "@/lib/visit-ranges";

/*
 * Every recorded visit in the chosen range as a CSV file, newest first, for
 * opening in Excel or Google Sheets. Admin only: the proxy (src/proxy.ts) guards
 * /admin/*, and the session is checked again here because this returns data
 * rather than a page.
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
  ["page", (row) => row.path],
  ["came_from", (row) => row.referrer],
  ["utm_source", (row) => row.utmSource],
  ["utm_medium", (row) => row.utmMedium],
  ["utm_campaign", (row) => row.utmCampaign],
  ["device", (row) => row.device],
  ["browser", (row) => row.browser],
  ["os", (row) => row.os],
  ["window", (row) => row.screen],
  ["language", (row) => row.lang],
] as const satisfies readonly (readonly [string, (row: typeof visits.$inferSelect) => unknown])[];

export async function GET(request: NextRequest) {
  if (!(await getSession())) return new Response("Not signed in", { status: 401 });

  const range = pickRange(request.nextUrl.searchParams.get("range"));
  const rows = await db.select().from(visits).where(inRange(range)).orderBy(desc(visits.createdAt));

  return csvResponse(`visits-${range.key}.csv`, COLUMNS, rows);
}
