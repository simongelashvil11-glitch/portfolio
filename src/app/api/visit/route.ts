import { after, type NextRequest, userAgent } from "next/server";

import { db } from "@/db";
import { visits } from "@/db/schema";
import { lookupNetwork } from "@/lib/network";
import { rateLimit, requestIp } from "@/lib/rate-limit";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

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

/** The value of a Vercel header, URL-decoded (cities arrive encoded), or null. */
function header(request: NextRequest, name: string, max: number): string | null {
  const raw = request.headers.get(name);
  if (!raw) return null;
  try {
    return decodeURIComponent(raw).slice(0, max) || null;
  } catch {
    return raw.slice(0, max) || null;
  }
}

/** The visitor's address: Vercel's own header first, then the proxy chain's first hop. */
function clientIp(request: NextRequest): string | null {
  const direct = request.headers.get("x-real-ip");
  if (direct) return direct.slice(0, 64);
  const chain = request.headers.get("x-forwarded-for");
  return chain ? chain.split(",")[0].trim().slice(0, 64) || null : null;
}

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

  if (process.env.NODE_ENV !== "production") return nothing;

  // A flood from one address is dropped quietly: the answer looks the same,
  // so it gives nothing away about the limit.
  if (!rateLimit(`visit:${requestIp(request.headers)}`, 60, 60_000)) return nothing;

  const ua = userAgent(request);
  // Headless browsers are scrapers, previews and screenshot tools, not people,
  // and the bot check does not catch them.
  if (ua.isBot || /headless/i.test(ua.browser.name ?? "") || /headless/i.test(ua.ua)) return nothing;

  if (await verifySession(request.cookies.get(SESSION_COOKIE)?.value)) return nothing;

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

  const ip = clientIp(request);

  const row = {
    path,
    country: header(request, "x-vercel-ip-country", 2)?.toUpperCase() ?? null,
    region: header(request, "x-vercel-ip-country-region", 80),
    city: header(request, "x-vercel-ip-city", 120),
    ip,
    utmSource: text(body.utmSource, 100),
    utmMedium: text(body.utmMedium, 100),
    utmCampaign: text(body.utmCampaign, 100),
    screen: /^\d{2,5}x\d{2,5}$/.test(String(body.screen)) ? String(body.screen) : null,
    lang: typeof body.lang === "string" && /^[A-Za-z0-9-]{2,35}$/.test(body.lang) ? body.lang : null,
    referrer: referrerHost(body.referrer, request.nextUrl.hostname),
    // The parser reports no type for desktop browsers.
    device: (ua.device.type ?? "desktop").slice(0, 16),
    browser: ua.browser.name?.slice(0, 40) ?? null,
    os: ua.os.name?.slice(0, 40) ?? null,
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
