"use client";
/*
 * Engagement sensors: coarse device snapshot, per-page scroll/active-time
 * aggregate, copy and print counters, and a one-time exit-intent email card.
 * No keystroke or clipboard CONTENT is captured — kinds and counters only.
 */
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function EngagementSignals() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;

    let sid = sessionStorage.getItem("_eg_sid");
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem("_eg_sid", sid);
    }

    const send = (type, key, value) => {
      const body = JSON.stringify({ sid, type, key, value, path: pathname });
      try {
        navigator.sendBeacon("/api/signal", body);
      } catch {
        fetch("/api/signal", {
          method: "POST",
          body,
          headers: { "Content-Type": "application/json" },
        });
      }
    };

    // --- coarse device snapshot, once per session ---
    if (!sessionStorage.getItem("_eg_dev")) {
      sessionStorage.setItem("_eg_dev", "1");
      let plat = "?";
      const touch = navigator.maxTouchPoints > 1 ? "touch" : "mouse";
      try {
        const d = navigator.userAgentData;
        plat = d ? `${d.platform || "?"}${d.mobile ? " mobile" : ""}`
                 : /Mobi/.test(navigator.userAgent) ? "mobile-other" : "desktop-other";
      } catch {}
      const conn = navigator.connection?.effectiveType || "?";
      const w = window.innerWidth < 768 ? "small"
              : window.innerWidth < 1280 ? "medium"
              : window.innerWidth < 1920 ? "large" : "xl";
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "?";
      send("device_coarse", "snapshot", `${plat}|scr=${w}|net=${conn}|tz=${tz}|input=${touch}`);
    }

    // --- scroll depth + active seconds, one aggregate per page view ---
    const t0 = Date.now();
    let maxScroll = 0;
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - innerHeight;
      if (h > 0) maxScroll = Math.max(maxScroll, Math.round((scrollY / h) * 100));
    };
    addEventListener("scroll", onScroll, { passive: true });

    const flush = () => {
      const secs = Math.min(Math.round((Date.now() - t0) / 1000), 7200);
      removeEventListener("scroll", onScroll);
      if (secs > 2) send("engage", "scroll_seconds", `${maxScroll}%/${secs}s`);
    };
    addEventListener("pagehide", flush, { once: true });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush();
    });

    // --- copy counter: KIND only, never the content ---
    let lastCopy = 0;
    const onCopy = () => {
      const now = Date.now();
      if (now - lastCopy < 3000) return;
      lastCopy = now;
      const t = (document.getSelection()?.toString() || "").slice(0, 100);
      const kind = /@/.test(t) ? "email-like"
                 : /[\d\s()+-]{7,}/.test(t) ? "phone-like" : "text";
      send("copy_counter", "kind", kind);
    };
    document.addEventListener("copy", onCopy);

    // --- print, once per session ---
    if (!sessionStorage.getItem("_eg_printed")) {
      const onPrint = () => {
        sessionStorage.setItem("_eg_printed", "1");
        send("print", "page", pathname);
      };
      window.addEventListener("afterprint", onPrint, { once: true });
    }

    // --- exit-intent email card, once per visitor, desktop pointers ---
    if (!localStorage.getItem("_eg_email_card")) {
      const onOut = (e) => {
        if (e.clientY > 0) return;
        removeEventListener("mouseout", onOut);
        if (localStorage.getItem("_eg_email_card")) return;
        localStorage.setItem("_eg_email_card", "1");

        const box = document.createElement("div");
        box.setAttribute("role", "dialog");
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
        box.querySelector("#eg-x").onclick = close;
        box.querySelector("#eg-go").onclick = () => {
          const em = box.querySelector("#eg-em").value.trim();
          if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) {
            send("email_gate", "rate_sheet_email", em);
            box.innerHTML =
              '<p style="margin:0;font-size:13px">Thanks! Check your inbox soon.</p>';
            setTimeout(close, 2500);
          } else {
            box.querySelector("#eg-em").style.borderColor = "red";
          }
        };
      };
      addEventListener("mouseout", onOut);
    }

    return () => {
      removeEventListener("scroll", onScroll);
      document.removeEventListener("copy", onCopy);
    };
  }, [pathname]);

  return null;
}