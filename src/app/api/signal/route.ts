import { after, type NextRequest } from "next/server";

import { db } from "@/db";
import { signals } from "@/db/schema";
import { lookupNetwork } from "@/lib/network";
import { rateLimit, requestIp } from "@/lib/rate-limit";
import { isUntracked, requestIdentity } from "@/lib/request-identity";
import {
  CLICK_KINDS,
  COPY_KINDS,
  ENGAGE_VALUE,
  PAGE_VIEW_ID,
  SIGNAL_TYPES,
  type SignalType,
} from "@/lib/signal-types";

/*
 * Records one engagement signal from components/engagement-signals.tsx (or
 * the contact form's "message sent"). The vocabulary is in lib/signal-types.
 *
 * Each signal carries the same identity a page view does — address,
 * location, device and the network behind the address — recorded the same
 * way as the visit route, and skipped in the same cases: development, bots
 * and the signed-in owner (lib/request-identity). The response goes out
 * first and the row is written afterwards, so a slow database never delays
 * the visitor.
 *
 * Every value is checked against the shape its type allows, so nothing
 * free-form reaches the table except an email address a visitor chose to
 * leave in the exit card.
 */

/** A real signal payload is tiny; anything far bigger is not one. */
const MAX_BODY = 1024;

/** A site path: same rule as the visit route. */
const PATH_RE = /^\/(?!\/)[^\s<>"'`\\]{0,299}$/;

const EMAIL_RE = /^[^@\s]{1,64}@[^@\s]{1,189}\.[^@\s]{2,}$/;

/** "Windows|scr=xl|net=4g|tz=Asia/Tbilisi|input=mouse" and the like. */
const DEVICE_RE = /^[\w .?+/=|-]{1,200}$/;

/** A link destination: host and path, a site path, or a kind word. No spaces or markup. */
const TARGET_RE = /^[^\s<>"'`\\]{1,300}$/;

function text(value: unknown, max: number): string | null {
  return typeof value === "string" ? value.trim().slice(0, max) || null : null;
}

/** The key and value to store for a type, or null when the pair is not one that type sends. */
function checked(type: SignalType, key: string | null, value: string | null): [string | null, string | null] | null {
  switch (type) {
    case "engage":
      return key && PAGE_VIEW_ID.test(key) && value && ENGAGE_VALUE.test(value) ? [key, value] : null;
    case "device_coarse":
      return value && DEVICE_RE.test(value) ? ["snapshot", value] : null;
    case "copy_counter":
      return value && (COPY_KINDS as readonly string[]).includes(value) ? ["kind", value] : null;
    case "print":
      return value && PATH_RE.test(value) ? ["page", value] : null;
    case "click":
      return key && (CLICK_KINDS as readonly string[]).includes(key) && value && TARGET_RE.test(value)
        ? [key, value]
        : null;
    case "email_gate":
      return value && EMAIL_RE.test(value) ? ["rate_sheet_email", value.toLowerCase()] : null;
    case "message":
      return key === "contact_form" ? [key, null] : null;
  }
}

export async function POST(request: NextRequest) {
  const nothing = new Response(null, { status: 204 });
  const refused = new Response(null, { status: 400 });

  // Quiet per-address flood guard, same shape as the visit route.
  const address = requestIp(request.headers);
  if (!rateLimit(`signal:${address}`, 60, 60_000)) return nothing;

  if (await isUntracked(request)) return nothing;

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
  if (!type || !(SIGNAL_TYPES as readonly string[]).includes(type)) return refused;
  const signalType = type as SignalType;

  const pair = checked(signalType, text(body.key, 100), text(body.value, 300));
  if (!pair) return refused;

  // Addresses left in the exit card go straight to the leads list, so a
  // script cannot fill it: a few per address per hour.
  if (signalType === "email_gate" && !rateLimit(`signal-email:${address}`, 3, 60 * 60_000)) return nothing;

  const path =
    typeof body.path === "string" &&
    PATH_RE.test(body.path) &&
    !body.path.startsWith("/admin") &&
    !body.path.startsWith("/api")
      ? body.path
      : null;

  const sid = text(body.sid, 64);
  const row = {
    signalType,
    signalKey: pair[0],
    signalValue: pair[1],
    sessionId: sid && /^[\w-]{8,64}$/.test(sid) ? sid : null,
    path,
    ...requestIdentity(request),
  };

  after(async () => {
    try {
      // Looked up from the database file on this server; the IP goes nowhere else.
      const network = await lookupNetwork(row.ip);
      await db
        .insert(signals)
        .values({ ...row, network: network?.name ?? null, asn: network?.asn ?? null, cloud: network?.cloud ?? null });
    } catch (error) {
      console.error("signal not recorded", error);
    }
  });

  return nothing;
}
