import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { getProfile, getProjectBySlug } from "@/lib/queries";
import { excerpt, projectStill } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";

/*
 * The picture shown when a link to a case study is shared: the project's
 * title, summary and headline figure beside its still, on the same gradient
 * as the site's own card (app/opengraph-image.tsx). Built from the project's
 * row, so editing the project and redeploying updates it.
 */

export const alt = "Case study by Simon Gelashvili";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The still as a data URL the renderer can draw, or null. A missing max-res still falls back to the small one. */
async function stillSource(project: Parameters<typeof projectStill>[0]): Promise<string | null> {
  const candidates = [projectStill(project, "maxres"), projectStill(project, "hq")].filter(
    (url, index, all): url is string => !!url && all.indexOf(url) === index,
  );
  for (const url of candidates) {
    try {
      if (url.startsWith(`${siteUrl}/`)) {
        // A file in /public: read from disk, as the site's own card does.
        const file = await readFile(join(process.cwd(), "public", url.slice(siteUrl.length)));
        return `data:image/${url.endsWith(".png") ? "png" : "jpeg"};base64,${file.toString("base64")}`;
      }
      const response = await fetch(url);
      const type = response.headers.get("content-type") ?? "";
      if (!response.ok || !/image\/(png|jpe?g)/.test(type)) continue;
      return `data:${type};base64,${Buffer.from(await response.arrayBuffer()).toString("base64")}`;
    } catch {
      // Try the next one.
    }
  }
  return null;
}

export default async function ProjectOpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [project, profile] = await Promise.all([getProjectBySlug(slug), getProfile()]);
  const name = profile?.name?.trim() || "Simon Gelashvili";
  const role = profile?.role?.trim() || "";
  const host = new URL(siteUrl).host;

  const title = project?.title ?? name;
  const figure = project?.stats.find((stat) => stat.featured) ?? null;
  // Without a headline figure the summary gets its room, so a result stated
  // at its end ("…increased sales by over 100%") is not the part cut off.
  const summary = excerpt(project?.summary, figure ? 140 : 230);
  const still = project ? await stillSource(project) : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 56,
          padding: "0 72px",
          color: "#242424",
          backgroundColor: "#eef2ff",
          backgroundImage:
            "radial-gradient(circle at 18% 85%, rgba(243,208,247,0.9), rgba(243,208,247,0) 45%), radial-gradient(circle at 85% 15%, rgba(219,233,254,1), rgba(219,233,254,0) 50%), linear-gradient(180deg, #ecf0ff 0%, #eef2ff 45%, #f7effc 100%)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", width: 44, height: 6, borderRadius: 3, backgroundColor: "#7f85f5" }} />
            <div style={{ display: "flex", fontSize: 24, color: "#0f6cbd", fontWeight: 600 }}>Case study</div>
          </div>
          <div style={{ display: "flex", marginTop: 22, fontSize: title.length > 26 ? 50 : 60, fontWeight: 700, lineHeight: 1.08 }}>
            {title}
          </div>
          {summary ? (
            <div style={{ display: "flex", marginTop: 20, fontSize: figure ? 25 : 24, lineHeight: 1.4, color: "#424242" }}>
              {summary}
            </div>
          ) : null}
          {figure ? (
            <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 26 }}>
              <div style={{ display: "flex", fontSize: 50, fontWeight: 700 }}>{figure.value}</div>
              <div style={{ display: "flex", fontSize: 22, color: "#616161" }}>{figure.label}</div>
            </div>
          ) : null}
          <div style={{ display: "flex", flexDirection: "column", marginTop: 30, fontSize: 22, color: "#616161" }}>
            <div style={{ display: "flex" }}>{[name, role].filter(Boolean).join("  ·  ")}</div>
            <div style={{ display: "flex", marginTop: 4, fontSize: 20 }}>{host}</div>
          </div>
        </div>
        {still ? (
          // eslint-disable-next-line @next/next/no-img-element -- rendered to a PNG, not a page
          <img
            src={still}
            alt=""
            width={500}
            height={281}
            style={{
              objectFit: "cover",
              borderRadius: 24,
              border: "6px solid rgba(255,255,255,0.9)",
              boxShadow: "0 12px 40px rgba(60,60,120,0.18)",
            }}
          />
        ) : null}
      </div>
    ),
    size,
  );
}
