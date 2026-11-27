import "server-only";

import type Anthropic from "@anthropic-ai/sdk";

import type { CosAiOperation, CosPricing } from "@/db/creative-os";

import type { Effort } from "../format";
import { competitorDiscovery, competitorResearch, marketPatterns } from "./competitors";
import { angleGeneration, briefGeneration, hookGeneration, scriptReview, scriptWriting, sectionRewrite, videoPlan, imagePlan } from "./creative";
import type { Material } from "./context";
import type { AnyModule, ModuleOptions } from "./module";
import { productResearch } from "./product";
import { estimateResearch, readResult, structuredCall, webResearchCall } from "./run";
import { audienceSegments, awarenessAnalysis } from "./strategy";
import { vocResearch } from "./voc";
import { collectEvidence, normalizeUrl, saveSources } from "./web";

/*
 * Every research module, and the three things the app does with one: work
 * out what a run would send and cost (no AI call), make the call, and store
 * the answer. The pages, the cost preview and the API route all go through
 * here, so every module gets the same budget checks and the same evidence
 * checks.
 */

export const RESEARCH_MODULES: Record<string, AnyModule> = Object.fromEntries(
  [
    productResearch,
    vocResearch,
    audienceSegments,
    awarenessAnalysis,
    competitorDiscovery,
    competitorResearch,
    marketPatterns,
    angleGeneration,
    hookGeneration,
    scriptWriting,
    sectionRewrite,
    scriptReview,
    briefGeneration,
    videoPlan,
    imagePlan,
  ].map((item) => [item.kind, item]),
);

/** Free-text options (a rewrite instruction); every other option is a short code. */
const TEXT_OPTIONS = new Set(["instruction"]);

/** Option values are short codes, or short free text for the keys above; anything else is dropped. */
export function cleanOptions(raw: unknown): ModuleOptions {
  if (!raw || typeof raw !== "object") return {};
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>)
      .filter(([key, value]) => /^[a-z]{1,20}$/.test(key) && typeof value === "string")
      .map(([key, value]) => [key, TEXT_OPTIONS.has(key) ? (value as string).replace(/[\u0000-\u0008\u000b-\u001f]/g, "").trim().slice(0, 600) : value])
      .filter(([key, value]) => TEXT_OPTIONS.has(key as string) || /^[a-z0-9_:]{1,40}$/.test(value as string))
      .slice(0, 10),
  ) as ModuleOptions;
}

export type Prepared = {
  researchModule: AnyModule;
  ctx: unknown;
  depth: ReturnType<AnyModule["depth"]>;
  materials: Material[];
  estimate: ReturnType<typeof estimateResearch>;
};

/** Loads a run's material and prices it. Free: nothing is sent anywhere. */
export async function prepareResearch(
  kind: string,
  targetId: number,
  options: ModuleOptions,
  price: Pick<CosPricing, "inputPerMtok" | "outputPerMtok">,
  webSearchPer1k: number,
): Promise<{ ok: true; prepared: Prepared } | { ok: false; error: string }> {
  const researchModule = RESEARCH_MODULES[kind];
  if (!researchModule) return { ok: false, error: "Unknown research module." };
  const loaded = await researchModule.load(targetId, options);
  if (!loaded.ok) return loaded;
  const depth = researchModule.depth(options);
  const estimate = estimateResearch({
    inputChars: researchModule.system.length + researchModule.user(loaded.ctx).length,
    depth,
    maxOutputTokens: researchModule.maxOutputTokens,
    likelyOutputTokens: researchModule.likelyOutputTokens,
    price,
    webSearchPer1k,
  });
  return { ok: true, prepared: { researchModule, ctx: loaded.ctx, depth, materials: researchModule.materials(loaded.ctx), estimate } };
}

export function researchCallFor(prepared: Prepared, model: string, effort: Effort) {
  const { researchModule, ctx, depth } = prepared;
  const common = { model, effort, system: researchModule.system, user: researchModule.user(ctx), schema: researchModule.schema, maxTokens: researchModule.maxOutputTokens };
  return depth ? webResearchCall({ ...common, depth }) : structuredCall(common);
}

/**
 * Stores what a run found. The sources it touched are saved first, so even
 * a run whose answer cannot be used leaves a record of the pages it read.
 */
export async function saveResearch(prepared: Prepared, message: Anthropic.Message, operation: CosAiOperation) {
  const { researchModule, ctx, depth } = prepared;
  const evidence = depth ? collectEvidence(message) : null;
  for (const url of researchModule.providedUrls(ctx)) if (url && evidence) evidence.provided.add(normalizeUrl(url));
  const sourceIds = evidence ? await saveSources(researchModule.projectId(ctx), operation.id, evidence, researchModule.brandDomains(ctx)) : new Map<string, number>();
  const output = readResult(message, researchModule.schema, depth !== null);
  return researchModule.save({ ctx, output, evidence, sourceIds, operation });
}
