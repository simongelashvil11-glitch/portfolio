import type { Profile, Project } from "@/db/schema";

import { siteUrl } from "./site-url";
import { youTubeId } from "./youtube";

/* What search engines and link previews read about a page, beyond what it shows. */

/** A site path or a full URL, made absolute. */
export function absoluteUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return url.startsWith("/") ? `${siteUrl}${url}` : url;
}

/** Structured data as a script body; `<` is escaped so no text can close the tag early. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/**
 * Plain text for a meta description: the first paragraph, Markdown marks
 * removed, cut at a word boundary near `max` characters.
 */
export function excerpt(text: string | null | undefined, max = 160): string | null {
  const first = (text ?? "")
    .split(/\r?\n\s*\r?\n/)
    .map((part) => part.trim())
    .find(Boolean);
  if (!first) return null;
  const plain = first
    .replace(/[*_`#>]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max * 0.6))}…`;
}

/** The still that stands for a project: its cover image, else its video's YouTube still. */
export function projectStill(project: Pick<Project, "imageUrl" | "videoUrl">, quality: "hq" | "maxres" = "hq") {
  if (project.imageUrl) return absoluteUrl(project.imageUrl);
  const id = project.videoUrl ? youTubeId(project.videoUrl) : null;
  return id ? `https://i.ytimg.com/vi/${id}/${quality}default.jpg` : undefined;
}

/** A case study as schema.org data: the work, who made it, and where it sits in the site. */
export function projectJsonLd(project: Project, profile: Pick<Profile, "name" | "role"> | null): string {
  const url = `${siteUrl}/projects/${project.slug}`;
  const author = { "@type": "Person", name: profile?.name ?? "Simon Gelashvili", url: siteUrl };
  return jsonLd({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CreativeWork",
        "@id": `${url}#work`,
        name: project.title,
        headline: project.title,
        description: project.summary,
        url,
        image: projectStill(project, "maxres"),
        ...(project.year && /^\d{4}(-\d{2})?$/.test(project.year) ? { dateCreated: project.year } : {}),
        ...(project.tags.length ? { keywords: project.tags.join(", ") } : {}),
        author,
        creator: author,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
          { "@type": "ListItem", position: 2, name: "Work", item: `${siteUrl}/#work` },
          { "@type": "ListItem", position: 3, name: project.title, item: url },
        ],
      },
    ],
  });
}
