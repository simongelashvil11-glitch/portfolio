import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { getProfile } from "@/lib/queries";
import { siteUrl } from "@/lib/site-url";

/*
 * The picture shown when a link to the site is shared (LinkedIn, Messenger,
 * WhatsApp, X…): the name, role and headline from the profile beside the
 * portrait, on the sidebar's gradient. Built at deploy time from the same
 * profile row the homepage reads, so editing the profile and redeploying
 * updates it. Pages with their own picture (a project's cover) override it.
 */

export const alt = "Simon Gelashvili — portfolio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The portrait as something the renderer can draw: a data URL for files in /public, else the URL itself. */
async function portraitSource(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (!url.startsWith("/")) return null;
  try {
    const file = await readFile(join(process.cwd(), "public", url));
    const type = url.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
    return `data:${type};base64,${file.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function OpenGraphImage() {
  const profile = await getProfile();
  const name = profile?.name?.trim() || "Simon Gelashvili";
  const role = profile?.role?.trim() || "";
  const headline = profile?.headline?.trim() || "";
  const portrait = await portraitSource(profile?.portraitUrl);
  const host = new URL(siteUrl).host;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 64,
          padding: "0 80px",
          color: "#242424",
          backgroundColor: "#eef2ff",
          backgroundImage:
            // Each glow fades to its own colour at zero alpha: plain `transparent`
            // is transparent black, and the renderer blends towards grey.
            "radial-gradient(circle at 18% 85%, rgba(243,208,247,0.9), rgba(243,208,247,0) 45%), radial-gradient(circle at 85% 15%, rgba(219,233,254,1), rgba(219,233,254,0) 50%), linear-gradient(180deg, #ecf0ff 0%, #eef2ff 45%, #f7effc 100%)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", width: 56, height: 6, borderRadius: 3, backgroundColor: "#7f85f5" }} />
          <div style={{ display: "flex", marginTop: 28, fontSize: 72, fontWeight: 700, lineHeight: 1.05 }}>
            {name}
          </div>
          {role ? (
            <div style={{ display: "flex", marginTop: 18, fontSize: 34, color: "#0f6cbd" }}>{role}</div>
          ) : null}
          {headline ? (
            <div style={{ display: "flex", marginTop: 22, fontSize: 30, lineHeight: 1.35, color: "#424242" }}>
              {headline}
            </div>
          ) : null}
          <div style={{ display: "flex", marginTop: 44, fontSize: 24, color: "#616161" }}>{host}</div>
        </div>
        {portrait ? (
          // eslint-disable-next-line @next/next/no-img-element -- rendered to a PNG, not a page
          <img
            src={portrait}
            alt=""
            width={360}
            height={450}
            style={{
              objectFit: "cover",
              borderRadius: 28,
              border: "6px solid rgba(255,255,255,0.85)",
              boxShadow: "0 12px 40px rgba(60,60,120,0.18)",
            }}
          />
        ) : null}
      </div>
    ),
    size,
  );
}
