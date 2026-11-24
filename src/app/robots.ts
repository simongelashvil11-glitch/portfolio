import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    // /admin is deliberately not listed: naming it here advertises it. Its
    // pages send `noindex` and redirect to sign-in, which keeps them out of
    // search results — and a crawler has to be allowed in to see the noindex.
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
