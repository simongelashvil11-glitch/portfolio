"use client";

import { usePathname } from "next/navigation";
import { ViewTransition, type ReactNode } from "react";

/*
 * A short crossfade between public pages, using the browser's View
 * Transitions API through React's <ViewTransition>.
 *
 * A layout persists across navigations, so a boundary placed in it would
 * never enter or exit. Keying it by the path makes each page its own
 * boundary: on a navigation the old page exits (fades out quickly) and the
 * new one enters (fades in and rises a few pixels). `default="none"` keeps
 * every other update inside the page — a form sending, a video opening —
 * from animating the whole page.
 *
 * Browsers without the API change pages as before. The motion is in
 * globals.css (`page-in`, `page-out`), and switched off for visitors who ask
 * for reduced motion.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <ViewTransition key={pathname} enter="page-in" exit="page-out" default="none">
      <div className="flex flex-1 flex-col">{children}</div>
    </ViewTransition>
  );
}

/**
 * A project's picture, named so it morphs between the card on the homepage
 * and the top of the project's page. Only on the way in (the card's link
 * carries the "to-project" type); going back is a plain crossfade, because
 * homepage cards below the window wait hidden to fade in as they scroll
 * into view, and a morph back would land on a hidden card.
 */
export function ProjectPicture({ slug, children }: { slug: string; children: ReactNode }) {
  return (
    <ViewTransition name={`project-${slug}`} share={{ "to-project": "morph", default: "none" }} default="none">
      {children}
    </ViewTransition>
  );
}
