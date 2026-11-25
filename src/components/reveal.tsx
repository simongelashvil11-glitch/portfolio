"use client";

import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  /** Stagger helper — multiplied by 60ms. */
  index?: number;
  className?: string;
};

/**
 * Fades and lifts content the first time it scrolls into view.
 *
 * Visible by default: the server's HTML shows everything, so link previews,
 * crawlers, printing, readers and a phone still loading its scripts never
 * see an empty page. Once the page is running, only blocks that are still
 * below the window are hidden (before the next paint, so nothing seen
 * flickers) and fade in when they arrive. What is already on screen stays
 * put. The motion itself is CSS (`[data-reveal]` in globals.css), which also
 * switches it off for visitors who ask for reduced motion.
 */
export function Reveal({ children, index = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    if (element.getBoundingClientRect().top < window.innerHeight) return; // already in view: leave it be

    element.dataset.reveal = "pending";
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        element.dataset.reveal = "shown";
        observer.disconnect();
      },
      { rootMargin: "0px 0px -80px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal=""
      className={className}
      style={{ "--reveal-delay": `${Math.min(index, 6) * 60}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}
