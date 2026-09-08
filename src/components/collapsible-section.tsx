"use client";

import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useState, type ReactNode } from "react";

/**
 * A section that starts closed and opens on click.
 *
 * The count sits next to the heading on purpose: a closed section with no
 * hint of what is inside reads as decoration and never gets clicked.
 *
 * Height is animated to `auto` rather than a measured pixel value, so the
 * section does not need re-measuring when its contents change.
 */
export function CollapsibleSection({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const reduced = useReducedMotion();
  const contentId = useId();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={contentId}
        className="group flex w-full items-center justify-between gap-4 text-left"
      >
        <span className="flex items-baseline gap-2.5">
          <span className="text-xl font-medium tracking-display transition-colors group-hover:text-accent">
            {title}
          </span>
          {typeof count === "number" ? (
            <span className="tnum text-sm text-faint">{count}</span>
          ) : null}
        </span>

        {/*
          The circle is the same control shape used by the video player and
          the gallery arrows, so it reads as something to press rather than a
          decorative glyph. The nudge lives on the circle and the rotation on
          the icon — sharing one element would mean the two transforms fought
          over the same property.
        */}
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-full border transition-colors ${
            open
              ? "border-line bg-surface text-foreground"
              : "border-white/15 bg-white/5 text-muted group-hover:border-white/35 group-hover:bg-white/10 group-hover:text-foreground"
          } ${open ? "" : "nudge"}`}
        >
          <ChevronDown
            className={`size-4 transition-transform duration-300 ease-out ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden
          />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={contentId}
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-8">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
