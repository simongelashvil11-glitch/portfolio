"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Tells the server a public page was viewed, once per route the visitor
 * lands on — including moves between pages, which the router makes without
 * a full load. Renders nothing.
 *
 * `sendBeacon` is used where it exists: it is queued by the browser, does
 * not hold up anything on the page, and survives the visitor leaving
 * straight away. The server decides what to keep (see /api/visit).
 */
export function VisitBeacon() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;

    // The outside referrer only means something on the first page of a
    // visit; after that the previous page was the site itself.
    const referrer = first.current ? document.referrer : "";
    first.current = false;

    // Campaign tags, when a shared link carried them (?utm_source=linkedin…).
    const params = new URLSearchParams(window.location.search);
    const body = JSON.stringify({
      path: pathname,
      referrer,
      utmSource: params.get("utm_source"),
      utmMedium: params.get("utm_medium"),
      utmCampaign: params.get("utm_campaign"),
      screen: `${window.innerWidth}x${window.innerHeight}`,
      lang: navigator.language,
    });

    try {
      if (navigator.sendBeacon?.("/api/visit", new Blob([body], { type: "text/plain" }))) return;
    } catch {
      // Fall through to fetch.
    }
    fetch("/api/visit", { method: "POST", body, keepalive: true }).catch(() => {});
  }, [pathname]);

  return null;
}
