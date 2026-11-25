import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { EngagementSignals } from "@/components/engagement-signals";
import { VisitBeacon } from "@/components/visit-beacon";
import { getProfile } from "@/lib/queries";
import { siteUrl } from "@/lib/site-url";

import "./globals.css";



/*
 * The site is set in Fluent's own face, Segoe UI, through `--font-fluent`.
 * Geist stays loaded for the résumé and LinkedIn cover pages, which are
 * printed and exported and keep their own type.
 */
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

/**
 * The site is named after whoever the profile says it belongs to, rather than
 * carrying a second copy of the name here that would drift the moment the one
 * in admin is edited. The fallback only shows if there is no profile row yet.
 */
export async function generateMetadata(): Promise<Metadata> {
  const profile = await getProfile();
  const name = profile?.name?.trim() || "Simon Gelashvili";
  // "Simon Gelashvili — Digital Marketer, Tbilisi": the words people search for.
  // Role and location come from the profile, so either can be changed in admin.
  const role = [profile?.role?.trim(), profile?.location?.trim()].filter(Boolean).join(", ");

  return {
    metadataBase: new URL(siteUrl),
    title: { default: role ? `${name} — ${role}` : name, template: `%s — ${name}` },
    description: profile?.headline?.trim() || "Selected work and experience.",
    openGraph: { type: "website", url: siteUrl, siteName: name },
    // The image itself comes from app/opengraph-image.tsx; this asks X and
    // others to show it large rather than as a thumbnail.
    twitter: { card: "summary_large_image" },
    robots: { index: true, follow: true },
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the script below adds a class React did not render.
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/*
          Marks the page as scripted before the first paint, so effects that
          would otherwise flash (figures counting up from zero) can hold their
          final state hidden until they start. Everything still works and
          shows without it. See `.js` in globals.css.
        */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body className="flex min-h-full flex-col">
        {children}
        {/* Page views for the admin's Visitors page; admin paths are dropped server-side. */}
        <VisitBeacon />
        {/* Engagement signals for the admin's Signals page: reading, followed links, copies, prints, exit card. */}
        <EngagementSignals />
      </body>
    </html>
  );
}