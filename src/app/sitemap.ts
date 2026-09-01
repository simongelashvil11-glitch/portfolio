import type { MetadataRoute } from "next";

import { getPosts, getProjects } from "@/lib/queries";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projects, posts] = await Promise.all([getProjects(), getPosts()]);

  return [
    { url: siteUrl, changeFrequency: "monthly", priority: 1 },
    { url: `${siteUrl}/about`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${siteUrl}/writing`, changeFrequency: "weekly", priority: 0.8 },
    ...projects
      .filter((project) => project.description)
      .map((project) => ({
        url: `${siteUrl}/projects/${project.slug}`,
        lastModified: project.createdAt,
      })),
    ...posts.map((post) => ({
      url: `${siteUrl}/writing/${post.slug}`,
      lastModified: post.publishedAt ?? post.createdAt,
    })),
  ];
}
