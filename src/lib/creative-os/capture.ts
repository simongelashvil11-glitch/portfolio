import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { and, count, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { cosAdImages, cosAds, cosAuditLog, cosCompetitors, cosProjects, cosSettings } from "@/db/creative-os";

import { ensureDefaults } from "./pricing";

/*
 * Ads saved from the Meta Ad Library by the owner's Chrome extension.
 *
 * The extension cannot use the admin's login cookie, so it carries a
 * connection code made in Settings. Only the code's SHA-256 is stored; the
 * code is shown once. Anyone without it gets a 401, and revoking it in
 * Settings cuts the extension off at once.
 *
 * The extension only reads what the owner is looking at, when they press
 * Save; nothing here fetches anything from Meta. Saving the same ad again
 * (same Library ID in the same project) updates it instead of duplicating it.
 */

const hash = (code: string) => createHash("sha256").update(code).digest("hex");

/** A new connection code; replaces any earlier one. Returned once, stored only as a hash. */
export async function createCaptureToken(): Promise<string> {
  await ensureDefaults();
  const code = `cos_${randomBytes(24).toString("base64url")}`;
  await db
    .update(cosSettings)
    .set({ captureTokenHash: hash(code), captureTokenCreatedAt: new Date(), captureTokenUsedAt: null, updatedAt: new Date() })
    .where(eq(cosSettings.id, 1));
  return code;
}

export async function revokeCaptureToken() {
  await db.update(cosSettings).set({ captureTokenHash: null, captureTokenCreatedAt: null, captureTokenUsedAt: null }).where(eq(cosSettings.id, 1));
}

/** Whether a request carries the current connection code. */
export async function verifyCaptureRequest(request: Request): Promise<boolean> {
  const header = request.headers.get("authorization") ?? "";
  const code = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!code || code.length > 200) return false;
  const [row] = await db.select({ stored: cosSettings.captureTokenHash }).from(cosSettings).where(eq(cosSettings.id, 1)).limit(1);
  if (!row?.stored) return false;
  const given = Buffer.from(hash(code), "hex");
  const stored = Buffer.from(row.stored, "hex");
  if (given.length !== stored.length || !timingSafeEqual(given, stored)) return false;
  await db.update(cosSettings).set({ captureTokenUsedAt: new Date() }).where(eq(cosSettings.id, 1));
  return true;
}

/** Projects and their tracked competitors, for the extension's pickers. */
export async function captureTargets() {
  const [projects, competitors] = await Promise.all([
    db.select({ id: cosProjects.id, name: cosProjects.name }).from(cosProjects).where(eq(cosProjects.status, "active")).orderBy(cosProjects.name),
    db
      .select({ id: cosCompetitors.id, name: cosCompetitors.name, projectId: cosCompetitors.projectId })
      .from(cosCompetitors)
      .where(eq(cosCompetitors.status, "tracked"))
      .orderBy(cosCompetitors.name),
  ]);
  return projects.map((project) => ({
    ...project,
    competitors: competitors.filter((item) => item.projectId === project.id).map(({ id, name }) => ({ id, name })),
  }));
}

/* ------------------------------------------------------------------ */
/* Saving an ad                                                        */
/* ------------------------------------------------------------------ */

const optionalText = (max: number) =>
  z
    .string()
    .max(max * 2)
    .transform((value) => value.trim().slice(0, max))
    .nullish();

export const CapturedAd = z.object({
  projectId: z.number().int().positive(),
  competitorId: z.number().int().positive().nullish(),
  ad: z.object({
    libraryId: z.string().regex(/^\d{5,30}$/),
    libraryUrl: z.url().max(1000).nullish(),
    advertiser: optionalText(200),
    body: optionalText(20_000),
    headline: optionalText(500),
    description: optionalText(1000),
    cta: optionalText(60),
    landingUrl: z.url().max(1000).nullish().catch(null),
    /** As the Ad Library writes it: "Started running on Jan 5, 2026", or a date range for inactive ads. */
    startedText: optionalText(120),
    active: z.boolean().nullish(),
    variations: z.number().int().min(1).max(10_000).nullish(),
    mediaKind: z.enum(["image", "video", "carousel", "text"]).nullish(),
    platforms: z.array(z.string().max(40)).max(10).nullish(),
    /** The whole card's visible text, kept when the body could not be told apart. */
    cardText: optionalText(20_000),
    image: z
      .object({ base64: z.string().max(2_200_000), mediaType: z.string().max(40) })
      .nullish(),
  }),
});
export type CapturedAdInput = z.infer<typeof CapturedAd>;

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** "Started running on Jan 5, 2026" (or "5 Jan 2026") → "2026-01-05"; null if no date is found. */
export function parseStarted(text: string | null | undefined): string | null {
  return text ? parseDate(text) : null;
}

/** The second date of a range ("Jan 1, 2026 - Feb 3, 2026"): when a stopped ad last ran. */
export function parseStopped(text: string | null | undefined): string | null {
  const parts = text?.split(/\s[-–]\s/);
  return parts && parts.length >= 2 ? parseDate(parts.slice(1).join(" ")) : null;
}

function parseDate(text: string): string | null {
  const monthFirst = /([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})/.exec(text);
  const dayFirst = /(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})/.exec(text);
  const parts = monthFirst
    ? { month: monthFirst[1], day: monthFirst[2], year: monthFirst[3] }
    : dayFirst
      ? { month: dayFirst[2], day: dayFirst[1], year: dayFirst[3] }
      : null;
  if (!parts) return null;
  const month = MONTHS.indexOf(parts.month.slice(0, 3).toLowerCase());
  const day = Number(parts.day);
  const year = Number(parts.year);
  if (month < 0 || day < 1 || day > 31 || year < 2000 || year > 2100) return null;
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function sniff(bytes: Uint8Array): string | null {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "image/gif";
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45) {
    return "image/webp";
  }
  return null;
}

const MAX_IMAGE_BYTES = 1_500_000;

/** The card's text without the Ad Library's own labels, for when the ad text could not be picked out. */
function cleanCardText(ad: CapturedAdInput["ad"]): string | null {
  if (!ad.cardText) return null;
  const advertiser = ad.advertiser?.toLowerCase();
  const kept = ad.cardText
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        line.toLowerCase() !== advertiser &&
        !/^(Library ID|Started running on|Total active time|Platforms|Sponsored$|Active$|Inactive$|See (ad|summary) details|This ad has multiple versions|Open Dropdown)/i.test(line) &&
        !/ads?\s+uses?\s+this\s+creative\s+and\s+text/i.test(line) &&
        !/^[A-Z][a-z]{2,8}\s+\d{1,2},\s+\d{4}\s*[-–]/.test(line),
    );
  return kept.length ? kept.join("\n") : null;
}

/** The words the Ad Lab analyses: the ad text, then its link card, labelled. */
function composeCopy(ad: CapturedAdInput["ad"]): string | null {
  const parts = [
    ad.body ? ad.body : null,
    ad.headline ? `Headline: ${ad.headline}` : null,
    ad.description ? `Description: ${ad.description}` : null,
    ad.cta ? `Call to action: ${ad.cta}` : null,
  ].filter(Boolean);
  if (parts.length) return parts.join("\n\n");
  return cleanCardText(ad);
}

export async function saveCapturedAd(input: CapturedAdInput) {
  const { ad } = input;
  const [project] = await db.select({ id: cosProjects.id }).from(cosProjects).where(eq(cosProjects.id, input.projectId)).limit(1);
  if (!project) return { ok: false as const, status: 404, error: "That project no longer exists." };

  // The competitor chosen in the extension, or one in the project whose name matches the advertiser.
  let competitorId: number | null = null;
  if (input.competitorId) {
    const [competitor] = await db
      .select({ id: cosCompetitors.id })
      .from(cosCompetitors)
      .where(and(eq(cosCompetitors.id, input.competitorId), eq(cosCompetitors.projectId, project.id)))
      .limit(1);
    if (!competitor) return { ok: false as const, status: 404, error: "That competitor is not in this project." };
    competitorId = competitor.id;
  } else if (ad.advertiser) {
    const [match] = await db
      .select({ id: cosCompetitors.id })
      .from(cosCompetitors)
      .where(and(eq(cosCompetitors.projectId, project.id), sql`lower(${cosCompetitors.name}) = lower(${ad.advertiser})`))
      .limit(1);
    competitorId = match?.id ?? null;
  }

  const [existing] = await db
    .select({ id: cosAds.id, competitorId: cosAds.competitorId, headline: cosAds.headline, cta: cosAds.cta, adCopy: cosAds.adCopy })
    .from(cosAds)
    .where(and(eq(cosAds.projectId, project.id), eq(cosAds.libraryId, ad.libraryId)))
    .limit(1);

  // A re-save that could not read the ad's text keeps the copy already saved; one that missed the
  // headline or button fills them from what was saved before.
  const adCopy =
    existing && !ad.body && existing.adCopy
      ? existing.adCopy
      : composeCopy({ ...ad, headline: ad.headline ?? existing?.headline ?? null, cta: ad.cta ?? existing?.cta ?? null });
  const captured = {
    advertiser: ad.advertiser ?? null,
    platform: "Meta",
    sourceUrl: ad.libraryUrl ?? `https://www.facebook.com/ads/library/?id=${ad.libraryId}`,
    adCopy,
    headline: ad.headline ?? null,
    cta: ad.cta ?? null,
    landingUrl: ad.landingUrl ?? null,
    startedRunning: parseStarted(ad.startedText),
    stoppedRunning: ad.active === false ? parseStopped(ad.startedText) : null,
    stillActive: ad.active ?? null,
    variations: ad.variations ?? null,
    mediaKind: ad.mediaKind ?? null,
    lastSeenAt: new Date(),
    source: "extension",
    updatedAt: new Date(),
  };
  const titleText = (ad.headline || ad.body || cleanCardText(ad) || "").replace(/\s+/g, " ").trim().slice(0, 70);
  const title = `${ad.advertiser || "Meta ad"}${titleText ? ` — ${titleText}` : ""}`.slice(0, 300);

  let adId: number;
  if (existing) {
    // Refresh what the Ad Library shows, but never blank out a detail this capture could not read;
    // your title, transcript, notes and tags stay as you left them.
    const refreshed = Object.fromEntries(Object.entries(captured).filter(([, value]) => value !== null && value !== undefined));
    await db
      .update(cosAds)
      .set({ ...refreshed, competitorId: competitorId ?? existing.competitorId })
      .where(eq(cosAds.id, existing.id));
    adId = existing.id;
  } else {
    const [created] = await db
      .insert(cosAds)
      .values({
        ...captured,
        projectId: project.id,
        competitorId,
        libraryId: ad.libraryId,
        title,
        notes:
          ad.mediaKind === "video"
            ? "Video ad saved from the Ad Library. Paste what is said into the transcript so the analysis can read it."
            : null,
        tags: ["Ad Library"],
      })
      .returning({ id: cosAds.id });
    adId = created.id;
  }

  // The image (or a video's first frame), when the ad has none yet.
  let imageSaved = false;
  if (ad.image?.base64) {
    const bytes = Buffer.from(ad.image.base64, "base64");
    const type = sniff(bytes);
    const [{ images }] = await db.select({ images: count() }).from(cosAdImages).where(eq(cosAdImages.adId, adId));
    if (type && bytes.byteLength <= MAX_IMAGE_BYTES && images === 0) {
      await db.insert(cosAdImages).values({ adId, mediaType: type, size: bytes.byteLength, bytes });
      imageSaved = true;
    }
  }

  await db.insert(cosAuditLog).values({
    action: existing ? "ad_recaptured" : "ad_captured",
    entity: "ad",
    entityId: adId,
    detail: { libraryId: ad.libraryId, projectId: project.id },
  });
  return { ok: true as const, adId, projectId: project.id, created: !existing, imageSaved };
}
