import { after, type NextRequest } from "next/server";

import { db } from "@/db";
import { visits } from "@/db/schema";
import { lookupNetwork } from "@/lib/network";
import { rateLimit, requestIp } from "@/lib/rate-limit";
import { isUntracked, requestIdentity } from "@/lib/request-identity";

/*
 * Records one page view, sent by the visit beacon on every public page.
 *
 * Location and IP come from the headers Vercel puts on each request, and the
 * network (carrier, ISP, company or cloud host) from a database file kept with
 * the site, so no third-party lookup is involved. The response is sent first and the row is
 * written afterwards (`after`), so a slow database never delays anything the
 * visitor sees.
 *
 * Not recorded:
 * - outside production. Local development shares the live database, so a
 *   dev server would otherwise fill the log with the owner's own testing;
 * - the owner: any request carrying a valid admin session;
 * - known bots, by user agent;
 * - anything that does not look like one of the site's own paths.
 */

/** A trimmed, length-capped string from the body, or null. */
function text(value: unknown, max: number): string | null {
  return typeof value === "string" ? value.trim().slice(0, max) || null : null;
}

/** Only the host of an outside referrer is kept; the site's own pages and blanks count as direct. */
function referrerHost(value: unknown, ownHost: string | null): string | null {
  if (typeof value !== "string" || !value) return null;
  try {
    const host = new URL(value).hostname.replace(/^www\./, "");
    if (ownHost && host === ownHost.replace(/^www\./, "")) return null;
    return host.slice(0, 300) || null;
  } catch {
    return null;
  }
}

/** A real beacon is a few hundred bytes; anything far bigger is not one. */
const MAX_BODY = 2048;

export async function POST(request: NextRequest) {
  const nothing = new Response(null, { status: 204 });
  const refused = new Response(null, { status: 400 });

  // A flood from one address is dropped quietly: the answer looks the same,
  // so it gives nothing away about the limit.
  if (!rateLimit(`visit:${requestIp(request.headers)}`, 60, 60_000)) return nothing;

  // Development, bots and the signed-in owner (see isUntracked).
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

  // A site path: starts with one slash, no spaces, quotes, angle brackets or
  // control characters — nothing a real page address contains.
  const path = typeof body.path === "string" ? body.path : "";
  if (!/^\/(?!\/)[^\s<>"'`\\]{0,299}$/.test(path)) return refused;
  if (path.startsWith("/admin") || path.startsWith("/api")) return nothing;

  const identity = requestIdentity(request);
  const { ip } = identity;

  const row = {
    path,
    ...identity,
    utmSource: text(body.utmSource, 100),
    utmMedium: text(body.utmMedium, 100),
    utmCampaign: text(body.utmCampaign, 100),
    screen: /^\d{2,5}x\d{2,5}$/.test(String(body.screen)) ? String(body.screen) : null,
    lang: typeof body.lang === "string" && /^[A-Za-z0-9-]{2,35}$/.test(body.lang) ? body.lang : null,
    referrer: referrerHost(body.referrer, request.nextUrl.hostname),
  };

  after(async () => {
    try {
      // Looked up from the database file on this server; the IP goes nowhere else.
      const network = await lookupNetwork(ip);
      await db
        .insert(visits)
        .values({ ...row, network: network?.name ?? null, asn: network?.asn ?? null, cloud: network?.cloud ?? null });
    } catch (error) {
      // A lost page view is not worth an error page; note it and move on.
      console.error("visit not recorded", error);
    }
  });

  return nothing;
}
