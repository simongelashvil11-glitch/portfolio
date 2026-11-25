"use client";

import { useEffect } from "react";

/*
 * Fluent's Reveal highlight: a soft light that follows the pointer across
 * interactive cards and along their borders, lighting the edges of nearby
 * cards as it approaches them — so the page feels lit by the cursor rather
 * than hovered. Renders nothing; it only tells each card near the pointer
 * where the pointer is (--mx / --my) and marks it `data-lit`. The light
 * itself is CSS (`.card-interactive` in globals.css).
 *
 * Mouse and trackpad only: touch has no pointer to follow.
 */

/** How far outside a card the pointer still lights its border. */
const REACH = 180;

export function CursorLight() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let x = -1e4;
    let y = -1e4;
    let frame = 0;

    const update = () => {
      frame = 0;
      for (const card of document.querySelectorAll<HTMLElement>(".card-interactive")) {
        const box = card.getBoundingClientRect();
        const near =
          x > box.left - REACH && x < box.right + REACH && y > box.top - REACH && y < box.bottom + REACH;
        if (near) {
          card.style.setProperty("--mx", `${Math.round(x - box.left)}px`);
          card.style.setProperty("--my", `${Math.round(y - box.top)}px`);
          card.dataset.lit = "";
        } else if ("lit" in card.dataset) {
          delete card.dataset.lit;
        }
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
      x = event.clientX;
      y = event.clientY;
      schedule();
    };
    const onLeave = () => {
      x = y = -1e4;
      schedule();
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    // The pointer stays still while the page scrolls under it.
    window.addEventListener("scroll", schedule, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", schedule);
    };
  }, []);

  return null;
}
