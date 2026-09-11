import type { Metadata, Viewport } from "next";

import { VisualResume } from "@/components/visual-resume";

export const revalidate = 60;

/*
 * The sheet is a fixed A4 width, so a phone lays it out at full size and opens
 * showing a corner. Declaring a layout width the sheet fits inside makes the
 * browser scale the whole thing to the screen instead, the way it would a PDF.
 *
 * 856 rather than the sheet's own 794: the horizontal margins are auto, so the
 * extra is simply a gutter either side. Measured at zero overflow.
 *
 * Desktop ignores this, and zooming is deliberately left alone — the page opens
 * whole, and anyone who wants to read it can still pinch in.
 */
export const viewport: Viewport = {
  width: 856,
  // Explicitly cleared. Next fills in `initial-scale: 1` otherwise, which pins
  // the zoom at 1:1 and leaves the sheet needing to be scrolled — the opposite
  // of the point. With only a width declared, the browser picks the zoom that
  // fits it.
  initialScale: undefined,
};

export const metadata: Metadata = {
  title: "Résumé — visual",
  robots: { index: false, follow: false },
};

export default function VisualResumePage() {
  return <VisualResume tone="dark" />;
}
