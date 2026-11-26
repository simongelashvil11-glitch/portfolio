import "server-only";

import type { NextRequest } from "next/server";

import { getSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

/*
 * The checks every CreativeOS route makes for itself, on top of the proxy
 * that guards /admin/*: a valid admin session, and for anything that changes
 * data, a request that came from this site (the session cookie is
 * SameSite=Lax as well, but the origin check does not depend on it).
 */
export async function guard(request: NextRequest, { write, limit = 30 }: { write: boolean; limit?: number }) {
  const session = await getSession();
  if (!session) return { error: Response.json({ error: "Not signed in." }, { status: 401 }) };
  if (write) {
    const origin = request.headers.get("origin");
    if (!origin || new URL(origin).host !== request.nextUrl.host) {
      return { error: Response.json({ error: "Cross-site request refused." }, { status: 403 }) };
    }
  }
  if (!rateLimit(`cos:${session.email}:${request.nextUrl.pathname}`, limit, 60_000)) {
    return { error: Response.json({ error: "Too many requests; wait a minute." }, { status: 429 }) };
  }
  return { session };
}
