"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  /** Stagger helper — multiplied by 60ms. */
  index?: number;
  className?: string;
};

/**
 * Fades and lifts content the first time it scrolls into view.
 *
 * The hidden starting state has to render identically on the server and the
 * client, so reduced motion is handled in CSS (see `[data-reveal]` in
 * globals.css) rather than by branching here — branching leaves a hydration
 * mismatch that React cannot patch, stranding the content at opacity 0.
 */
export function Reveal({ children, index = 0, className }: RevealProps) {
  return (
    <motion.div
      data-reveal
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{
        duration: 0.6,
        delay: Math.min(index, 6) * 0.06,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
