import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
