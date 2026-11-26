import { asc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { cosAdImages, cosAds } from "@/db/creative-os";
import { callFor, estimateFor, materialsFor, MAX_OUTPUT_TOKENS, saveAnalysis } from "@/lib/creative-os/deconstruct";
import { EFFORTS } from "@/lib/creative-os/format";
import { guard } from "@/lib/creative-os/http";
import { expireStaleOperations, runOperation } from "@/lib/creative-os/operations";
import { getModelPrice } from "@/lib/creative-os/pricing";

/*
 * Runs one Ad Deconstruction, after the owner authorized it in the page's
 * dialog. The body carries what was authorized: the ad, the model and effort
 * chosen, the worst-case cost shown, and an idempotency key made when the
 * Authorize button was pressed. Everything else is recomputed here.
 */

// Hobby plan: 300 seconds is the most a function may run.
export const maxDuration = 300;

const Body = z.object({
  adId: z.number().int().positive(),
  model: z.string().min(1).max(64),
  effort: z.enum(EFFORTS),
  idempotencyKey: z.string().regex(/^[a-zA-Z0-9-]{16,64}$/),
  authorizedMaxUsd: z.number().positive().max(1000),
});

export async function POST(request: NextRequest) {
  const checked = await guard(request, { write: true, limit: 10 });
  if (checked.error) return checked.error;

  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Invalid request." }, { status: 400 });
  const { adId, model, effort, idempotencyKey, authorizedMaxUsd } = body.data;

  await expireStaleOperations();

  const [ad] = await db.select().from(cosAds).where(eq(cosAds.id, adId)).limit(1);
  if (!ad) return Response.json({ error: "That ad no longer exists." }, { status: 404 });
  if (!ad.transcript && !ad.adCopy) return Response.json({ error: "Add the transcript or copy first." }, { status: 400 });
  const price = await getModelPrice(model);
  if (!price || !price.enabled) return Response.json({ error: "That model is not enabled." }, { status: 400 });

  const images = await db
    .select({ mediaType: cosAdImages.mediaType, bytes: cosAdImages.bytes })
    .from(cosAdImages)
    .where(eq(cosAdImages.adId, adId))
    .orderBy(asc(cosAdImages.id));
  const estimate = estimateFor(ad, images.length, price);

  const outcome = await runOperation(
    {
      idempotencyKey,
      kind: "ad_deconstruction",
      projectId: ad.projectId,
      targetType: "ad",
      targetId: ad.id,
      model,
      effort,
      authorizedMaxUsd,
      estimate: { low: estimate.low, high: estimate.high },
      params: { maxOutputTokens: MAX_OUTPUT_TOKENS, webSearches: 0, materials: materialsFor(ad, images.length) },
    },
    callFor(ad, images, model, effort),
    (message, operation) => saveAnalysis(ad, message, operation),
    request.signal,
  );

  if (outcome.status === "completed") {
    return Response.json({ ok: true, analysisId: outcome.result.id, costUsd: outcome.operation.costUsd });
  }
  if (outcome.status === "duplicate") {
    return Response.json({ ok: false, duplicate: true, status: outcome.operation.status, error: "Already run with this authorization." });
  }
  return Response.json({ ok: false, error: outcome.reason, costUsd: outcome.operation?.costUsd ?? null }, { status: 409 });
}
