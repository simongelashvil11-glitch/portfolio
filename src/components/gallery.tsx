"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

import { Dialog } from "@/components/dialog";
import { ChevronLeft, ChevronRight } from "@/components/fluent-icons";

/**
 * Case-study images: a grid of stills that open full size in the same dialog
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

  // Arrow keys page through once something is open. Escape is the dialog's job.
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
      <ul className="grid gap-3 sm:grid-cols-2">
        {images.map((src, index) => (
          <li key={src}>
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              aria-label={`Open image ${index + 1} of ${images.length}`}
              className="card card-interactive relative block aspect-[4/3] w-full overflow-hidden"
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, 480px"
                unoptimized
                className="object-cover"
              />
            </button>
          </li>
        ))}
      </ul>

      <Dialog
        open={isOpen}
        title={images.length > 1 ? `${title} — ${(openIndex ?? 0) + 1} of ${images.length}` : title}
        onClose={() => setOpenIndex(null)}
        widthClassName="max-w-5xl"
      >
        <div className="relative grid max-h-[72vh] place-items-center overflow-hidden rounded-[4px] bg-surface">
          {openIndex !== null ? (
            <Image
              key={images[openIndex]}
              src={images[openIndex]}
              alt=""
              width={1600}
              height={1200}
              unoptimized
              className="max-h-[72vh] w-auto object-contain"
            />
          ) : null}

          {images.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous image"
                className="btn btn-secondary btn-icon absolute left-3 rounded-full shadow-fluent-8"
              >
                <ChevronLeft />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next image"
                className="btn btn-secondary btn-icon absolute right-3 rounded-full shadow-fluent-8"
              >
                <ChevronRight />
              </button>
            </>
          ) : null}
        </div>
      </Dialog>
    </>
  );
}
