"use server";

import { and, desc, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import {
  cosAdAnalyses,
  cosAds,
  cosAngles,
  cosAuditLog,
  cosBriefs,
  cosImagePlans,
  cosProducts,
  cosVideoPlans,
  cosHooks,
  cosScripts,
  cosScriptVersions,
  type ScriptSection,
} from "@/db/creative-os";
import { requireSession } from "@/lib/auth";
import {
  ANGLE_CATEGORIES,
  ANGLE_STATUSES,
  COPY_KINDS,
  COPY_KIND_KEYS,
  FRAMEWORKS,
  HOOK_CATEGORIES,
  HOOK_STATUSES,
  type CopyKind,
} from "@/lib/creative-os/creative-labels";
import { AWARENESS_STAGES } from "@/lib/creative-os/elements";

import type { FormState } from "./creative-os";

/*
 * The writing tools' free actions: saving, editing, approving, bookmarking,
 * versioning. None calls the Claude API — generation and rewrites go
 * through /admin/creative-os/api/research after the owner authorizes them.
 */

const text = (value: FormDataEntryValue | null) => (typeof value === "string" ? value.trim() : "");
const nullable = (value: FormDataEntryValue | null) => text(value) || null;
const lines = (value: FormDataEntryValue | null) =>
  text(value)
    .split("\n")
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 30);
const id = (value: FormDataEntryValue | null) => {
  const parsed = Number(text(value));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

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
/* Angles                                                              */
/* ------------------------------------------------------------------ */

const AngleSchema = z.object({
  name: z.string().min(1, "Name the angle.").max(200),
  category: z.enum(ANGLE_CATEGORIES),
  hypothesis: z.string().min(1, "Say why it should work.").max(4000),
  audience: z.string().max(2000).nullable(),
  awarenessStage: z.enum(AWARENESS_STAGES),
  painPoint: z.string().max(2000).nullable(),
  desire: z.string().max(2000).nullable(),
  motivation: z.string().max(2000).nullable(),
  coreMessage: z.string().min(1, "Write the core message.").max(2000),
  productBenefit: z.string().max(2000).nullable(),
  customerEvidence: z.string().max(4000).nullable(),
  recommendedFormat: z.string().max(500).nullable(),
  proofRequirements: z.string().max(2000).nullable(),
  weaknesses: z.string().max(2000).nullable(),
  testingRecommendation: z.string().max(2000).nullable(),
  notes: z.string().max(4000).nullable(),
});

export async function saveAngle(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const projectId = id(formData.get("projectId"));
  if (!projectId) return { error: "Unknown project." };
  const angleId = id(formData.get("id"));
  const parsed = AngleSchema.safeParse({
    name: text(formData.get("name")),
    category: text(formData.get("category")),
    hypothesis: text(formData.get("hypothesis")),
    audience: nullable(formData.get("audience")),
    awarenessStage: text(formData.get("awarenessStage")) || "unclear",
    painPoint: nullable(formData.get("painPoint")),
    desire: nullable(formData.get("desire")),
    motivation: nullable(formData.get("motivation")),
    coreMessage: text(formData.get("coreMessage")),
    productBenefit: nullable(formData.get("productBenefit")),
    customerEvidence: nullable(formData.get("customerEvidence")),
    recommendedFormat: nullable(formData.get("recommendedFormat")),
    proofRequirements: nullable(formData.get("proofRequirements")),
    weaknesses: nullable(formData.get("weaknesses")),
    testingRecommendation: nullable(formData.get("testingRecommendation")),
    notes: nullable(formData.get("notes")),
  });
  if (!parsed.success) return failure(parsed.error);
  const values = { ...parsed.data, potentialHooks: lines(formData.get("potentialHooks")), edited: true, updatedAt: new Date() };
  if (angleId) {
    await db.update(cosAngles).set(values).where(and(eq(cosAngles.id, angleId), eq(cosAngles.projectId, projectId)));
    refresh();
    return { success: "Angle saved." };
  }
  const [created] = await db.insert(cosAngles).values({ ...values, projectId }).returning({ id: cosAngles.id });
  await log("created", "angle", created.id);
  refresh();
  redirect(`/admin/creative-os/p/${projectId}/angles/${created.id}`);
}

export async function setAngleStatus(formData: FormData) {
  await requireSession();
  const angleId = id(formData.get("id"));
  const status = text(formData.get("status"));
  if (!angleId || !(ANGLE_STATUSES as readonly string[]).includes(status)) return;
  await db.update(cosAngles).set({ status, updatedAt: new Date() }).where(eq(cosAngles.id, angleId));
  refresh();
}

export async function deleteAngle(formData: FormData) {
  await requireSession();
  const angleId = id(formData.get("id"));
  if (!angleId) return;
  await db.delete(cosAngles).where(eq(cosAngles.id, angleId));
  await log("deleted", "angle", angleId);
  refresh();
  const projectId = id(formData.get("projectId"));
  if (projectId) redirect(`/admin/creative-os/p/${projectId}/angles`);
}

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

const HookSchema = z.object({
  text: z.string().min(1, "Write the hook.").max(1000),
  category: z.enum(HOOK_CATEGORIES),
  awarenessStage: z.enum(AWARENESS_STAGES),
  angleId: z.number().int().positive().nullable(),
  trigger: z.string().max(1000).nullable(),
  visualOpening: z.string().max(1000).nullable(),
  format: z.string().max(120).nullable(),
  status: z.enum(HOOK_STATUSES),
  notes: z.string().max(2000).nullable(),
});

export async function saveHook(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const projectId = id(formData.get("projectId"));
  if (!projectId) return { error: "Unknown project." };
  const hookId = id(formData.get("id"));
  const parsed = HookSchema.safeParse({
    text: text(formData.get("text")),
    category: text(formData.get("category")) || "problem",
    awarenessStage: text(formData.get("awarenessStage")) || "unclear",
    angleId: id(formData.get("angleId")),
    trigger: nullable(formData.get("trigger")),
    visualOpening: nullable(formData.get("visualOpening")),
    format: nullable(formData.get("format")),
    status: text(formData.get("status")) || "draft",
    notes: nullable(formData.get("notes")),
  });
  if (!parsed.success) return failure(parsed.error);
  const tags = text(formData.get("tags"))
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
  if (hookId) {
    await db
      .update(cosHooks)
      .set({ ...parsed.data, tags, updatedAt: new Date() })
      .where(and(eq(cosHooks.id, hookId), eq(cosHooks.projectId, projectId)));
  } else {
    await db.insert(cosHooks).values({ ...parsed.data, tags, projectId });
  }
  refresh();
  return { success: hookId ? "Hook saved." : "Hook added." };
}

export async function setHookStatus(formData: FormData) {
  await requireSession();
  const hookId = id(formData.get("id"));
  const status = text(formData.get("status"));
  if (!hookId || !(HOOK_STATUSES as readonly string[]).includes(status)) return;
  await db.update(cosHooks).set({ status, updatedAt: new Date() }).where(eq(cosHooks.id, hookId));
  refresh();
}

export async function toggleHookBookmark(formData: FormData) {
  await requireSession();
  const hookId = id(formData.get("id"));
  if (!hookId) return;
  await db
    .update(cosHooks)
    .set({ bookmarked: text(formData.get("bookmarked")) === "true", updatedAt: new Date() })
    .where(eq(cosHooks.id, hookId));
  refresh();
}

export async function deleteHook(formData: FormData) {
  await requireSession();
  const hookId = id(formData.get("id"));
  if (!hookId) return;
  await db.delete(cosHooks).where(eq(cosHooks.id, hookId));
  refresh();
}

/* ------------------------------------------------------------------ */
/* Scripts                                                             */
/* ------------------------------------------------------------------ */

const ScriptBriefSchema = z.object({
  title: z.string().min(1, "Give it a working title.").max(200),
  kind: z.enum(COPY_KIND_KEYS as [CopyKind, ...CopyKind[]]),
  productId: z.number().int().positive().nullable(),
  segmentId: z.number().int().positive().nullable(),
  angleId: z.number().int().positive().nullable(),
  hookId: z.number().int().positive().nullable(),
  platform: z.string().max(40).nullable(),
  format: z.string().max(60).nullable(),
  framework: z.enum(Object.keys(FRAMEWORKS) as [string, ...string[]]),
  awarenessStage: z.enum(AWARENESS_STAGES).nullable(),
  durationSeconds: z.number().int().min(5).max(1800).nullable(),
  language: z.string().min(1).max(40),
  offer: z.string().max(2000).nullable(),
  cta: z.string().max(200).nullable(),
  instructions: z.string().max(6000).nullable(),
});

function scriptBriefFields(formData: FormData) {
  const duration = Number(text(formData.get("durationSeconds")));
  return ScriptBriefSchema.safeParse({
    title: text(formData.get("title")),
    kind: text(formData.get("kind")),
    productId: id(formData.get("productId")),
    segmentId: id(formData.get("segmentId")),
    angleId: id(formData.get("angleId")),
    hookId: id(formData.get("hookId")),
    platform: nullable(formData.get("platform")),
    format: nullable(formData.get("format")),
    framework: text(formData.get("framework")) || "freeform",
    awarenessStage: nullable(formData.get("awarenessStage")),
    durationSeconds: Number.isFinite(duration) && duration > 0 ? Math.round(duration) : null,
    language: text(formData.get("language")) || "English",
    offer: nullable(formData.get("offer")),
    cta: nullable(formData.get("cta")),
    instructions: nullable(formData.get("instructions")),
  });
}

export async function createScript(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const projectId = id(formData.get("projectId"));
  if (!projectId) return { error: "Unknown project." };
  const parsed = scriptBriefFields(formData);
  if (!parsed.success) return failure(parsed.error);
  const kind = COPY_KINDS[parsed.data.kind];
  // Empty sections in the kind's usual order, so you can also write it yourself from the start.
  const working: ScriptSection[] = kind.sections.map((label) => ({ label, text: "", direction: "" }));
  const [script] = await db.insert(cosScripts).values({ ...parsed.data, projectId, working }).returning({ id: cosScripts.id });
  await log("created", "script", script.id);
  refresh();
  redirect(`/admin/creative-os/p/${projectId}/scripts/${script.id}`);
}

export async function saveScriptBrief(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const projectId = id(formData.get("projectId"));
  const scriptId = id(formData.get("id"));
  if (!projectId || !scriptId) return { error: "Unknown script." };
  const parsed = scriptBriefFields(formData);
  if (!parsed.success) return failure(parsed.error);
  await db
    .update(cosScripts)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(cosScripts.id, scriptId), eq(cosScripts.projectId, projectId)));
  refresh();
  return { success: "Brief saved." };
}

const Sections = z
  .array(z.object({ label: z.string().max(120), text: z.string().max(20_000), direction: z.string().max(4000) }))
  .max(40);

/** Autosave of the editor: the working text only, no version, no AI. */
export async function autosaveScript(scriptId: number, sections: ScriptSection[]): Promise<{ ok: boolean; savedAt?: string; error?: string }> {
  await requireSession();
  const parsed = Sections.safeParse(sections);
  if (!Number.isInteger(scriptId) || !parsed.success) return { ok: false, error: "Could not save: the text did not look right." };
  const [saved] = await db
    .update(cosScripts)
    .set({ working: parsed.data, updatedAt: new Date() })
    .where(eq(cosScripts.id, scriptId))
    .returning({ updatedAt: cosScripts.updatedAt });
  if (!saved) return { ok: false, error: "That script no longer exists." };
  return { ok: true, savedAt: saved.updatedAt.toISOString() };
}

async function nextVersionNumber(scriptId: number) {
  const [{ last }] = await db.select({ last: max(cosScriptVersions.number) }).from(cosScriptVersions).where(eq(cosScriptVersions.scriptId, scriptId));
  return (last ?? 0) + 1;
}

/** Saves the working text as a named version you can return to. */
export async function saveScriptVersion(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const scriptId = id(formData.get("id"));
  if (!scriptId) return { error: "Unknown script." };
  const [script] = await db.select({ working: cosScripts.working }).from(cosScripts).where(eq(cosScripts.id, scriptId)).limit(1);
  if (!script) return { error: "That script no longer exists." };
  if (!script.working.some((section) => section.text.trim())) return { error: "There is nothing to save yet." };
  const number = await nextVersionNumber(scriptId);
  await db.insert(cosScriptVersions).values({
    scriptId,
    number,
    source: "manual",
    label: (text(formData.get("label")) || `Saved by you`).slice(0, 200),
    sections: script.working,
  });
  refresh();
  return { success: `Saved as version ${number}.` };
}

/** Makes an earlier version the working text again; the current text is kept as a version first if it is not saved yet. */
export async function restoreScriptVersion(formData: FormData) {
  await requireSession();
  const versionId = id(formData.get("versionId"));
  if (!versionId) return;
  const [version] = await db.select().from(cosScriptVersions).where(eq(cosScriptVersions.id, versionId)).limit(1);
  if (!version) return;
  const [script] = await db.select({ working: cosScripts.working }).from(cosScripts).where(eq(cosScripts.id, version.scriptId)).limit(1);
  if (!script) return;
  const [latest] = await db
    .select({ sections: cosScriptVersions.sections })
    .from(cosScriptVersions)
    .where(eq(cosScriptVersions.scriptId, version.scriptId))
    .orderBy(desc(cosScriptVersions.number))
    .limit(1);
  const unsaved = script.working.some((section) => section.text.trim()) && JSON.stringify(latest?.sections) !== JSON.stringify(script.working);
  if (unsaved) {
    await db.insert(cosScriptVersions).values({
      scriptId: version.scriptId,
      number: await nextVersionNumber(version.scriptId),
      source: "manual",
      label: "Kept automatically before restoring",
      sections: script.working,
    });
  }
  await db.update(cosScripts).set({ working: version.sections, updatedAt: new Date() }).where(eq(cosScripts.id, version.scriptId));
  refresh();
}

export async function setScriptStatus(formData: FormData) {
  await requireSession();
  const scriptId = id(formData.get("id"));
  const status = text(formData.get("status"));
  if (!scriptId || !["draft", "approved", "archived"].includes(status)) return;
  await db.update(cosScripts).set({ status, updatedAt: new Date() }).where(eq(cosScripts.id, scriptId));
  refresh();
}

export async function deleteScript(formData: FormData) {
  await requireSession();
  const scriptId = id(formData.get("id"));
  const projectId = id(formData.get("projectId"));
  if (!scriptId || !projectId) return;
  await db.delete(cosScripts).where(and(eq(cosScripts.id, scriptId), eq(cosScripts.projectId, projectId)));
  await log("deleted", "script", scriptId);
  refresh();
  redirect(`/admin/creative-os/p/${projectId}/scripts`);
}

/* ------------------------------------------------------------------ */
/* Briefs                                                              */
/* ------------------------------------------------------------------ */

export async function setBriefStatus(formData: FormData) {
  await requireSession();
  const briefId = id(formData.get("id"));
  const status = text(formData.get("status"));
  if (!briefId || !["draft", "approved", "archived"].includes(status)) return;
  await db.update(cosBriefs).set({ status, updatedAt: new Date() }).where(eq(cosBriefs.id, briefId));
  refresh();
}

export async function deleteBrief(formData: FormData) {
  await requireSession();
  const briefId = id(formData.get("id"));
  const projectId = id(formData.get("projectId"));
  if (!briefId || !projectId) return;
  await db.delete(cosBriefs).where(and(eq(cosBriefs.id, briefId), eq(cosBriefs.projectId, projectId)));
  refresh();
  redirect(`/admin/creative-os/p/${projectId}/briefs`);
}

/* ------------------------------------------------------------------ */
/* AI video plans                                                      */
/* ------------------------------------------------------------------ */

export async function setVideoPlanStatus(formData: FormData) {
  await requireSession();
  const planId = id(formData.get("id"));
  const status = text(formData.get("status"));
  if (!planId || !["draft", "approved", "archived"].includes(status)) return;
  await db.update(cosVideoPlans).set({ status, updatedAt: new Date() }).where(eq(cosVideoPlans.id, planId));
  refresh();
}

export async function deleteVideoPlan(formData: FormData) {
  await requireSession();
  const planId = id(formData.get("id"));
  const projectId = id(formData.get("projectId"));
  if (!planId || !projectId) return;
  await db.delete(cosVideoPlans).where(and(eq(cosVideoPlans.id, planId), eq(cosVideoPlans.projectId, projectId)));
  refresh();
  redirect(`/admin/creative-os/p/${projectId}/video`);
}

/* ------------------------------------------------------------------ */
/* AI image plans                                                      */
/* ------------------------------------------------------------------ */

export async function setImagePlanStatus(formData: FormData) {
  await requireSession();
  const planId = id(formData.get("id"));
  const status = text(formData.get("status"));
  if (!planId || !["draft", "approved", "archived"].includes(status)) return;
  await db.update(cosImagePlans).set({ status, updatedAt: new Date() }).where(eq(cosImagePlans.id, planId));
  refresh();
}

export async function deleteImagePlan(formData: FormData) {
  await requireSession();
  const planId = id(formData.get("id"));
  const projectId = id(formData.get("projectId"));
  if (!planId || !projectId) return;
  await db.delete(cosImagePlans).where(and(eq(cosImagePlans.id, planId), eq(cosImagePlans.projectId, projectId)));
  refresh();
  redirect(`/admin/creative-os/p/${projectId}/images`);
}

/* ------------------------------------------------------------------ */
/* Copy for an Ad Lab ad                                               */
/* ------------------------------------------------------------------ */

type AnalysisOverview = {
  overview?: { opening_hook?: string; structure_summary?: string; offer?: string | null; cta?: string | null; target_audience_hypothesis?: string };
};

/**
 * Starts a piece of copy written for an ad in the Ad Lab: a script brief
 * filled with what the ad says (transcript, copy, notes) and, if it was
 * analysed, its hook, structure, offer and call to action. Free: nothing is
 * written until you press Write it on the next page.
 */
export async function writeCopyForAd(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const adId = id(formData.get("adId"));
  const [ad] = adId ? await db.select().from(cosAds).where(eq(cosAds.id, adId)).limit(1) : [];
  if (!ad) return { error: "That ad no longer exists." };
  if (!ad.transcript?.trim() && !ad.adCopy?.trim() && !ad.notes?.trim()) {
    return { error: "Add the ad's transcript or copy first, so there is something to write from." };
  }
  const kind = (COPY_KIND_KEYS as string[]).includes(text(formData.get("kind"))) ? (text(formData.get("kind")) as CopyKind) : "meta_primary_text";
  const language = ["English", "Georgian", "Russian"].includes(text(formData.get("language"))) ? text(formData.get("language")) : "English";

  const [analysis] = await db
    .select({ overview: cosAdAnalyses.overview })
    .from(cosAdAnalyses)
    .where(eq(cosAdAnalyses.adId, ad.id))
    .orderBy(desc(cosAdAnalyses.createdAt))
    .limit(1);
  const overview = (analysis?.overview as AnalysisOverview | undefined)?.overview;
  const products = await db.select({ id: cosProducts.id }).from(cosProducts).where(eq(cosProducts.projectId, ad.projectId));

  const instructions = [
    `Write this to run with the ad "${ad.title}"${ad.format ? ` (${ad.format})` : ""}. Match what the ad says and shows; do not promise anything it does not.`,
    ad.transcript?.trim() ? `What is said in the video:\n${ad.transcript.trim()}` : null,
    ad.adCopy?.trim() ? `The ad's current copy:\n${ad.adCopy.trim()}` : null,
    ad.notes?.trim() ? `Notes on the ad and its visuals:\n${ad.notes.trim()}` : null,
    overview?.opening_hook ? `Its opening hook: ${overview.opening_hook}` : null,
    overview?.structure_summary ? `Its structure: ${overview.structure_summary}` : null,
    overview?.offer ? `Its offer: ${overview.offer}` : null,
    overview?.cta ? `Its call to action: ${overview.cta}` : null,
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 6000);

  const working: ScriptSection[] = COPY_KINDS[kind].sections.map((label) => ({ label, text: "", direction: "" }));
  const [script] = await db
    .insert(cosScripts)
    .values({
      projectId: ad.projectId,
      adId: ad.id,
      productId: products.length === 1 ? products[0].id : null,
      title: `${COPY_KINDS[kind].label}: ${ad.title}`.slice(0, 200),
      kind,
      platform: ad.platform ?? "Meta",
      language,
      offer: overview?.offer ?? null,
      cta: overview?.cta?.slice(0, 200) ?? null,
      instructions,
      working,
    })
    .returning({ id: cosScripts.id });
  await log("created", "script", script.id, { fromAd: ad.id });
  refresh();
  redirect(`/admin/creative-os/p/${ad.projectId}/scripts/${script.id}`);
}
