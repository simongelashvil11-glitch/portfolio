"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

/**
 * The window everything opens into — styled after the desktop this work was
 * probably made on. Extracted so the video player and the image lightbox
 * cannot drift apart: they are the same component, not two that happen to
 * match today.
 *
 * Owns the backdrop, the Escape key and the body scroll lock. Callers own
 * what goes inside, since a 16:9 iframe and a photo of unknown shape want
 * different treatment.
 */
export function MacWindow({
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
          className="fixed inset-0 z-50 grid place-items-center p-4 sm:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.2 }}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`relative w-full ${widthClassName} overflow-hidden rounded-xl border border-white/12 bg-surface shadow-[0_30px_90px_-20px_rgb(0_0_0/0.9)]`}
            initial={{ opacity: 0, scale: reduced ? 1 : 0.96, y: reduced ? 0 : 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: reduced ? 1 : 0.97, y: reduced ? 0 : 8 }}
            transition={{ duration: reduced ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Title bar */}
            <div className="flex h-9 items-center gap-2 border-b border-white/8 bg-white/4 px-4">
              <span className="flex gap-1.5" aria-hidden>
                <span className="size-2.5 rounded-full bg-[#ff5f57]" />
                <span className="size-2.5 rounded-full bg-[#febc2e]" />
                <span className="size-2.5 rounded-full bg-[#28c840]" />
              </span>
              <p className="min-w-0 flex-1 truncate text-center text-xs text-white/50">{title}</p>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="text-white/40 transition-colors hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
