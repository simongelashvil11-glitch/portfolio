"use server";

import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import {
  cosAdImages,
  cosAds,
  cosAssignments,
  cosAuditLog,
  cosKnowledgeItems,
  cosPricing,
  cosProducts,
  cosProjects,
  cosSettings,
  KNOWLEDGE_KINDS,
} from "@/db/creative-os";
import { requireSession } from "@/lib/auth";
import { checkBudget } from "@/lib/creative-os/budget";
import { estimateFor, materialsFor } from "@/lib/creative-os/deconstruct";
import { fetchPublicPage, saveKnowledge } from "@/lib/creative-os/knowledge";
import { ensureDefaults, getModelPrice } from "@/lib/creative-os/pricing";

/*
 * CreativeOS's server actions: everything that saves, edits or deletes.
 * None of them calls the Claude API — paid operations run only through
 * /admin/creative-os/api/* after the owner authorizes each one.
 */

export type FormState = { error?: string; success?: string; fieldErrors?: Record<string, string> };

const text = (value: FormDataEntryValue | null) => (typeof value === "string" ? value.trim() : "");
const nullable = (value: FormDataEntryValue | null) => text(value) || null;
const list = (value: FormDataEntryValue | null) =>
  text(value)
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
const id = (value: FormDataEntryValue | null) => {
  const parsed = Number(text(value));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};
const url = z.url("Enter a full address, starting with https://").max(1000).nullable();

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
/* Projects                                                            */
/* ------------------------------------------------------------------ */

const ProjectSchema = z.object({
  name: z.string().min(1, "Give the project a name.").max(160),
  brandName: z.string().max(160).nullable(),
  website: url,
  industry: z.string().max(160).nullable(),
  targetCountries: z.array(z.string().max(80)).max(40),
  targetLanguages: z.array(z.string().max(60)).max(20),
  targetAudience: z.string().max(5000).nullable(),
  platforms: z.array(z.string().max(60)).max(20),
  objectives: z.string().max(5000).nullable(),
  brandVoice: z.string().max(10000).nullable(),
  clientInstructions: z.string().max(20000).nullable(),
  approvedClaims: z.string().max(20000).nullable(),
  prohibitedClaims: z.string().max(20000).nullable(),
  knownCompetitors: z.string().max(5000).nullable(),
  notes: z.string().max(20000).nullable(),
});

function projectFields(formData: FormData) {
  return ProjectSchema.safeParse({
    name: text(formData.get("name")),
    brandName: nullable(formData.get("brandName")),
    website: nullable(formData.get("website")),
    industry: nullable(formData.get("industry")),
    targetCountries: list(formData.get("targetCountries")),
    targetLanguages: list(formData.get("targetLanguages")),
    targetAudience: nullable(formData.get("targetAudience")),
    platforms: list(formData.get("platforms")),
    objectives: nullable(formData.get("objectives")),
    brandVoice: nullable(formData.get("brandVoice")),
    clientInstructions: nullable(formData.get("clientInstructions")),
    approvedClaims: nullable(formData.get("approvedClaims")),
    prohibitedClaims: nullable(formData.get("prohibitedClaims")),
    knownCompetitors: nullable(formData.get("knownCompetitors")),
    notes: nullable(formData.get("notes")),
  });
}

export async function createProject(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const parsed = projectFields(formData);
  if (!parsed.success) return failure(parsed.error);
  const [project] = await db.insert(cosProjects).values(parsed.data).returning();
  await log("created", "project", project.id);
  refresh();
  redirect(`/admin/creative-os/p/${project.id}`);
}

export async function saveProject(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const projectId = id(formData.get("id"));
  if (!projectId) return { error: "Unknown project." };
  const parsed = projectFields(formData);
  if (!parsed.success) return failure(parsed.error);
  await db.update(cosProjects).set({ ...parsed.data, updatedAt: new Date() }).where(eq(cosProjects.id, projectId));
  await log("updated", "project", projectId);
  refresh();
  return { success: "Project saved." };
}

export async function setProjectArchived(formData: FormData) {
  await requireSession();
  const projectId = id(formData.get("id"));
  if (!projectId) return;
  const archived = text(formData.get("archived")) === "true";
  await db
    .update(cosProjects)
    .set({ status: archived ? "archived" : "active", updatedAt: new Date() })
    .where(eq(cosProjects.id, projectId));
  await log(archived ? "archived" : "restored", "project", projectId);
  refresh();
}

/** A row without its id and timestamps, ready to insert as a new row. */
function withoutKeys<T extends { id: number; createdAt: Date; updatedAt: Date }>(row: T): Omit<T, "id" | "createdAt" | "updatedAt"> {
  const copy: Partial<T> = { ...row };
  delete copy.id;
  delete copy.createdAt;
  delete copy.updatedAt;
  return copy as Omit<T, "id" | "createdAt" | "updatedAt">;
}

/** A copy of the project's details and products, for a similar client. Research and ads are not copied. */
export async function duplicateProject(formData: FormData) {
  await requireSession();
  const projectId = id(formData.get("id"));
  if (!projectId) return;
  const [source] = await db.select().from(cosProjects).where(eq(cosProjects.id, projectId)).limit(1);
  if (!source) return;
  const [copy] = await db
    .insert(cosProjects)
    .values({ ...withoutKeys(source), name: `${source.name} (copy)`.slice(0, 160), status: "active" })
    .returning();
  const products = await db.select().from(cosProducts).where(eq(cosProducts.projectId, projectId));
  if (products.length > 0) {
    await db.insert(cosProducts).values(products.map((product) => ({ ...withoutKeys(product), projectId: copy.id })));
  }
  await log("duplicated", "project", copy.id, { from: projectId });
  refresh();
  redirect(`/admin/creative-os/p/${copy.id}`);
}

/** Deletes a project and everything that belongs to it: products, knowledge, ads, analyses. */
export async function deleteProject(formData: FormData) {
  await requireSession();
  const projectId = id(formData.get("id"));
  if (!projectId) return;
  await db.delete(cosProjects).where(eq(cosProjects.id, projectId));
  await log("deleted", "project", projectId);
  refresh();
  redirect("/admin/creative-os/projects");
}

/* ------------------------------------------------------------------ */
/* Products                                                            */
/* ------------------------------------------------------------------ */

const ProductSchema = z.object({
  name: z.string().min(1, "Give the product a name.").max(200),
  description: z.string().max(20000).nullable(),
  url,
  price: z.string().max(80).nullable(),
  offer: z.string().max(5000).nullable(),
  notes: z.string().max(20000).nullable(),
});

export async function saveProduct(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const projectId = id(formData.get("projectId"));
  if (!projectId) return { error: "Unknown project." };
  const productId = id(formData.get("id"));
  const parsed = ProductSchema.safeParse({
    name: text(formData.get("name")),
    description: nullable(formData.get("description")),
    url: nullable(formData.get("url")),
    price: nullable(formData.get("price")),
    offer: nullable(formData.get("offer")),
    notes: nullable(formData.get("notes")),
  });
  if (!parsed.success) return failure(parsed.error);
  if (productId) {
    await db
      .update(cosProducts)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(cosProducts.id, productId), eq(cosProducts.projectId, projectId)));
  } else {
    await db.insert(cosProducts).values({ ...parsed.data, projectId });
  }
  refresh();
  return { success: productId ? "Product saved." : "Product added." };
}

export async function deleteProduct(formData: FormData) {
  await requireSession();
  const productId = id(formData.get("id"));
  if (!productId) return;
  await db.delete(cosProducts).where(eq(cosProducts.id, productId));
  refresh();
}

/* ------------------------------------------------------------------ */
/* Assignments                                                         */
/* ------------------------------------------------------------------ */

const AssignmentSchema = z.object({
  projectId: z.number().int().positive().nullable(),
  client: z.string().min(1, "Who is it for?").max(200),
  title: z.string().min(1, "Give the assignment a title.").max(200),
  instructions: z.string().max(50000).nullable(),
  productInfo: z.string().max(50000).nullable(),
  referenceAds: z.string().max(50000).nullable(),
  deliverables: z.string().max(20000).nullable(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date.").nullable(),
  evaluationCriteria: z.string().max(20000).nullable(),
  notes: z.string().max(20000).nullable(),
  status: z.enum(["open", "submitted", "done", "archived"]),
});

export async function saveAssignment(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const assignmentId = id(formData.get("id"));
  const parsed = AssignmentSchema.safeParse({
    projectId: id(formData.get("projectId")),
    client: text(formData.get("client")),
    title: text(formData.get("title")),
    instructions: nullable(formData.get("instructions")),
    productInfo: nullable(formData.get("productInfo")),
    referenceAds: nullable(formData.get("referenceAds")),
    deliverables: nullable(formData.get("deliverables")),
    deadline: nullable(formData.get("deadline")),
    evaluationCriteria: nullable(formData.get("evaluationCriteria")),
    notes: nullable(formData.get("notes")),
    status: text(formData.get("status")) || "open",
  });
  if (!parsed.success) return failure(parsed.error);
  if (assignmentId) {
    await db.update(cosAssignments).set({ ...parsed.data, updatedAt: new Date() }).where(eq(cosAssignments.id, assignmentId));
    refresh();
    return { success: "Assignment saved." };
  }
  const [created] = await db.insert(cosAssignments).values(parsed.data).returning();
  refresh();
  redirect(`/admin/creative-os/assignments/${created.id}`);
}

export async function deleteAssignment(formData: FormData) {
  await requireSession();
  const assignmentId = id(formData.get("id"));
  if (!assignmentId) return;
  await db.delete(cosAssignments).where(eq(cosAssignments.id, assignmentId));
  refresh();
  redirect("/admin/creative-os/assignments");
}

/* ------------------------------------------------------------------ */
/* Knowledge base                                                      */
/* ------------------------------------------------------------------ */

const kind = z.enum(KNOWLEDGE_KINDS);

export async function addKnowledgeText(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const projectId = id(formData.get("projectId"));
  if (!projectId) return { error: "Unknown project." };
  const parsed = z
    .object({
      kind,
      title: z.string().min(1, "Give it a title.").max(300),
      content: z.string().min(1, "Paste some text.").max(400_000, "That is too long for one item; split it up."),
      productId: z.number().int().positive().nullable(),
    })
    .safeParse({
      kind: text(formData.get("kind")),
      title: text(formData.get("title")),
      content: text(formData.get("content")),
      productId: id(formData.get("productId")),
    });
  if (!parsed.success) return failure(parsed.error);
  await saveKnowledge({ projectId, sourceType: "text", ...parsed.data });
  refresh();
  return { success: "Added to the knowledge base." };
}

/** Imports a public page's text. The server reads the page itself: no AI, no cost. */
export async function importKnowledgeUrl(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const projectId = id(formData.get("projectId"));
  if (!projectId) return { error: "Unknown project." };
  const parsed = z
    .object({ kind, address: z.url("Enter a full address, starting with https://").max(1000), title: z.string().max(300) })
    .safeParse({ kind: text(formData.get("kind")), address: text(formData.get("url")), title: text(formData.get("title")) });
  if (!parsed.success) return failure(parsed.error);
  try {
    const page = await fetchPublicPage(parsed.data.address);
    if (page.text.length < 40) {
      return { error: "The page had almost no readable text. It may need a browser to load; paste its text instead." };
    }
    await saveKnowledge({
      projectId,
      productId: id(formData.get("productId")),
      kind: parsed.data.kind,
      title: parsed.data.title || page.title || page.finalUrl,
      sourceType: "url",
      sourceUrl: page.finalUrl,
      content: page.text,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "The page could not be imported." };
  }
  refresh();
  return { success: "Page imported." };
}

export async function deleteKnowledgeItem(formData: FormData) {
  await requireSession();
  const itemId = id(formData.get("id"));
  if (!itemId) return;
  await db.delete(cosKnowledgeItems).where(eq(cosKnowledgeItems.id, itemId));
  refresh();
}

/* ------------------------------------------------------------------ */
/* Ads                                                                 */
/* ------------------------------------------------------------------ */

const AdSchema = z.object({
  title: z.string().min(1, "Give the ad a title.").max(300),
  advertiser: z.string().max(200).nullable(),
  platform: z.string().max(40).nullable(),
  productCategory: z.string().max(160).nullable(),
  sourceUrl: url,
  format: z.string().max(60).nullable(),
  adCopy: z.string().max(50000).nullable(),
  transcript: z.string().max(100000).nullable(),
  notes: z.string().max(20000).nullable(),
  tags: z.array(z.string().max(40)).max(30),
});

export async function saveAd(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const projectId = id(formData.get("projectId"));
  if (!projectId) return { error: "Unknown project." };
  const adId = id(formData.get("id"));
  const parsed = AdSchema.safeParse({
    title: text(formData.get("title")),
    advertiser: nullable(formData.get("advertiser")),
    platform: nullable(formData.get("platform")),
    productCategory: nullable(formData.get("productCategory")),
    sourceUrl: nullable(formData.get("sourceUrl")),
    format: nullable(formData.get("format")),
    adCopy: nullable(formData.get("adCopy")),
    transcript: nullable(formData.get("transcript")),
    notes: nullable(formData.get("notes")),
    tags: list(formData.get("tags")),
  });
  if (!parsed.success) return failure(parsed.error);
  if (adId) {
    await db
      .update(cosAds)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(cosAds.id, adId), eq(cosAds.projectId, projectId)));
    refresh();
    return { success: "Ad saved." };
  }
  const [ad] = await db.insert(cosAds).values({ ...parsed.data, projectId }).returning();
  refresh();
  redirect(`/admin/creative-os/p/${projectId}/ads/${ad.id}`);
}

export async function deleteAd(formData: FormData) {
  await requireSession();
  const adId = id(formData.get("id"));
  const projectId = id(formData.get("projectId"));
  if (!adId || !projectId) return;
  await db.delete(cosAds).where(eq(cosAds.id, adId));
  refresh();
  redirect(`/admin/creative-os/p/${projectId}/ads`);
}

export async function deleteAdImage(formData: FormData) {
  await requireSession();
  const imageId = id(formData.get("id"));
  if (!imageId) return;
  await db.delete(cosAdImages).where(eq(cosAdImages.id, imageId));
  refresh();
}

/* ------------------------------------------------------------------ */
/* Settings and prices                                                 */
/* ------------------------------------------------------------------ */

const money = (value: FormDataEntryValue | null) => {
  const raw = text(value);
  if (!raw) return null;
  const parsed = Number(raw.replace(/[$,]/g, ""));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

export async function saveLimits(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  await ensureDefaults();
  const parsed = z
    .object({
      monthlyLimitUsd: z.number().min(0, "Use 0 or more.").max(10000).nullable(),
      perOperationLimitUsd: z.number().min(0, "Use 0 or more.").max(1000).nullable(),
      webSearchPer1k: z.number().min(0).max(1000),
    })
    .safeParse({
      monthlyLimitUsd: money(formData.get("monthlyLimitUsd")),
      perOperationLimitUsd: money(formData.get("perOperationLimitUsd")),
      webSearchPer1k: money(formData.get("webSearchPer1k")) ?? 10,
    });
  if (!parsed.success) return failure(parsed.error);
  await db.update(cosSettings).set({ ...parsed.data, updatedAt: new Date() }).where(eq(cosSettings.id, 1));
  await log("limits_changed", "settings", 1, parsed.data);
  refresh();
  return { success: "Limits saved." };
}

export async function savePrice(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const model = text(formData.get("model"));
  const parsed = z
    .object({
      inputPerMtok: z.number().min(0).max(1000),
      outputPerMtok: z.number().min(0).max(1000),
      cacheWritePerMtok: z.number().min(0).max(1000),
      cacheReadPerMtok: z.number().min(0).max(1000),
      enabled: z.boolean(),
    })
    .safeParse({
      inputPerMtok: money(formData.get("inputPerMtok")),
      outputPerMtok: money(formData.get("outputPerMtok")),
      cacheWritePerMtok: money(formData.get("cacheWritePerMtok")),
      cacheReadPerMtok: money(formData.get("cacheReadPerMtok")),
      enabled: formData.get("enabled") === "on",
    });
  if (!parsed.success) return failure(parsed.error);
  await db.update(cosPricing).set({ ...parsed.data, updatedAt: new Date() }).where(eq(cosPricing.model, model));
  await log("price_changed", "pricing", null, { model, ...parsed.data });
  refresh();
  return { success: "Prices saved." };
}

/* ------------------------------------------------------------------ */
/* Estimates (no AI call)                                              */
/* ------------------------------------------------------------------ */

export type Preview =
  | {
      ok: true;
      model: string;
      modelLabel: string;
      low: number;
      high: number;
      inputTokens: number;
      maxOutputTokens: number;
      materials: { label: string; chars: number }[];
      budget: { allowed: boolean; reason: string | null; spent: number; monthlyLimit: number | null; perOperationLimit: number | null };
    }
  | { ok: false; error: string };

/** What a deconstruction would send and cost, worked out locally. Never calls Claude. */
export async function previewDeconstruction(adId: number, model: string): Promise<Preview> {
  await requireSession();
  const [ad] = await db.select().from(cosAds).where(eq(cosAds.id, adId)).limit(1);
  if (!ad) return { ok: false, error: "That ad no longer exists." };
  if (!ad.transcript && !ad.adCopy) return { ok: false, error: "Add the ad's transcript or copy first." };
  const price = await getModelPrice(model);
  if (!price || !price.enabled) return { ok: false, error: "Choose an enabled model." };
  const [{ images }] = await db.select({ images: count() }).from(cosAdImages).where(eq(cosAdImages.adId, adId));
  const estimate = estimateFor(ad, images, price);
  const budget = await checkBudget(estimate.high);
  return {
    ok: true,
    model,
    modelLabel: price.label,
    low: estimate.low,
    high: estimate.high,
    inputTokens: estimate.inputTokens,
    maxOutputTokens: estimate.maxOutputTokens,
    materials: materialsFor(ad, images),
    budget: {
      allowed: budget.ok,
      reason: budget.ok ? null : budget.reason,
      spent: budget.spent,
      monthlyLimit: budget.monthlyLimit,
      perOperationLimit: budget.perOperationLimit,
    },
  };
}
