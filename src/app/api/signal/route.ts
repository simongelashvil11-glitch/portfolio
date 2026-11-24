import { after, type NextRequest } from "next/server";

import { db } from "@/db";
import { signals } from "@/db/schema";
import { rateLimit, requestIp } from "@/lib/rate-limit";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

/*
 * Records one engagement signal, sent by the EngagementSignals component:
 * coarse device snapshot, per-page scroll/active-time aggregates, copy and
 * print counters, and emails volunteered through the exit-intent card.
 * Content of copied text or unsent form fields is never captured —
 * counts and classifications only. The response goes out first, the row
 * is written afterwards, so a slow database never delays the visitor.
 */

/** A trimmed, length-capped string from the body, or null. */
function text(value: unknown, max: number): string | null {
  return typeof value === "string" ? value.trim().slice(0, max) || null : null;
}

const KNOWN_TYPES = new Set([
  "engage", "device_coarse", "copy_counter", "print", "email_gate",
]);

/** A real signal payload is tiny; anything far bigger is not one. */
const MAX_BODY = 1024;

/** A site path: same rule as the visit route. */
const PATH_RE = /^\/(?!\/)[^\s<>"'`\\]{0,299}$/;

export async function POST(request: NextRequest) {
  const nothing = new Response(null, { status: 204 });
  const refused = new Response(null, { status: 400 });

  // Quiet per-address flood guard, same shape as the visit route.
  if (!rateLimit(`signal:${requestIp(request.headers)}`, 60, 60_000)) return nothing;

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY) return refused;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return refused;
    body = parsed as Record<string, unknown>;
  } catch {
    return refused;
  }

  const type = text(body.type, 40);
  if (!type || !KNOWN_TYPES.has(type)) return refused;

  const path =
    typeof body.path === "string" &&
    PATH_RE.test(body.path) &&
    !body.path.startsWith("/admin") &&
    !body.path.startsWith("/api")
      ? body.path
      : null;

  const row = {
    signalType: type,
    signalKey: text(body.key, 100),
    signalValue: text(body.value, 300),
    sessionId: text(body.sid, 64),
    path,
  };

  after(async () => {
    try {
      await db.insert(signals).values(row);
    } catch (error) {
      console.error("signal not recorded", error);
    }
  });

  return nothing;
}