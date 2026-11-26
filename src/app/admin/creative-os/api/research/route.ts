import type { NextRequest } from "next/server";
import { z } from "zod";

import { EFFORTS } from "@/lib/creative-os/format";
import { guard } from "@/lib/creative-os/http";
import { expireStaleOperations, runOperation } from "@/lib/creative-os/operations";
import { getModelPrice, getSettings } from "@/lib/creative-os/pricing";
import { cleanOptions, prepareResearch, researchCallFor, saveResearch } from "@/lib/creative-os/research";

/*
 * Runs one research operation — product, Voice of Customer, audiences,
 * awareness, competitor discovery, a competitor profile or market patterns —
 * after the owner authorized it in the page's dialog. The body carries what
 * was authorized; the material, the caps and the worst case are worked out
 * again here, and the run is refused if that worst case is more than what
 * was shown.
 */

// Hobby plan: 300 seconds is the most a function may run.
export const maxDuration = 300;

const Body = z.object({
  module: z.string().regex(/^[a-z_]{3,40}$/),
  targetId: z.number().int().positive(),
  options: z.record(z.string(), z.string()).optional(),
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
  const { module: kind, targetId, model, effort, idempotencyKey, authorizedMaxUsd } = body.data;
  const options = cleanOptions(body.data.options);

  await expireStaleOperations();

  const [price, settings] = await Promise.all([getModelPrice(model), getSettings()]);
  if (!price || !price.enabled) return Response.json({ error: "That model is not enabled." }, { status: 400 });

  const ready = await prepareResearch(kind, targetId, options, price, settings.webSearchPer1k);
  if (!ready.ok) return Response.json({ error: ready.error }, { status: 400 });
  const { prepared } = ready;

  const outcome = await runOperation(
    {
      idempotencyKey,
      kind,
      projectId: prepared.researchModule.projectId(prepared.ctx),
      // The module is part of the target, so two different modules on one project can run side by side.
      targetType: kind,
      targetId,
      model,
      effort,
      authorizedMaxUsd,
      estimate: { low: prepared.estimate.low, high: prepared.estimate.high },
      params: {
        options,
        maxOutputTokens: prepared.estimate.maxOutputTokens,
        webSearches: prepared.estimate.webSearches,
        webFetches: prepared.estimate.webFetches,
        materials: prepared.materials,
      },
    },
    researchCallFor(prepared, model, effort),
    (message, operation) => saveResearch(prepared, message, operation),
    request.signal,
  );

  if (outcome.status === "completed") {
    const result = outcome.result as { added?: number; href?: string } | null;
    return Response.json({
      ok: true,
      costUsd: outcome.operation.costUsd,
      added: typeof result?.added === "number" ? result.added : null,
      href: typeof result?.href === "string" && result.href.startsWith("/admin/") ? result.href : null,
    });
  }
  if (outcome.status === "duplicate") {
    return Response.json({ ok: false, duplicate: true, status: outcome.operation.status, error: "Already run with this authorization." });
  }
  return Response.json({ ok: false, error: outcome.reason, costUsd: outcome.operation?.costUsd ?? null }, { status: 409 });
}
