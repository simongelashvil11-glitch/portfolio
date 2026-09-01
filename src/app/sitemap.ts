import type { MetadataRoute } from "next";

import { getProjects } from "@/lib/queries";
import { siteUrl } from "@/lib/site-url";

/**
 * Only the pages the navigation actually reaches. /writing still resolves,
 * but nothing links to it, so advertising it would point crawlers at a
 * section with no way in — add it back here if it returns to the nav.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const projects = await getProjects();

  return [
    { url: siteUrl, changeFrequency: "monthly", priority: 1 },
    { url: `${siteUrl}/about`, changeFrequency: "monthly", priority: 0.9 },
    ...projects
      .filter((project) => project.description)
      .map((project) => ({
        url: `${siteUrl}/projects/${project.slug}`,
        lastModified: project.createdAt,
      })),
  ];
}
