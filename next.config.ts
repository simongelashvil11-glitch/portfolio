import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev-only indicator anchors bottom-left, on top of the sidebar's own
  // links, and `position` does not move it in this version. Compile and
  // runtime errors are still surfaced with it off.
  devIndicators: false,
  images: {
    // Cover images are pasted in as URLs from the admin dashboard, so the
    // host is not known ahead of time.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
