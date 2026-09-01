"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Play, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

/**
 * Pulls the video id out of the shapes a YouTube link normally arrives in:
 * watch?v=, youtu.be/, /embed/, /shorts/ and /live/.
 */
export function youTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") return parsed.pathname.slice(1).split("/")[0] || null;
    if (!host.endsWith("youtube.com") && !host.endsWith("youtube-nocookie.com")) return null;

    const fromQuery = parsed.searchParams.get("v");
    if (fromQuery) return fromQuery;

    const [, segment, id] = parsed.pathname.split("/");
    if (["embed", "shorts", "live", "v"].includes(segment) && id) return id;

    return null;
  } catch {
    return null;
  }
}

/**
 * The window itself — styled after the desktop the footage was probably cut
 * on. Shared by every trigger below so the popup animation stays identical
 * wherever a video is opened from.
 */
function VideoWindow({
  id,
  title,
  open,
  onClose,
}: {
  id: string;
  title: string;
  open: boolean;
  onClose: () => void;
}) {
  const reduced = useReducedMotion();

  // Escape closes the window, and the page behind it stays put while open.
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
            aria-label="Close video"
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="relative w-full max-w-4xl overflow-hidden rounded-xl border border-white/12 bg-surface shadow-[0_30px_90px_-20px_rgb(0_0_0/0.9)]"
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
                aria-label="Close video"
                className="text-white/40 transition-colors hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="aspect-video w-full bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="size-full"
              />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** A small still beside a project row. */
export function VideoThumb({ url, title }: { url: string; title: string }) {
  const [open, setOpen] = useState(false);
  const id = youTubeId(url);

  if (!id) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Play video: ${title}`}
        className="group/video relative aspect-video w-20 shrink-0 overflow-hidden rounded-md border border-white/10 bg-surface transition-colors hover:border-white/30 sm:w-24"
      >
        <Image
          src={`https://i.ytimg.com/vi/${id}/mqdefault.jpg`}
          alt=""
          fill
          sizes="96px"
          className="object-cover opacity-70 transition-opacity duration-300 group-hover/video:opacity-100"
        />
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid size-6 place-items-center rounded-full bg-black/55 backdrop-blur-sm transition-transform duration-300 group-hover/video:scale-110">
            <Play className="size-3 translate-x-px fill-white text-white" />
          </span>
        </span>
      </button>

      <VideoWindow id={id} title={title} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/**
 * The full-width still that leads a case study. Uses the project's own cover
 * image when there is one, so nothing the admin uploaded goes to waste, and
 * falls back to YouTube's poster — dropping to a lower resolution if the
 * large one was never generated for that upload.
 */
export function VideoPoster({
  url,
  title,
  posterUrl,
}: {
  url: string;
  title: string;
  posterUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const id = youTubeId(url);
  const [fallback, setFallback] = useState(false);

  if (!id) return null;

  const poster =
    posterUrl ?? `https://i.ytimg.com/vi/${id}/${fallback ? "hqdefault" : "maxresdefault"}.jpg`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Play video: ${title}`}
        className="group/poster relative mt-10 block aspect-video w-full overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-white/20"
      >
        <Image
          src={poster}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 768px"
          priority
          onError={() => setFallback(true)}
          className="object-cover transition-transform duration-500 ease-out group-hover/poster:scale-[1.02]"
        />

        {/* Keeps the play control readable over a bright frame. */}
        <span className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

        <span className="absolute inset-0 grid place-items-center">
          <span className="grid size-16 place-items-center rounded-full border border-white/25 bg-black/45 backdrop-blur-sm transition-transform duration-300 group-hover/poster:scale-110">
            <Play className="size-6 translate-x-0.5 fill-white text-white" />
          </span>
        </span>
      </button>

      <VideoWindow id={id} title={title} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
