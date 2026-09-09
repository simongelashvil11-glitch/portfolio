import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";

import { siteUrl } from "@/lib/site-url";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
/* Headings share the body face — open and wide rather than a condensed serif. */
const display = Geist({ variable: "--font-display", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Portfolio", template: "%s — Portfolio" },
  description: "Selected work, experience and writing.",
  openGraph: { type: "website", url: siteUrl },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    /*
      `suppressHydrationWarning` because the script below writes `data-rail`
      onto this element before React ever sees it, which is the whole point:
      the palette has to be settled before anything paints, or the sidebar
      flashes the wrong appearance on every load.
    */
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Script
          id="rail-appearance"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `try{var r=localStorage.getItem("rail");document.documentElement.dataset.rail=r==="light"?"light":"dark"}catch(e){document.documentElement.dataset.rail="dark"}`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
