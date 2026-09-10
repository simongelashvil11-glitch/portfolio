import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { getProfile } from "@/lib/queries";
import { siteUrl } from "@/lib/site-url";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
/* Headings share the body face — open and wide rather than a condensed serif. */
const display = Geist({ variable: "--font-display", subsets: ["latin"] });

/**
 * The site is named after whoever the profile says it belongs to, rather than
 * carrying a second copy of the name here that would drift the moment the one
 * in admin is edited. The fallback only shows if there is no profile row yet.
 */
export async function generateMetadata(): Promise<Metadata> {
  const profile = await getProfile();
  const name = profile?.name?.trim() || "Simon Gelashvili";

  return {
    metadataBase: new URL(siteUrl),
    title: { default: name, template: `%s — ${name}` },
    description: profile?.headline?.trim() || "Selected work and experience.",
    openGraph: { type: "website", url: siteUrl, siteName: name },
    robots: { index: true, follow: true },
  };
}

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
        {/*
          A plain script, not `next/script`. `beforeInteractive` sounds like
          the right strategy and is not: it never reaches the server HTML for
          an inline script, so it is injected by the client runtime and runs
          after the page has already painted — which is the flash it was
          supposed to prevent. Rendered here it is in the markup, first thing
          inside the body, and runs while the rest is still being parsed.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var r=localStorage.getItem("rail");document.documentElement.dataset.rail=r==="light"?"light":"dark"}catch(e){document.documentElement.dataset.rail="dark"}`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
