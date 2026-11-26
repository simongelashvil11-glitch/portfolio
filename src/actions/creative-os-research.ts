"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import {
  cosAudienceSegments,
  cosAuditLog,
  cosAwarenessAnalyses,
  cosCompetitors,
  cosCustomerInsights,
} from "@/db/creative-os";
import { requireSession } from "@/lib/auth";
import { checkBudget } from "@/lib/creative-os/budget";
import { AWARENESS_STAGES, SOPHISTICATION_LEVELS } from "@/lib/creative-os/elements";
import { getModelPrice, getSettings } from "@/lib/creative-os/pricing";
import { cleanOptions, prepareResearch } from "@/lib/creative-os/research";
import { CONFIDENCE, EVIDENCE_STRENGTH, VOC_CATEGORIES } from "@/lib/creative-os/research-labels";
import type { StoredStage } from "@/lib/creative-os/research/strategy";

import type { FormState, Preview } from "./creative-os";

/*
 * Phase 2's server actions: the cost preview for research runs, and every
 * hand edit to what research produced — bookmarking and adding customer
 * insights, editing segments and awareness, managing competitors. None of
 * them calls the Claude API; paid runs go through /admin/creative-os/api/research.
 */

const text = (value: FormDataEntryValue | null) => (typeof value === "string" ? value.trim() : "");
const nullable = (value: FormDataEntryValue | null) => text(value) || null;
const lines = (value: FormDataEntryValue | null) =>
  text(value)
    .split("\n")
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 40);
const id = (value: FormDataEntryValue | null) => {
  const parsed = Number(text(value));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};
const optionalUrl = z.url("Enter a full address, starting with https://").max(1000).nullable();

function failure(error: z.ZodError): FormState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
  return { error: "Please fix the highlighted fields.", fieldErrors };
}

function refresh() {
  revalidatePath("/admin/creative-os", "layout");
}

async function log(action: string, entity: string, entityId: number | null, detail?: Record<string, unknown>) {
  await db.insert(cosAuditLog).values({ action, entity, entityId, detail: detail ?? null });
}

/* ------------------------------------------------------------------ */
/* Cost preview                                                        */
/* ------------------------------------------------------------------ */

/** What a research run would send and cost, worked out locally. Never calls Claude. */
export async function previewResearch(kind: string, targetId: number, model: string, options?: Record<string, string>): Promise<Preview> {
  await requireSession();
  const [price, settings] = await Promise.all([getModelPrice(model), getSettings()]);
  if (!price || !price.enabled) return { ok: false, error: "Choose an enabled model." };
  const ready = await prepareResearch(kind, targetId, cleanOptions(options ?? {}), price, settings.webSearchPer1k);
  if (!ready.ok) return { ok: false, error: ready.error };
  const { estimate, materials } = ready.prepared;
  const budget = await checkBudget(estimate.high);
  return {
    ok: true,
    model,
    modelLabel: price.label,
    low: estimate.low,
    high: estimate.high,
    inputTokens: estimate.inputTokens,
    maxOutputTokens: estimate.maxOutputTokens,
    webSearches: estimate.webSearches,
    webFetches: estimate.webFetches,
    materials,
    budget: {
      allowed: budget.ok,
      reason: budget.ok ? null : budget.reason,
      spent: budget.spent,
      monthlyLimit: budget.monthlyLimit,
      perOperationLimit: budget.perOperationLimit,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Voice of Customer                                                   */
/* ------------------------------------------------------------------ */

const InsightSchema = z.object({
  category: z.enum(VOC_CATEGORIES),
  statement: z.string().min(1, "What did the customer say?").max(4000),
  isQuote: z.boolean(),
  interpretation: z.string().max(4000).nullable(),
  sourceUrl: optionalUrl,
  subject: z.string().max(200).nullable(),
  confidence: z.enum(CONFIDENCE),
  evidenceStrength: z.enum(EVIDENCE_STRENGTH),
  notes: z.string().max(4000).nullable(),
});

export async function addInsight(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const projectId = id(formData.get("projectId"));
  if (!projectId) return { error: "Unknown project." };
  const parsed = InsightSchema.safeParse({
    category: text(formData.get("category")),
    statement: text(formData.get("statement")),
    isQuote: formData.get("isQuote") === "on",
    interpretation: nullable(formData.get("interpretation")),
    sourceUrl: nullable(formData.get("sourceUrl")),
    subject: nullable(formData.get("subject")),
    confidence: text(formData.get("confidence")) || "medium",
    evidenceStrength: text(formData.get("evidenceStrength")) || "moderate",
    notes: nullable(formData.get("notes")),
  });
  if (!parsed.success) return failure(parsed.error);
  const [insight] = await db.insert(cosCustomerInsights).values({ ...parsed.data, projectId, quoteCheck: "manual" }).returning();
  await log("created", "customer_insight", insight.id);
  refresh();
  return { success: "Insight added." };
}

export async function toggleInsightBookmark(formData: FormData) {
  await requireSession();
  const insightId = id(formData.get("id"));
  if (!insightId) return;
  await db
    .update(cosCustomerInsights)
    .set({ bookmarked: text(formData.get("bookmarked")) === "true", updatedAt: new Date() })
    .where(eq(cosCustomerInsights.id, insightId));
  refresh();
}

export async function deleteInsight(formData: FormData) {
  await requireSession();
  const insightId = id(formData.get("id"));
  if (!insightId) return;
  await db.delete(cosCustomerInsights).where(eq(cosCustomerInsights.id, insightId));
  await log("deleted", "customer_insight", insightId);
  refresh();
}

/* ------------------------------------------------------------------ */
/* Audience segments                                                   */
/* ------------------------------------------------------------------ */

const SegmentSchema = z.object({
  personaName: z.string().min(1, "Name the segment.").max(160),
  situation: z.string().max(4000),
  primaryProblem: z.string().max(4000),
  desiredTransformation: z.string().max(4000),
  awarenessStage: z.enum(AWARENESS_STAGES),
  evidenceNote: z.string().max(4000).nullable(),
});

const SEGMENT_LISTS = [
  "secondaryProblems",
  "emotionalMotivations",
  "objections",
  "beliefs",
  "previousSolutions",
  "buyingTriggers",
  "relevantBenefits",
  "recommendedMessaging",
  "recommendedFormats",
] as const;

export async function saveSegment(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const projectId = id(formData.get("projectId"));
  if (!projectId) return { error: "Unknown project." };
  const segmentId = id(formData.get("id"));
  const parsed = SegmentSchema.safeParse({
    personaName: text(formData.get("personaName")),
    situation: text(formData.get("situation")),
    primaryProblem: text(formData.get("primaryProblem")),
    desiredTransformation: text(formData.get("desiredTransformation")),
    awarenessStage: text(formData.get("awarenessStage")) || "unclear",
    evidenceNote: nullable(formData.get("evidenceNote")),
  });
  if (!parsed.success) return failure(parsed.error);
  const listValues = Object.fromEntries(SEGMENT_LISTS.map((key) => [key, lines(formData.get(key))])) as Record<
    (typeof SEGMENT_LISTS)[number],
    string[]
  >;
  if (segmentId) {
    await db
      .update(cosAudienceSegments)
      .set({ ...parsed.data, ...listValues, edited: true, updatedAt: new Date() })
      .where(and(eq(cosAudienceSegments.id, segmentId), eq(cosAudienceSegments.projectId, projectId)));
  } else {
    await db.insert(cosAudienceSegments).values({ ...parsed.data, ...listValues, projectId, edited: true, position: 99 });
    refresh();
    redirect(`/admin/creative-os/p/${projectId}/audiences`);
  }
  refresh();
  return { success: "Segment saved." };
}

export async function deleteSegment(formData: FormData) {
  await requireSession();
  const segmentId = id(formData.get("id"));
  if (!segmentId) return;
  await db.delete(cosAudienceSegments).where(eq(cosAudienceSegments.id, segmentId));
  refresh();
}

/** Marks one segment as the one to develop concepts for; the others are unmarked. */
export async function setSegmentFocus(formData: FormData) {
  await requireSession();
  const segmentId = id(formData.get("id"));
  const projectId = id(formData.get("projectId"));
  if (!segmentId || !projectId) return;
  const focus = text(formData.get("focus")) === "true";
  if (focus) {
    await db.update(cosAudienceSegments).set({ focus: false }).where(eq(cosAudienceSegments.projectId, projectId));
  }
  await db
    .update(cosAudienceSegments)
    .set({ focus })
    .where(and(eq(cosAudienceSegments.id, segmentId), eq(cosAudienceSegments.projectId, projectId)));
  refresh();
}

/* ------------------------------------------------------------------ */
/* Awareness                                                           */
/* ------------------------------------------------------------------ */

export async function saveAwareness(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const analysisId = id(formData.get("id"));
  if (!analysisId) return { error: "Unknown analysis." };
  const [current] = await db.select().from(cosAwarenessAnalyses).where(eq(cosAwarenessAnalyses.id, analysisId)).limit(1);
  if (!current) return { error: "That analysis no longer exists." };

  const dominantStage = text(formData.get("dominantStage"));
  const sophisticationLevel = text(formData.get("sophisticationLevel"));
  if (!(AWARENESS_STAGES as readonly string[]).includes(dominantStage)) return { error: "Choose an awareness stage." };
  if (!(SOPHISTICATION_LEVELS as readonly string[]).includes(sophisticationLevel)) return { error: "Choose a sophistication level." };

  const stages = (current.stages as StoredStage[]).map((stage) => {
    const field = (name: string) => text(formData.get(`${stage.stage}.${name}`)).slice(0, 4000);
    return {
      stage: stage.stage,
      customerKnowledge: field("customerKnowledge"),
      existingBeliefs: field("existingBeliefs"),
      mainBarrier: field("mainBarrier"),
      messaging: field("messaging"),
      hookStyles: lines(formData.get(`${stage.stage}.hookStyles`)),
      adStructure: field("adStructure"),
      proof: field("proof"),
      cta: field("cta"),
    } satisfies StoredStage;
  });

  await db
    .update(cosAwarenessAnalyses)
    .set({
      dominantStage,
      sophisticationLevel,
      dominantReasoning: text(formData.get("dominantReasoning")).slice(0, 4000),
      sophisticationReasoning: text(formData.get("sophisticationReasoning")).slice(0, 4000),
      stages,
      edited: true,
      updatedAt: new Date(),
    })
    .where(eq(cosAwarenessAnalyses.id, analysisId));
  await log("adjusted", "awareness_analysis", analysisId);
  refresh();
  return { success: "Saved. Marked as adjusted by you." };
}

/* ------------------------------------------------------------------ */
/* Competitors                                                         */
/* ------------------------------------------------------------------ */

const CompetitorSchema = z.object({
  name: z.string().min(1, "Name the competitor.").max(200),
  website: optionalUrl,
  facebookUrl: optionalUrl,
  instagramUrl: optionalUrl,
  tiktokUrl: optionalUrl,
  kind: z.enum(["direct", "indirect", "alternative"]),
  notes: z.string().max(10000).nullable(),
});

export async function saveCompetitor(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const projectId = id(formData.get("projectId"));
  if (!projectId) return { error: "Unknown project." };
  const competitorId = id(formData.get("id"));
  const parsed = CompetitorSchema.safeParse({
    name: text(formData.get("name")),
    website: nullable(formData.get("website")),
    facebookUrl: nullable(formData.get("facebookUrl")),
    instagramUrl: nullable(formData.get("instagramUrl")),
    tiktokUrl: nullable(formData.get("tiktokUrl")),
    kind: text(formData.get("kind")) || "direct",
    notes: nullable(formData.get("notes")),
  });
  if (!parsed.success) return failure(parsed.error);
  if (competitorId) {
    await db
      .update(cosCompetitors)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(cosCompetitors.id, competitorId), eq(cosCompetitors.projectId, projectId)));
  } else {
    const [competitor] = await db.insert(cosCompetitors).values({ ...parsed.data, projectId, status: "tracked" }).returning();
    await log("created", "competitor", competitor.id);
  }
  refresh();
  return { success: competitorId ? "Competitor saved." : "Competitor added." };
}

export async function setCompetitorStatus(formData: FormData) {
  await requireSession();
  const competitorId = id(formData.get("id"));
  const status = text(formData.get("status"));
  if (!competitorId || !["tracked", "suggested", "dismissed"].includes(status)) return;
  await db.update(cosCompetitors).set({ status, updatedAt: new Date() }).where(eq(cosCompetitors.id, competitorId));
  refresh();
}

export async function deleteCompetitor(formData: FormData) {
  await requireSession();
  const competitorId = id(formData.get("id"));
  if (!competitorId) return;
  await db.delete(cosCompetitors).where(eq(cosCompetitors.id, competitorId));
  await log("deleted", "competitor", competitorId);
  refresh();
}
