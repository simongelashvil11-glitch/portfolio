/**
 * The site's own absolute URL, used for metadata, the sitemap and robots.txt.
 *
 * Resolved rather than read straight from the environment, because the value
 * arrives in more shapes than it looks. A variable set to an empty string is
 * not `undefined`, so `??` never fires and `new URL("")` throws — and because
 * that happens while collecting metadata, it fails the *build* rather than a
 * request. Hosts also hand out bare domains with no protocol.
 */
const FALLBACK = "http://localhost:3000";

function normalise(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  // Vercel's variables are bare domains; anything else is taken as given.
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    return new URL(withProtocol).toString().replace(/\/+$/, "");
  } catch {
    // A malformed value should not take the whole build down with it.
    return null;
  }
}

export const siteUrl =
  normalise(process.env.NEXT_PUBLIC_SITE_URL) ??
  // Set by Vercel. Production first, so preview builds still point at the
  // real domain rather than their own throwaway one.
  normalise(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
  normalise(process.env.VERCEL_URL) ??
  FALLBACK;
