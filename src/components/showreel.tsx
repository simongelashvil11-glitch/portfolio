"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { VideoPoster } from "@/components/video";
import { youTubeId } from "@/lib/youtube";

/*
 * The homepage showreel, under the hero. Set in the admin's profile as
 * either a silent clip on this site (/showreel.mp4), which plays muted on a
 * loop with a sound toggle, or a YouTube link, which shows its still and
 * opens in the player like the case-study videos. Absent until one is set.
 *
 * A clip does not play by itself for visitors who ask for reduced motion;
 * they get its controls instead.
 */
export function Showreel({ url, name }: { url: string; name: string }) {
  if (youTubeId(url)) {
    return (
      <figure className="relative">
        <VideoPoster url={url} title={`${name} — showreel`} />
        <Caption />
      </figure>
    );
  }
  return <ClipShowreel src={url} name={name} />;
}

function Caption() {
  return (
    <figcaption className="pointer-events-none absolute left-3 top-3 z-10 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold shadow-fluent-4">
      Showreel
    </figcaption>
  );
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeToMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function ClipShowreel({ src, name }: { src: string; name: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const reduced = useSyncExternalStore(
    subscribeToMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
  // Reduced motion, or a browser that refused to autoplay: hand over the controls.
  const still = reduced || blocked;

  useEffect(() => {
    if (reduced) return;
    video.current?.play().catch(() => setBlocked(true));
  }, [reduced]);

  return (
    <figure className="relative overflow-hidden rounded-[8px] bg-surface shadow-fluent-8">
      <video
        ref={video}
        src={src}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        controls={still}
        aria-label={`${name} — showreel`}
        className="aspect-video w-full object-cover"
      />
      <Caption />
      {!still ? (
        <button
          type="button"
          onClick={() => setMuted((current) => !current)}
          className="btn btn-secondary absolute bottom-3 right-3 z-10 bg-white/90"
          aria-pressed={!muted}
        >
          {muted ? "Sound on" : "Sound off"}
        </button>
      ) : null}
    </figure>
  );
}
