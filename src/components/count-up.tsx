"use client";

import { useLayoutEffect, useRef } from "react";

import "./count-up.css";

/*
 * A figure that counts up from zero the first time it scrolls into view,
 * keeping the exact form it was written in: "$88,265", "72.99M" and "0.68%"
 * count as $, grouped thousands, two decimals and a trailing M or %.
 *
 * The server always renders the final value, so link previews, crawlers and
 * anything without scripts read the real number. The page's early script
 * (app/layout.tsx) marks the document as scripted, and CSS then holds these
 * figures invisible until this component takes over — so nobody sees the
 * final value flash and drop to zero. If the script never arrives, a CSS
 * failsafe shows the value after a moment anyway. Values that are not one
 * plain number ("1:3", "Q2 2026") are left alone, as is everything for
 * visitors who ask for reduced motion.
 */

const DURATION_MS = 1100;

type Parsed = { prefix: string; target: number; decimals: number; grouped: boolean; suffix: string };

export function parseFigure(value: string): Parsed | null {
  const match = /^(\D*?)(\d[\d,]*(?:\.\d+)?)(\D*)$/.exec(value.trim());
  if (!match) return null;
  const [, prefix, number, suffix] = match;
  const target = Number(number.replaceAll(",", ""));
  if (!Number.isFinite(target)) return null;
  return {
    prefix,
    target,
    decimals: number.includes(".") ? number.split(".")[1].length : 0,
    grouped: number.includes(","),
    suffix,
  };
}

function format(parsed: Parsed, current: number): string {
  const digits = current.toLocaleString("en-US", {
    minimumFractionDigits: parsed.decimals,
    maximumFractionDigits: parsed.decimals,
    useGrouping: parsed.grouped,
  });
  return `${parsed.prefix}${digits}${parsed.suffix}`;
}

/** Fast at first, settling gently on the final value. */
function easeOutQuart(t: number): number {
  return 1 - (1 - t) ** 4;
}

export function CountUp({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    const parsed = parseFigure(value);
    const finish = () => {
      if (!element) return;
      element.textContent = value;
      element.dataset.count = "done";
    };
    if (!element) return;
    if (
      !parsed ||
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      navigator.webdriver
    ) {
      finish();
      return;
    }

    element.textContent = format(parsed, 0);
    element.dataset.count = "run";

    let frame = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / DURATION_MS);
          element.textContent = t < 1 ? format(parsed, parsed.target * easeOutQuart(t)) : value;
          if (t < 1) frame = requestAnimationFrame(tick);
          else finish();
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(element);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      finish();
    };
  }, [value]);

  // Screen readers get the real value once; the moving digits are decoration.
  return (
    <span className={className}>
      <span className="sr-only">{value}</span>
      <span ref={ref} data-count="" aria-hidden>
        {value}
      </span>
    </span>
  );
}
