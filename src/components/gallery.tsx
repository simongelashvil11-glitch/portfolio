"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

import { Dialog } from "@/components/dialog";
import { ChevronLeft, ChevronRight } from "@/components/fluent-icons";

/**
 * Case-study images: a grid of stills that open full size in the same dialog
 * the video player uses.
 *
 * Thumbnails are shown whole, at their own shape. They used to be cropped
 * to 4:3, which cut the edges off ad creatives — prices, logos and lettering
 * live at the edges — so the preview showed a different picture from the
 * one that opened. Tiles align to the top, so a set of same-shaped images
 * (the usual case) lines up exactly and a mixed set stays tidy.
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
      <ul className={`grid items-start gap-3 ${columns(images.length)}`}>
        {images.map((src, index) => (
          <li key={src}>
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              aria-label={`Open image ${index + 1} of ${images.length}`}
              className="group card card-interactive relative block w-full overflow-hidden bg-surface"
            >
              {/*
                A plain img rather than next/image: its size is not known
                ahead of time, and next/image needs either that or a fixed
                frame — which is the crop this replaced.
              */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                loading="lazy"
                decoding="async"
                className="block h-auto w-full transition-transform duration-300 ease-(--ease-fluent) group-hover:scale-[1.02]"
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

/** Two across for small sets, three once there are enough to fill rows. */
function columns(count: number) {
  if (count === 1) return "grid-cols-1 max-w-md";
  if (count === 2 || count === 4) return "grid-cols-2";
  return "grid-cols-2 lg:grid-cols-3";
}
