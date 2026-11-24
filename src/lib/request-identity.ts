import "server-only";

import { type NextRequest, userAgent } from "next/server";

/*
 * Who sent a request, as far as the request itself says: the address and
 * location from the headers Vercel adds, and the device from the user agent.
 * Shared by the visit and signal routes so both record visitors the same way.
 * The network behind the address comes from lookupNetwork (lib/network).
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
export function clientIp(request: NextRequest): string | null {
  const direct = request.headers.get("x-real-ip");
  if (direct) return direct.slice(0, 64);
  const chain = request.headers.get("x-forwarded-for");
  return chain ? chain.split(",")[0].trim().slice(0, 64) || null : null;
}

/** Address, location and device of the request, ready to store. */
export function requestIdentity(request: NextRequest) {
  const ua = userAgent(request);
  return {
    ip: clientIp(request),
    country: header(request, "x-vercel-ip-country", 2)?.toUpperCase() ?? null,
    region: header(request, "x-vercel-ip-country-region", 80),
    city: header(request, "x-vercel-ip-city", 120),
    // The parser reports no type for desktop browsers.
    device: (ua.device.type ?? "desktop").slice(0, 16),
    browser: ua.browser.name?.slice(0, 40) ?? null,
    os: ua.os.name?.slice(0, 40) ?? null,
  };
}
