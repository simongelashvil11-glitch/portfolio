"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { isAdminPath, pageViewId, sendSignal } from "@/lib/signal-client";
import { hostIn, SOCIAL_HOSTS, type ClickKind } from "@/lib/signal-types";

/*
 * Engagement sensors for the admin's Signals page. Renders nothing.
 *
 * - How each page was read: the deepest scroll and the seconds the tab was
 *   actually visible, one report per page view. Re-sent (same page-view id)
 *   each time the tab is hidden, because a phone may close it without
 *   another chance; the admin page keeps the latest report per id.
 * - Links followed out of the site: email, phone, WhatsApp, downloads,
 *   social profiles and other sites — the kind and the destination only.
 * - Copying (the KIND of text — email, phone number or other — never the
 *   text itself), printing, and a coarse device snapshot once per tab.
 * - A one-time exit-intent card offering the rate sheet; the address is
 *   only sent if the visitor submits it.
 *
 * Page views themselves are recorded by VisitBeacon; the server drops
 * anything from the owner's signed-in browser, bots and local development.
 */

const DEVICE_KEY = "_eg_dev";
const EMAIL_CARD_KEY = "_eg_email_card";

/** What a followed link was, or null for a move between the site's own pages. */
function classifyLink(link: HTMLAnchorElement): { kind: ClickKind; target: string } | null {
  const raw = link.getAttribute("href") ?? "";
  if (/^mailto:/i.test(raw)) return { kind: "email", target: "email" };
  if (/^tel:/i.test(raw)) return { kind: "phone", target: "phone" };

  let url: URL;
  try {
    url = new URL(link.href, window.location.href);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.replace(/^www\./, "");
  if (hostIn(host, ["wa.me", "whatsapp.com"])) return { kind: "whatsapp", target: "whatsapp" };

  const isFile = /\.(pdf|docx?|pptx?|xlsx?|zip|png|jpe?g|webp)$/i.test(url.pathname);
  if (url.origin === window.location.origin) {
    return link.hasAttribute("download") || isFile ? { kind: "download", target: url.pathname.slice(0, 300) } : null;
  }

  const target = `${host}${url.pathname === "/" ? "" : url.pathname}`.slice(0, 300);
  if (isFile) return { kind: "download", target };
  return { kind: hostIn(host, SOCIAL_HOSTS) ? "social" : "outbound", target };
}

/** The kind of text on the clipboard, decided here and never sent. */
function copyKind(): "email-like" | "phone-like" | "text" {
  const text = (document.getSelection()?.toString() ?? "").trim().slice(0, 200);
  if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(text)) return "email-like";
  const digits = text.match(/\d/g)?.length ?? 0;
  if (digits >= 7 && /^[\d\s()+.-]+$/.test(text)) return "phone-like";
  return "text";
}

type NavigatorExtras = Navigator & {
  userAgentData?: { platform?: string; mobile?: boolean };
  connection?: { effectiveType?: string };
};

/** "Windows|scr=xl|net=4g|tz=Asia/Tbilisi|input=mouse" — coarse on purpose. */
function deviceSnapshot(): string {
  const nav = navigator as NavigatorExtras;
  let platform = "?";
  try {
    const data = nav.userAgentData;
    platform = data
      ? `${data.platform || "?"}${data.mobile ? " mobile" : ""}`
      : /Mobi/.test(nav.userAgent)
        ? "mobile-other"
        : "desktop-other";
  } catch {
    // Leave it unknown.
  }
  const width = window.innerWidth;
  const screen = width < 768 ? "small" : width < 1280 ? "medium" : width < 1920 ? "large" : "xl";
  const net = nav.connection?.effectiveType || "?";
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "?";
  const input = nav.maxTouchPoints > 1 ? "touch" : "mouse";
  return `${platform}|scr=${screen}|net=${net}|tz=${tz}|input=${input}`;
}

/** The exit-intent card. Plain DOM, so the tracker needs no extra React tree. */
function showEmailCard() {
  const box = document.createElement("div");
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-label", "Rate sheet");
  box.style.cssText =
    "position:fixed;bottom:20px;right:20px;z-index:9999;background:#fff;" +
    "border:1px solid #ddd;border-radius:10px;padding:16px;max-width:280px;" +
    "font-family:system-ui;box-shadow:0 8px 30px rgba(0,0,0,.15)";
  box.innerHTML = `
    <button id="eg-x" aria-label="Dismiss" style="float:right;border:0;background:none;cursor:pointer;font-size:16px">×</button>
    <p style="margin:0 0 8px;font-weight:600;font-size:14px">Before you go — want my 1-page rate sheet?</p>
    <input id="eg-em" type="email" placeholder="your@email.com" style="width:100%;padding:8px;margin-bottom:8px;border:1px solid #ccc;border-radius:6px;font-size:13px">
    <button id="eg-go" style="width:100%;padding:8px;border:0;border-radius:6px;background:#111;color:#fff;cursor:pointer;font-size:13px">Send it to me</button>`;
  document.body.appendChild(box);

  const close = () => box.remove();
  box.querySelector<HTMLButtonElement>("#eg-x")!.onclick = close;
  box.querySelector<HTMLButtonElement>("#eg-go")!.onclick = () => {
    const input = box.querySelector<HTMLInputElement>("#eg-em")!;
    const email = input.value.trim();
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      sendSignal("email_gate", "rate_sheet_email", email);
      box.innerHTML = '<p style="margin:0;font-size:13px">Thanks! Check your inbox soon.</p>';
      setTimeout(close, 2500);
    } else {
      input.style.borderColor = "red";
    }
  };
}

export function EngagementSignals() {
  const pathname = usePathname();

  // Once per tab: device, copies, prints, followed links and the exit card.
  useEffect(() => {
    if (!sessionStorage.getItem(DEVICE_KEY) && !isAdminPath(window.location.pathname)) {
      sessionStorage.setItem(DEVICE_KEY, "1");
      sendSignal("device_coarse", "snapshot", deviceSnapshot());
    }

    let lastCopy = 0;
    const onCopy = () => {
      const now = Date.now();
      if (now - lastCopy < 3000) return;
      lastCopy = now;
      sendSignal("copy_counter", "kind", copyKind());
    };

    const printed = new Set<string>();
    const onPrint = () => {
      const path = window.location.pathname;
      if (printed.has(path)) return;
      printed.add(path);
      sendSignal("print", "page", path);
    };

    // A left click and a middle click on the same link are one action.
    let lastClick = { target: "", at: 0 };
    const onClick = (event: MouseEvent) => {
      if (event.type === "auxclick" && event.button !== 1) return;
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      const hit = classifyLink(link);
      if (!hit) return;
      const now = Date.now();
      if (hit.target === lastClick.target && now - lastClick.at < 1000) return;
      lastClick = { target: hit.target, at: now };
      sendSignal("click", hit.kind, hit.target);
    };

    // Leaving through the top of the window, with a mouse, once per browser.
    const wantsCard = !localStorage.getItem(EMAIL_CARD_KEY) && window.matchMedia("(pointer: fine)").matches;
    const onLeave = (event: MouseEvent) => {
      if (event.relatedTarget || event.clientY > 0) return;
      if (isAdminPath(window.location.pathname) || localStorage.getItem(EMAIL_CARD_KEY)) return;
      document.removeEventListener("mouseout", onLeave);
      localStorage.setItem(EMAIL_CARD_KEY, "1");
      showEmailCard();
    };

    document.addEventListener("copy", onCopy);
    window.addEventListener("afterprint", onPrint);
    document.addEventListener("click", onClick, true);
    document.addEventListener("auxclick", onClick, true);
    if (wantsCard) document.addEventListener("mouseout", onLeave);

    return () => {
      document.removeEventListener("copy", onCopy);
      window.removeEventListener("afterprint", onPrint);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("auxclick", onClick, true);
      document.removeEventListener("mouseout", onLeave);
    };
  }, []);

  // Once per page view: how far down it was read, and for how long.
  useEffect(() => {
    if (!pathname || isAdminPath(pathname)) return;

    const path = pathname;
    const id = pageViewId();
    let visibleMs = 0;
    let since: number | null = document.visibilityState === "visible" ? performance.now() : null;
    let deepest = 0;
    let lastSent = "";

    const measure = () => {
      const room = document.documentElement.scrollHeight - window.innerHeight;
      const depth = room <= 0 ? 100 : Math.round((window.scrollY / room) * 100);
      deepest = Math.max(deepest, Math.min(100, Math.max(0, depth)));
    };
    const pause = () => {
      if (since !== null) visibleMs += performance.now() - since;
      since = null;
    };
    const report = () => {
      const seconds = Math.min(7200, Math.round(visibleMs / 1000));
      if (seconds < 3) return;
      const value = `${deepest}%/${seconds}s`;
      if (value === lastSent) return;
      lastSent = value;
      sendSignal("engage", id, value, path);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        pause();
        report();
      } else if (since === null) {
        since = performance.now();
      }
    };
    const onHide = () => {
      pause();
      report();
    };

    // Measured once the page has laid out, so a page that fits the window counts as fully seen.
    const settle = window.setTimeout(measure, 1000);
    window.addEventListener("scroll", measure, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onHide);

    return () => {
      // Moving to another page inside the site: this page's read is final.
      window.clearTimeout(settle);
      window.removeEventListener("scroll", measure);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onHide);
      pause();
      report();
    };
  }, [pathname]);

  return null;
}
