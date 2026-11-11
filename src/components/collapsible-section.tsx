"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useState, type ReactNode } from "react";

import { ChevronDown } from "@/components/fluent-icons";

/**
 * A section that starts closed and opens on click, after Fluent's Accordion:
 * a full-width header row with the chevron leading, the title and a count.
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
  /** Kept for callers; both tones now share Fluent's accordion header. */
  tone?: "section" | "inline";
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
        className="-mx-2 flex min-h-11 w-[calc(100%+1rem)] items-center gap-2 rounded-[4px] px-2 text-left transition-colors hover:bg-surface"
      >
        <ChevronDown
          className={`size-5 shrink-0 text-muted transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
        />
        <span className="text-base font-semibold leading-[22px]">{title}</span>
        {typeof count === "number" ? (
          <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-muted">{count}</span>
        ) : null}
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={contentId}
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.25, ease: [0, 0, 0, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-2 pt-3">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
