import "server-only";

import { randomUUID } from "node:crypto";

import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { cosAiOperations, cosAuditLog } from "@/db/creative-os";

import { prepareResearch } from "./index";
import type { ModuleOptions } from "./module";

/*
 * "Use my Claude subscription": the owner runs a writing or strategy step in
 * claude.ai instead of through the API. CreativeOS builds exactly the prompt
 * the API run would send, plus the answer format; the owner pastes it into
 * claude.ai and pastes the answer back. The answer is checked against the
 * same schema and saved by the same code as a paid run, and recorded in the
 * ledger at $0 as made "via your Claude subscription".
 *
 * Only for steps without web research: those depend on the server seeing
 * which pages a call actually read, which a pasted answer cannot prove.
 */

export const MANUAL_MODEL = "claude-subscription";
const NO_PRICE = { inputPerMtok: 0, outputPerMtok: 0 };

export type ManualPrompt = { ok: true; prompt: string; materials: { label: string; chars: number }[] } | { ok: false; error: string };

export async function buildManualPrompt(kind: string, targetId: number, options: ModuleOptions): Promise<ManualPrompt> {
  const ready = await prepareResearch(kind, targetId, options, NO_PRICE, 0);
  if (!ready.ok) return ready;
  const { researchModule, ctx, depth, materials } = ready.prepared;
  if (depth) return { ok: false, error: "This step uses web research, which only works through the API." };
  const schema = JSON.stringify(zodOutputFormat(researchModule.schema).schema);
  const prompt = [
    researchModule.system,
    "---",
    researchModule.user(ctx),
    "---",
    `Answer format: reply with one JSON object and nothing else (no introduction, no notes after it). It must match this JSON Schema exactly: every listed field present, the exact allowed values where the schema lists them, numbers as numbers.\n${schema}`,
  ].join("\n\n");
  return { ok: true, prompt, materials };
}

/** The JSON object in a pasted answer: a ```json block if there is one, else from the first { to the last }. */
function extractJson(raw: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw);
  const text = fenced ? fenced[1] : raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  if (!text.trim()) throw new Error("No JSON object was found in what you pasted. Copy Claude's whole answer.");
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("What you pasted is not complete JSON. Copy Claude's whole answer (the copy button under the reply), not part of it.");
  }
}

export type ManualImport = { ok: true; added: number | null; href: string | null } | { ok: false; error: string };

export async function importManualAnswer(kind: string, targetId: number, options: ModuleOptions, pasted: string): Promise<ManualImport> {
  if (pasted.length > 400_000) return { ok: false, error: "That is too long to be one answer." };
  const ready = await prepareResearch(kind, targetId, options, NO_PRICE, 0);
  if (!ready.ok) return ready;
  const { researchModule, ctx, depth } = ready.prepared;
  if (depth) return { ok: false, error: "This step uses web research, which only works through the API." };

  let raw: unknown;
  try {
    raw = extractJson(pasted);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
  const parsed = researchModule.schema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: `The answer is not in the expected format (${issue?.path.join(".") || "top level"}: ${issue?.message ?? "invalid"}). Ask Claude in the same chat: “Reply again with only the JSON, matching the schema exactly.” Then paste that.`,
    };
  }

  const [operation] = await db
    .insert(cosAiOperations)
    .values({
      idempotencyKey: `manual-${randomUUID()}`,
      kind,
      projectId: researchModule.projectId(ctx),
      targetType: kind,
      targetId,
      model: MANUAL_MODEL,
      params: { options, manual: true },
      status: "running",
      estimateLowUsd: 0,
      estimateHighUsd: 0,
      costUsd: 0,
      startedAt: new Date(),
    })
    .returning();
  try {
    const result = (await researchModule.save({ ctx, output: parsed.data, evidence: null, sourceIds: new Map(), operation })) as {
      added?: number;
      href?: string;
    } | null;
    await db
      .update(cosAiOperations)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(cosAiOperations.id, operation.id));
    await db.insert(cosAuditLog).values({ action: "imported", entity: "ai_operation", entityId: operation.id, detail: { kind, manual: true } });
    return { ok: true, added: typeof result?.added === "number" ? result.added : null, href: typeof result?.href === "string" ? result.href : null };
  } catch (error) {
    await db
      .update(cosAiOperations)
      .set({ status: "failed", error: (error as Error).message, completedAt: new Date() })
      .where(eq(cosAiOperations.id, operation.id));
    return { ok: false, error: (error as Error).message || "The answer could not be saved." };
  }
}
