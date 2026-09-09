"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Maximize2 } from "lucide-react";
import { useState } from "react";

import { MacWindow } from "@/components/mac-window";

/**
 * The portrait, framed as a window off the same desktop as `MacWindow`.
 *
 * The three lights are real controls, not an ornament — a row of dead dots
 * invites a click and then does nothing, which is worse than no dots at all.
 * Each does what its colour does on the desktop it is quoting:
 *
 *   close     the card goes away and the intro takes the full width
 *   minimise  the photo collapses, leaving the chrome behind
 *   zoom      the portrait opens full size in a real `MacWindow`
 *
 * Close and minimise both leave a way back, since a portfolio page that can
 * be permanently dismantled by a stray click is a bug, not a homage: closing
 * drops to a pill that reopens it, and minimising leaves the name bar, which
 * is itself the restore target.
 */
type Mode = "open" | "minimised" | "closed";

const EASE = [0.22, 1, 0.36, 1] as const;

export function PortraitCard({
  src,
  name,
  width,
  height,
}: {
  src: string;
  name: string;
  width: number;
  height: number;
}) {
  const [mode, setMode] = useState<Mode>("open");
  const [zoomed, setZoomed] = useState(false);
  const reduced = useReducedMotion();

  const duration = reduced ? 0 : 0.32;

  if (mode === "closed") {
    return (
      <button
        type="button"
        onClick={() => setMode("open")}
        className="group flex shrink-0 items-center gap-2 self-start rounded-full border border-line bg-surface py-2 pl-3.5 pr-3 text-[0.8125rem] text-muted transition-colors hover:border-white/20 hover:text-foreground"
      >
        {name}
        <Maximize2 className="size-3.5 text-faint transition-colors group-hover:text-foreground" aria-hidden />
      </button>
    );
  }

  return (
    <>
      {/*
        `layout` carries the height change when the photo collapses. The card
        is stretched by flex when open and sized by its content when not, and
        those two cannot be transitioned against each other by CSS alone.
      */}
      <motion.div
        layout={!reduced}
        transition={{ duration, ease: EASE }}
        className={`flex w-40 shrink-0 flex-col self-start overflow-hidden rounded-2xl border border-line bg-surface sm:w-44 lg:w-48 ${
          mode === "open" ? "sm:self-stretch" : ""
        }`}
      >
        <div className="group/bar flex h-8 shrink-0 items-center gap-1.5 border-b border-white/8 bg-white/4 px-3">
          <Light
            tone="bg-[#ff5f57]"
            label="Close"
            glyph="✕"
            onClick={() => setMode("closed")}
          />
          <Light
            tone="bg-[#febc2e]"
            label={mode === "open" ? "Minimise" : "Restore"}
            glyph={mode === "open" ? "–" : "+"}
            onClick={() => setMode(mode === "open" ? "minimised" : "open")}
          />
          <Light
            tone="bg-[#28c840]"
            label="Zoom"
            glyph="⤢"
            onClick={() => setZoomed(true)}
          />
        </div>

        <AnimatePresence initial={false}>
          {mode === "open" ? (
            <motion.div
              key="photo"
              layout={!reduced}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration, ease: EASE }}
              className="flex flex-1 items-center justify-center overflow-hidden p-4"
            >
              <Image
                src={src}
                alt={name}
                width={width}
                height={height}
                sizes="192px"
                priority
                className="portrait-fade h-auto w-full translate-y-[6%]"
              />
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/*
          Doubles as the restore target while minimised, the way a minimised
          window is reopened from the Dock rather than from its own chrome.
        */}
        {mode === "minimised" ? (
          <button
            type="button"
            onClick={() => setMode("open")}
            className="border-t border-white/8 bg-white/4 px-3 py-2.5 text-center font-display text-[0.8125rem] tracking-display transition-colors hover:text-accent"
          >
            {name}
          </button>
        ) : (
          <p className="border-t border-white/8 bg-white/4 px-3 py-2.5 text-center font-display text-[0.8125rem] tracking-display">
            {name}
          </p>
        )}
      </motion.div>

      <MacWindow
        open={zoomed}
        title={name}
        onClose={() => setZoomed(false)}
        widthClassName="max-w-sm"
      >
        <div className="flex justify-center bg-surface p-8">
          <Image
            src={src}
            alt={name}
            width={width}
            height={height}
            sizes="320px"
            className="h-auto w-full"
          />
        </div>
      </MacWindow>
    </>
  );
}

/**
 * The glyphs only appear on hover anywhere in the bar, which is how the
 * desktop does it — and it is also what stops three tiny symbols competing
 * with the photo for attention when nobody is reaching for them.
 *
 * The dot is 10px to match `MacWindow`, but the padding pushes the hit area
 * out to 18px without moving the dots apart, since the negative margin takes
 * the extra back out of the layout.
 */
function Light({
  tone,
  label,
  glyph,
  onClick,
}: {
  tone: string;
  label: string;
  glyph: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="-m-1 p-1">
      <span
        className={`grid size-2.5 place-items-center rounded-full text-[7px] font-bold leading-none text-black/60 ${tone}`}
      >
        <span className="opacity-0 transition-opacity duration-200 group-hover/bar:opacity-100" aria-hidden>
          {glyph}
        </span>
      </span>
    </button>
  );
}
