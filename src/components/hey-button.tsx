"use client";

import { useRef } from "react";

import { whatsAppHref } from "@/components/brand-icons";

/*
 * "Hey 👋": a pill that opens WhatsApp with a hello already typed. The hand is
 * Microsoft's Fluent Emoji (MIT), split into the hand and its motion lines so
 * the hand can wave from the wrist while the lines pulse. It waves once after
 * the page settles and again on hover; on press it pops and throws a few
 * sparks, like an emoji reacting. All motion is CSS (globals.css, `.hey`), and
 * none of it runs for visitors who ask for reduced motion.
 */

const SPARKS = ["hand", "dot", "dot", "hand", "dot", "dot", "hand"] as const;
const COLOURS = ["var(--lavender)", "var(--accent)", "#f3a3d8", "#7fb8f5"];

export function HeyButton({ phone, name, className = "" }: { phone: string; name: string; className?: string }) {
  const burst = useRef<HTMLSpanElement>(null);
  const firstName = name.trim().split(/\s+/)[0] || name;
  const href = `${whatsAppHref(phone)}?text=${encodeURIComponent(`Hey ${firstName}! 👋`)}`;

  function react(event: React.PointerEvent<HTMLAnchorElement>) {
    if (event.button !== 0) return;
    const link = event.currentTarget;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Restart the pop even on quick repeat presses.
    link.removeAttribute("data-pop");
    void link.offsetWidth;
    link.setAttribute("data-pop", "");

    const holder = burst.current;
    if (holder) {
      SPARKS.forEach((kind, index) => {
        const spark = document.createElement("span");
        spark.className = kind === "hand" ? "hey-spark hey-spark-hand" : "hey-spark";
        // Thrown up and outward, so nothing flies down into the text below.
        const angle = (-165 + (150 / (SPARKS.length - 1)) * index + (Math.random() * 16 - 8)) * (Math.PI / 180);
        const distance = 26 + Math.random() * 16;
        spark.style.setProperty("--x", `${Math.cos(angle) * distance}px`);
        spark.style.setProperty("--y", `${Math.sin(angle) * distance}px`);
        spark.style.setProperty("--r", `${Math.random() * 80 - 40}deg`);
        if (kind === "dot") spark.style.background = COLOURS[index % COLOURS.length];
        spark.addEventListener("animationend", () => spark.remove(), { once: true });
        holder.appendChild(spark);
      });
    }
    // A short tick on phones that support it.
    navigator.vibrate?.(12);
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={`Say hey to ${firstName} on WhatsApp`}
      title="Say hey on WhatsApp"
      onPointerDown={react}
      onAnimationEnd={(event) => {
        if (event.animationName === "hey-pop") event.currentTarget.removeAttribute("data-pop");
      }}
      className={`hey ${className}`}
    >
      <span className="hey-emoji" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element -- two tiny static layers; next/image adds nothing here */}
        <img className="hey-lines" src="/emoji/wave-lines-64.png" srcSet="/emoji/wave-lines-64.png 1x, /emoji/wave-lines-128.png 2x" alt="" width={20} height={20} />
        {/* eslint-disable-next-line @next/next/no-img-element -- as above */}
        <img className="hey-hand" src="/emoji/wave-hand-64.png" srcSet="/emoji/wave-hand-64.png 1x, /emoji/wave-hand-128.png 2x" alt="" width={20} height={20} />
        <span ref={burst} className="hey-burst" />
      </span>
      <span className="hey-label">Hey</span>
    </a>
  );
}
