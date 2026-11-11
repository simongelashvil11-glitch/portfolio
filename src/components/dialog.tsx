"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, type ReactNode } from "react";

import { Dismiss } from "@/components/fluent-icons";

/**
 * Fluent's Dialog: a white surface with 8px corners and shadow64 over a 40%
 * black overlay, a semibold title and a subtle close button.
 *
 * Shared by the contact form, the video player and the image viewer so they
 * cannot drift apart. Owns the overlay, the Escape key and the body scroll
 * lock; callers own what goes inside.
 */
export function Dialog({
  open,
  title,
  onClose,
  children,
  widthClassName = "max-w-4xl",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  widthClassName?: string;
}) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[60] grid place-items-center p-4 sm:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.2 }}
        >
          <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/40" />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`relative w-full ${widthClassName} max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-[8px] bg-background p-6 shadow-fluent-64`}
            initial={{ opacity: 0, scale: reduced ? 1 : 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: reduced ? 1 : 0.98 }}
            transition={{ duration: reduced ? 0 : 0.25, ease: [0, 0, 0, 1] }}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="min-w-0 text-xl font-semibold leading-7">{title}</h2>
              <button type="button" onClick={onClose} aria-label="Close" className="btn btn-subtle btn-icon -mr-1.5 -mt-0.5">
                <Dismiss />
              </button>
            </div>

            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
