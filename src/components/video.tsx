"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { Dialog } from "@/components/dialog";
import { Play } from "@/components/fluent-icons";
import { youTubeId } from "@/lib/youtube";

import "./video-preview.css";

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
export function VideoCardPreview({
  url,
  title,
  posterUrl,
  previewUrl,
}: {
  url: string;
  title: string;
  posterUrl?: string | null;
  /** A short silent clip on the site, played while the card is hovered. */
  previewUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const { armed, visible, frame, videoRef, enter, leave, playing } = useHoverPreview(Boolean(previewUrl));
  const id = youTubeId(url);
  if (!id) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        onPointerEnter={enter}
        onPointerLeave={leave}
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
        {armed ? (
          previewUrl ? (
            <video
              ref={videoRef}
              src={previewUrl}
              muted
              loop
              playsInline
              preload="auto"
              onPlaying={playing}
              className={`preview-layer absolute inset-0 size-full object-cover ${visible ? "opacity-100" : "opacity-0"}`}
            />
          ) : (
            // The three stills YouTube cuts from every video, at about a quarter, half and three quarters.
            ["hq1", "hq2", "hq3"].map((still, index) => (
              <Image
                key={still}
                src={`https://i.ytimg.com/vi/${id}/${still}.jpg`}
                alt=""
                fill
                unoptimized
                sizes="480px"
                className={`preview-layer preview-still object-cover ${
                  visible && frame === index ? "opacity-100" : "opacity-0"
                }`}
              />
            ))
          )
        ) : null}
        <span className="absolute inset-0 grid place-items-center bg-black/10 transition-colors group-hover/video:bg-black/20">
          <PlayBadge />
        </span>
      </button>
      <Player id={id} title={title} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** How long each still holds before the next fades in. */
const STILL_MS = 900;

/**
 * The work card's hover preview: a clip when the project has one, else its
 * YouTube stills in turn with a slow push-in. Mouse and trackpad only, after
 * a short pause so a pointer passing over the grid sets nothing off, and not
 * at all for visitors who ask for reduced motion. Nothing loads until the
 * first hover.
 */
function useHoverPreview(hasClip: boolean) {
  const [armed, setArmed] = useState(false);
  const [visible, setVisible] = useState(false);
  const [frame, setFrame] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timers = useRef<{ start?: number; cycle?: number }>({});

  const stop = useCallback(() => {
    window.clearTimeout(timers.current.start);
    window.clearInterval(timers.current.cycle);
  }, []);

  useEffect(() => stop, [stop]);

  const enter = useCallback(
    (event: ReactPointerEvent) => {
      if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      stop();
      setArmed(true);
      timers.current.start = window.setTimeout(() => {
        if (hasClip) {
          videoRef.current?.play().catch(() => {});
          return; // shown once it is actually playing
        }
        setFrame(0);
        setVisible(true);
        timers.current.cycle = window.setInterval(() => setFrame((current) => (current + 1) % 3), STILL_MS);
      }, 180);
    },
    [hasClip, stop],
  );

  const leave = useCallback(() => {
    stop();
    setVisible(false);
    videoRef.current?.pause();
  }, [stop]);

  const playing = useCallback(() => setVisible(true), []);

  return { armed, visible, frame, videoRef, enter, leave, playing };
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
