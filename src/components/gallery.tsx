"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

import { MacWindow } from "@/components/mac-window";

/**
 * Case-study images: a grid of stills that open full size in the same window
 * the video player uses.
 *
 * Photographs arrive at every shape, so thumbnails crop to a common ratio to
 * keep the grid tidy while the opened image is contained, never cropped —
 * what you click is a tidy tile, what you get is the whole frame.
 */
export function Gallery({ images, title }: { images: string[]; title: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const isOpen = openIndex !== null;

  const step = useCallback(
    (delta: number) => {
      setOpenIndex((current) =>
        current === null ? null : (current + delta + images.length) % images.length,
      );
    },
    [images.length],
  );

  // Arrow keys page through once something is open. Escape is the window's job.
  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, step]);

  if (images.length === 0) return null;

  return (
    <>
      <ul className="mt-12 grid gap-3 sm:grid-cols-2">
        {images.map((src, index) => (
          <li key={src}>
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              aria-label={`Open image ${index + 1} of ${images.length}`}
              className="group/shot relative block aspect-[4/3] w-full overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-white/20"
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, 384px"
                unoptimized
                className="object-cover transition-transform duration-500 ease-out group-hover/shot:scale-[1.03]"
              />
            </button>
          </li>
        ))}
      </ul>

      <MacWindow
        open={isOpen}
        title={images.length > 1 ? `${title} — ${(openIndex ?? 0) + 1} of ${images.length}` : title}
        onClose={() => setOpenIndex(null)}
        widthClassName="max-w-5xl"
      >
        <div className="relative grid max-h-[75vh] place-items-center bg-black">
          {openIndex !== null ? (
            <Image
              key={images[openIndex]}
              src={images[openIndex]}
              alt=""
              width={1600}
              height={1200}
              unoptimized
              className="max-h-[75vh] w-auto object-contain"
            />
          ) : null}

          {images.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous image"
                className="absolute left-3 grid size-10 place-items-center rounded-full border border-white/15 bg-black/55 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/75 hover:text-white"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next image"
                className="absolute right-3 grid size-10 place-items-center rounded-full border border-white/15 bg-black/55 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/75 hover:text-white"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          ) : null}
        </div>
      </MacWindow>
    </>
  );
}
