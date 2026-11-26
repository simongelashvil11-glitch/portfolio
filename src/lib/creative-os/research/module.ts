import "server-only";

import { z } from "zod";

import { db } from "@/db";
import { cosResearchRuns, type CosAiOperation, type StoredFinding } from "@/db/creative-os";

import { DEPTH_KEYS, EVIDENCE_TYPES, type Depth } from "../research-labels";
import type { Material } from "./context";
import { markSources, type WebEvidence } from "./web";

/*
 * The shape every research module has, and the pieces they share. A module
 * says what it is about (its target), how to load what it needs, what it
 * sends to Claude and in what format the answer must come back, and how
 * the answer is stored. The route and the cost preview drive every module
 * the same way through this.
 */

export type ModuleOptions = Record<string, string>;

export type Loaded<Ctx> = { ok: true; ctx: Ctx } | { ok: false; error: string };

export type SaveArgs<Ctx, Out> = {
  ctx: Ctx;
  output: Out;
  evidence: WebEvidence | null;
  sourceIds: Map<string, number>;
  operation: CosAiOperation;
};

export type ResearchModule<Ctx = unknown, Out = unknown> = {
  kind: string;
  maxOutputTokens: number;
  likelyOutputTokens: [number, number];
  /** Null: no web access for this run. */
  depth: (options: ModuleOptions) => Depth | null;
  load: (targetId: number, options: ModuleOptions) => Promise<Loaded<Ctx>>;
  projectId: (ctx: Ctx) => number;
  country: (ctx: Ctx) => string | null;
  brandDomains: (ctx: Ctx) => string[];
  /** Addresses given in the material sent (the brand's site, product pages); citing them counts as seen. */
  providedUrls: (ctx: Ctx) => (string | null)[];
  system: string;
  user: (ctx: Ctx) => string;
  materials: (ctx: Ctx) => Material[];
  schema: z.ZodType<Out>;
  save: (args: SaveArgs<Ctx, Out>) => Promise<unknown>;
};

/** A module with its types erased, for the registry. */
export type AnyModule = ResearchModule<unknown, unknown>;
export function defineModule<Ctx, Out>(module: ResearchModule<Ctx, Out>): AnyModule {
  return module as unknown as AnyModule;
}

/** The depth option: one of the fixed depths, or none when the module allows working without the web. */
export function depthOption(options: ModuleOptions, { allowNone }: { allowNone: boolean }): Depth | null {
  const value = options.depth;
  if (allowNone && value === "none") return null;
  return DEPTH_KEYS.includes(value as Depth) ? (value as Depth) : "standard";
}

/* Schema pieces shared by the modules. Empty strings, not nulls, for "not known": fewer unions keep the strict schema simple. */

export const Finding = z.object({
  text: z.string(),
  evidence_type: z.enum(EVIDENCE_TYPES),
  source_urls: z.array(z.string()),
});
export const Findings = z.array(Finding);

export function storeFindings(evidence: WebEvidence | null, findings: z.infer<typeof Findings>): StoredFinding[] {
  return findings
    .filter((finding) => finding.text.trim())
    .map((finding) => ({ text: finding.text.trim(), evidenceType: finding.evidence_type, sources: markSources(evidence, finding.source_urls) }));
}

export async function recordRun(
  operation: CosAiOperation,
  projectId: number,
  targetId: number | null,
  evidence: WebEvidence | null,
  details: { summary?: string | null; limitations?: string[] },
) {
  await db.insert(cosResearchRuns).values({
    projectId,
    operationId: operation.id,
    kind: operation.kind,
    targetId,
    model: operation.model,
    summary: details.summary?.trim() || null,
    queries: evidence?.queries ?? [],
    limitations: (details.limitations ?? []).map((item) => item.trim()).filter(Boolean),
    sourceCounts: evidence ? { read: evidence.read.size, searched: evidence.searched.size, failed: evidence.failed.size } : null,
  });
}

/** Text that may be empty ("" for unknown) → null. */
export const orNull = (value: string | undefined | null) => (value && value.trim() ? value.trim() : null);
