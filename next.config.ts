import type { NextConfig } from "next";

/*
 * Content Security Policy. Scripts, styles, fonts and connections stay on the
 * site itself; YouTube is the only thing framed. Images may come from any
 * https host, because logos and covers are pasted into the admin as URLs
 * (Wikimedia, Simple Icons, Framer…) and a fixed list would quietly break the
 * next one. 'unsafe-inline' for scripts is needed by Next's inline bootstrap
 * without per-request nonces; 'unsafe-eval' only by the dev server.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src https://www.youtube-nocookie.com https://www.youtube.com",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  // Don't announce the framework in every response.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // The dev-only indicator anchors bottom-left, on top of the sidebar's own
  // links, and `position` does not move it in this version. Compile and
  // runtime errors are still surfaced with it off.
  devIndicators: false,
  // The IP-to-network database is read from disk at run time, which the
  // file tracer cannot see, so it is named here for the routes that use it.
  outputFileTracingIncludes: {
    "/api/visit": ["./data/dbip-asn-lite.mmdb"],
  },
  images: {
    // Cover images are pasted in as URLs from the admin dashboard, so the
    // host is not known ahead of time.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
