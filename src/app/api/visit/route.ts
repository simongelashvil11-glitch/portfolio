import { after, type NextRequest, userAgent } from "next/server";

import { db } from "@/db";
import { visits } from "@/db/schema";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

/*
 * Records one page view, sent by the visit beacon on every public page.
 *
 * Location and IP come from the headers Vercel puts on each request, so no
 * third-party lookup is involved. The response is sent first and the row is
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

export async function POST(request: NextRequest) {
  const nothing = new Response(null, { status: 204 });

  if (process.env.NODE_ENV !== "production") return nothing;

  const ua = userAgent(request);
  // Headless browsers are scrapers, previews and screenshot tools, not people,
  // and the bot check does not catch them.
  if (ua.isBot || /headless/i.test(ua.browser.name ?? "") || /headless/i.test(ua.ua)) return nothing;

  if (await verifySession(request.cookies.get(SESSION_COOKIE)?.value)) return nothing;

  let body: { path?: unknown; referrer?: unknown };
  try {
    body = JSON.parse(await request.text());
  } catch {
    return nothing;
  }

  const path = typeof body.path === "string" ? body.path : "";
  if (!path.startsWith("/") || path.startsWith("/admin") || path.startsWith("/api") || path.length > 300) {
    return nothing;
  }

  const row = {
    path,
    country: header(request, "x-vercel-ip-country", 2)?.toUpperCase() ?? null,
    region: header(request, "x-vercel-ip-country-region", 80),
    city: header(request, "x-vercel-ip-city", 120),
    ip: clientIp(request),
    referrer: referrerHost(body.referrer, request.nextUrl.hostname),
    // The parser reports no type for desktop browsers.
    device: (ua.device.type ?? "desktop").slice(0, 16),
    browser: ua.browser.name?.slice(0, 40) ?? null,
    os: ua.os.name?.slice(0, 40) ?? null,
  };

  after(async () => {
    try {
      await db.insert(visits).values(row);
    } catch (error) {
      // A lost page view is not worth an error page; note it and move on.
      console.error("visit not recorded", error);
    }
  });

  return nothing;
}
