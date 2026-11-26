import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { db } from "@/db";
import { cosAdImages } from "@/db/creative-os";
import { guard } from "@/lib/creative-os/http";

/** Serves one ad screenshot to the signed-in owner, never cached publicly. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const checked = await guard(request, { write: false, limit: 120 });
  if (checked.error) return checked.error;
  const imageId = Number((await params).id);
  if (!Number.isInteger(imageId) || imageId <= 0) return new Response("Not found", { status: 404 });
  const [image] = await db.select().from(cosAdImages).where(eq(cosAdImages.id, imageId)).limit(1);
  if (!image) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(image.bytes), {
    headers: {
      "Content-Type": image.mediaType,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
