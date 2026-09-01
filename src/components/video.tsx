"use client";

import { Play } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { MacWindow } from "@/components/mac-window";

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

      <MacWindow open={open} title={title} onClose={() => setOpen(false)}>
        <div className="aspect-video w-full bg-black">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="size-full"
          />
        </div>
      </MacWindow>
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

      <MacWindow open={open} title={title} onClose={() => setOpen(false)}>
        <div className="aspect-video w-full bg-black">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="size-full"
          />
        </div>
      </MacWindow>
    </>
  );
}
