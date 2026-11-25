import type { SignalType } from "./signal-types";

/*
 * Sends one engagement signal from the browser. Used by the tracker
 * (components/engagement-signals.tsx) and by the contact form, which reports
 * that a message went out — never what it said.
 *
 * The session id lives in sessionStorage: it groups one tab's signals into a
 * visit and is gone when the tab closes. It is not a cookie and is never
 * sent anywhere but this site.
 */

const SESSION_KEY = "_eg_sid";

function randomId(length: number): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

/** A fresh id for one page view, so repeated reports of it can be merged. */
export function pageViewId(): string {
  return randomId(10);
}

function sessionId(): string | null {
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : randomId(32);
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    // Storage blocked (some private modes): the signal still counts, just unsessioned.
    return null;
  }
}

/** True on the admin pages, which are never tracked. */
export function isAdminPath(path: string): boolean {
  return path === "/admin" || path.startsWith("/admin/");
}

export function sendSignal(
  type: SignalType,
  key: string | null = null,
  value: string | null = null,
  path: string = window.location.pathname,
): void {
  if (isAdminPath(path)) return;
  const body = JSON.stringify({ sid: sessionId(), type, key, value, path });

  // sendBeacon is queued by the browser and survives the page closing. It
  // reports failure by returning false rather than throwing.
  try {
    if (navigator.sendBeacon?.("/api/signal", new Blob([body], { type: "text/plain" }))) return;
  } catch {
    // Fall through to fetch.
  }
  fetch("/api/signal", { method: "POST", body, keepalive: true }).catch(() => {});
}
