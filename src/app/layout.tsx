import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
