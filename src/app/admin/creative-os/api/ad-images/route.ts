import { count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";

import { db } from "@/db";
import { cosAdImages, cosAds } from "@/db/creative-os";
import { guard } from "@/lib/creative-os/http";

/*
 * Screenshots attached to an ad, for the Ad Deconstruction Lab to see. Kept
 * small and few (they live in the database): up to 4 per ad, 1.5 MB each,
 * PNG, JPEG, WebP or GIF — the formats Claude reads. The file's own first
 * bytes are checked, not just the name it was given.
 */

const MAX_IMAGES = 4;
const MAX_BYTES = 1_500_000;

function sniff(bytes: Uint8Array): string | null {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "image/gif";
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45) {
    return "image/webp";
  }
  return null;
}

export async function POST(request: NextRequest) {
  const checked = await guard(request, { write: true });
  if (checked.error) return checked.error;

  const form = await request.formData().catch(() => null);
  const adId = Number(form?.get("adId"));
  if (!form || !Number.isInteger(adId) || adId <= 0) return Response.json({ error: "Invalid upload." }, { status: 400 });
  const [ad] = await db.select({ id: cosAds.id }).from(cosAds).where(eq(cosAds.id, adId)).limit(1);
  if (!ad) return Response.json({ error: "Unknown ad." }, { status: 404 });

  const files = form.getAll("files").filter((file): file is File => file instanceof File && file.size > 0);
  const [{ existing }] = await db.select({ existing: count() }).from(cosAdImages).where(eq(cosAdImages.adId, adId));
  if (existing + files.length > MAX_IMAGES) {
    return Response.json({ error: `Up to ${MAX_IMAGES} screenshots per ad.` }, { status: 400 });
  }

  const rows = [];
  for (const file of files) {
    if (file.size > MAX_BYTES) return Response.json({ error: `${file.name} is over 1.5 MB.` }, { status: 400 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mediaType = sniff(bytes);
    if (!mediaType) return Response.json({ error: `${file.name} is not a PNG, JPEG, WebP or GIF image.` }, { status: 400 });
    rows.push({ adId, mediaType, size: bytes.byteLength, bytes: Buffer.from(bytes) });
  }
  if (rows.length > 0) await db.insert(cosAdImages).values(rows);
  revalidatePath("/admin/creative-os", "layout");
  return Response.json({ ok: true, added: rows.length });
}
