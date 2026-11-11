"use client";

import Image from "next/image";
import { useState } from "react";

import { Dialog } from "@/components/dialog";
import { Play } from "@/components/fluent-icons";
import { youTubeId } from "@/lib/youtube";

/** The player, in the site's dialog. */
function Player({ id, title, open, onClose }: { id: string; title: string; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} title={title} onClose={onClose}>
      <div className="aspect-video w-full overflow-hidden rounded-[4px] bg-black">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="size-full"
        />
      </div>
    </Dialog>
  );
}

/** Fluent's round play control: white, shadowed, a filled brand glyph. */
function PlayBadge({ large = false }: { large?: boolean }) {
  return (
    <span
      className={`grid place-items-center rounded-full bg-white text-accent shadow-fluent-8 transition-transform duration-150 group-hover/video:scale-105 ${
        large ? "size-16 text-[28px]" : "size-11 text-[20px]"
      }`}
    >
      <Play filled className="translate-x-px" />
    </span>
  );
}

/**
 * The preview at the top of a work card: the video's still, which plays in
 * the dialog. Sits above the card's own link so the two do not compete.
 */
export function VideoCardPreview({ url, title, posterUrl }: { url: string; title: string; posterUrl?: string | null }) {
  const [open, setOpen] = useState(false);
  const id = youTubeId(url);
  if (!id) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Play video: ${title}`}
        className="group/video relative z-10 block aspect-video w-full overflow-hidden bg-surface"
      >
        <Image
          src={posterUrl ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, 480px"
          className="object-cover"
        />
        <span className="absolute inset-0 grid place-items-center bg-black/10 transition-colors group-hover/video:bg-black/20">
          <PlayBadge />
        </span>
      </button>
      <Player id={id} title={title} open={open} onClose={() => setOpen(false)} />
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
        className="group/video relative block aspect-video w-full overflow-hidden rounded-[8px] bg-surface"
      >
        <Image
          src={poster}
          alt=""
          fill
          sizes="(max-width: 1024px) 100vw, 960px"
          priority
          onError={() => setFallback(true)}
          className="object-cover"
        />
        <span className="absolute inset-0 grid place-items-center bg-black/10 transition-colors group-hover/video:bg-black/20">
          <PlayBadge large />
        </span>
      </button>
      <Player id={id} title={title} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
