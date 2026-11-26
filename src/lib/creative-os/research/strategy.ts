import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  cosAudienceSegments,
  cosAwarenessAnalyses,
  cosCompetitorProfiles,
  cosCompetitors,
  cosCustomerInsights,
  cosProductResearch,
  cosProducts,
  cosProjects,
  type CosAudienceSegment,
  type CosProduct,
  type CosProject,
} from "@/db/creative-os";

import { AWARENESS_STAGES, SOPHISTICATION_LEVELS } from "../elements";
import { VOC_LABEL, type VocCategory } from "../research-labels";
import { brandDomains, knowledgePack, productBrief, projectBrief, SHARED_RULES, type KnowledgePack } from "./context";
import { defineModule, orNull, recordRun } from "./module";
import type { StoredProductResult } from "./product";

/*
 * The two strategy modules that work from research already done, with no
 * web access: audience segments, and customer awareness with market
 * sophistication. Both say what their conclusions rest on, and both stay
 * editable by hand afterwards.
 */

/* ------------------------------------------------------------------ */
/* Shared research digest                                              */
/* ------------------------------------------------------------------ */

type Digest = { text: string; insightIds: Set<number>; insightCount: number; productResearchCount: number };

/** The project's research so far, condensed: customer insights by id, and product research summaries. */
async function researchDigest(project: CosProject, products: CosProduct[], maxInsights = 120): Promise<Digest> {
  const insights = await db
    .select()
    .from(cosCustomerInsights)
    .where(eq(cosCustomerInsights.projectId, project.id))
    .orderBy(desc(cosCustomerInsights.bookmarked), desc(cosCustomerInsights.createdAt))
    .limit(maxInsights);

  const research = products.length
    ? await db
        .select()
        .from(cosProductResearch)
        .where(inArray(cosProductResearch.productId, products.map((product) => product.id)))
        .orderBy(desc(cosProductResearch.createdAt))
    : [];
  const latest = new Map<number, StoredProductResult>();
  for (const row of research) if (!latest.has(row.productId)) latest.set(row.productId, row.result as StoredProductResult);

  const insightLines = insights.map((insight) => {
    const label = VOC_LABEL[insight.category as VocCategory] ?? insight.category;
    const said = insight.isQuote ? `"${insight.statement}"` : insight.statement;
    return `[#${insight.id}] (${label}${insight.subject ? `, about ${insight.subject}` : ""}) ${said}${insight.interpretation ? ` — ${insight.interpretation}` : ""}`;
  });

  const productLines = products
    .filter((product) => latest.has(product.id))
    .map((product) => {
      const result = latest.get(product.id)!;
      const pick = (key: keyof StoredProductResult["sections"]) =>
        (result.sections[key] ?? []).map((finding) => `- ${finding.text}`).join("\n");
      return [
        `Product research — ${product.name}: ${result.summary}`,
        `Target audience:\n${pick("target_audience")}`,
        `Purchase motivations:\n${pick("purchase_motivations")}`,
        `Objections:\n${pick("objections")}`,
        `Benefits:\n${pick("functional_benefits")}\n${pick("emotional_benefits")}`,
        `Unique mechanism:\n${pick("unique_mechanism")}`,
      ].join("\n");
    });

  const text = [
    insightLines.length ? `<customer_insights>\n${insightLines.join("\n")}\n</customer_insights>` : "",
    productLines.length ? `<product_research>\n${productLines.join("\n\n")}\n</product_research>` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  return { text, insightIds: new Set(insights.map((insight) => insight.id)), insightCount: insights.length, productResearchCount: productLines.length };
}

async function loadProject(projectId: number) {
  const [project] = await db.select().from(cosProjects).where(eq(cosProjects.id, projectId)).limit(1);
  if (!project) return null;
  const products = await db.select().from(cosProducts).where(eq(cosProducts.projectId, project.id)).orderBy(asc(cosProducts.name));
  return { project, products };
}

/* ------------------------------------------------------------------ */
/* Audience segments                                                   */
/* ------------------------------------------------------------------ */

const AudienceOut = z.object({
  segments: z.array(
    z.object({
      persona_name: z.string(),
      situation: z.string(),
      primary_problem: z.string(),
      secondary_problems: z.array(z.string()),
      desired_transformation: z.string(),
      emotional_motivations: z.array(z.string()),
      objections: z.array(z.string()),
      beliefs: z.array(z.string()),
      previous_solutions: z.array(z.string()),
      buying_triggers: z.array(z.string()),
      relevant_benefits: z.array(z.string()),
      recommended_messaging: z.array(z.string()),
      recommended_formats: z.array(z.string()),
      awareness_stage: z.enum(AWARENESS_STAGES),
      supporting_insight_ids: z.array(z.number()),
      evidence_note: z.string(),
    }),
  ),
  limitations: z.array(z.string()),
});

type AudienceCtx = { project: CosProject; products: CosProduct[]; digest: Digest; knowledge: KnowledgePack; count: number; replace: boolean };

const AUDIENCE_SYSTEM = `You are a senior creative strategist building evidence-informed audience segments for a copywriter: the distinct groups of buyers an ad could speak to, each with its own problem, motivation and objections.

${SHARED_RULES}

Audience specifics:
- Build each segment from the customer insights and research provided. Cite the insights a segment rests on by their numbers in supporting_insight_ids (the number after #), and only numbers that appear in the material.
- Segments are defined by situation, problem and motivation, not demographics. Do not present inferred demographic details (age, gender, income) as facts; if you mention one, say it is an assumption.
- evidence_note says how well the research supports the segment and what is assumed.
- recommended_messaging gives two to four message directions in plain words; recommended_formats names ad formats that suit the segment (UGC testimonial, founder story, demo, comparison, and so on).
- Make segments genuinely distinct. If the research is thin, say so under limitations and produce fewer segments.`;

export const audienceSegments = defineModule<AudienceCtx, z.infer<typeof AudienceOut>>({
  kind: "audience_segments",
  maxOutputTokens: 12_000,
  likelyOutputTokens: [3_000, 7_000],
  depth: () => null,
  async load(projectId, options) {
    const loaded = await loadProject(projectId);
    if (!loaded) return { ok: false, error: "That project no longer exists." };
    const digest = await researchDigest(loaded.project, loaded.products);
    const knowledge =
      options.knowledge === "off"
        ? { text: "", materials: [] }
        : await knowledgePack(loaded.project.id, ["customer_research", "brief", "testimonials"], { maxChars: 12_000 });
    if (digest.insightCount === 0 && digest.productResearchCount === 0 && !knowledge.text && !loaded.project.targetAudience) {
      return { ok: false, error: "Run Voice of Customer or product research first (or add customer research to the knowledge base), so segments rest on evidence." };
    }
    const count = Math.min(6, Math.max(2, Number(options.count) || 4));
    return { ok: true, ctx: { ...loaded, digest, knowledge, count, replace: options.mode !== "add" } };
  },
  projectId: (ctx) => ctx.project.id,
  brandDomains: (ctx) => brandDomains(ctx.project, ctx.products),
  providedUrls: () => [],
  system: AUDIENCE_SYSTEM,
  user: (ctx) =>
    [
      `Build up to ${ctx.count} audience segments for this project.`,
      `<project>\n${projectBrief(ctx.project)}\n</project>`,
      ctx.products.length ? `<products>\n${ctx.products.map(productBrief).join("\n\n")}\n</products>` : null,
      ctx.digest.text ? `<research>\n${ctx.digest.text}\n</research>` : null,
      ctx.knowledge.text,
    ]
      .filter(Boolean)
      .join("\n\n"),
  materials: (ctx) => [
    { label: "Project details and products", chars: projectBrief(ctx.project).length + ctx.products.map(productBrief).join("").length },
    { label: `${ctx.digest.insightCount} customer insights`, chars: 0 },
    ...(ctx.digest.productResearchCount ? [{ label: `Product research (${ctx.digest.productResearchCount})`, chars: 0 }] : []),
    { label: "Research digest in all", chars: ctx.digest.text.length },
    ...ctx.knowledge.materials,
  ],
  schema: AudienceOut,
  async save({ ctx, output, operation }) {
    if (ctx.replace) {
      await db
        .delete(cosAudienceSegments)
        .where(and(eq(cosAudienceSegments.projectId, ctx.project.id), eq(cosAudienceSegments.edited, false), eq(cosAudienceSegments.focus, false)));
    }
    const clean = (items: string[]) => items.map((item) => item.trim()).filter(Boolean);
    const rows = output.segments
      .filter((segment) => segment.persona_name.trim())
      .map((segment, position) => ({
        projectId: ctx.project.id,
        operationId: operation.id,
        position,
        personaName: segment.persona_name.trim().slice(0, 160),
        situation: segment.situation.trim(),
        primaryProblem: segment.primary_problem.trim(),
        secondaryProblems: clean(segment.secondary_problems),
        desiredTransformation: segment.desired_transformation.trim(),
        emotionalMotivations: clean(segment.emotional_motivations),
        objections: clean(segment.objections),
        beliefs: clean(segment.beliefs),
        previousSolutions: clean(segment.previous_solutions),
        buyingTriggers: clean(segment.buying_triggers),
        relevantBenefits: clean(segment.relevant_benefits),
        recommendedMessaging: clean(segment.recommended_messaging),
        recommendedFormats: clean(segment.recommended_formats),
        awarenessStage: segment.awareness_stage,
        // Only insights that were actually in the material.
        supportingInsightIds: [...new Set(segment.supporting_insight_ids.filter((id) => ctx.digest.insightIds.has(id)))],
        evidenceNote: orNull(segment.evidence_note),
      }));
    if (rows.length) await db.insert(cosAudienceSegments).values(rows);
    await recordRun(operation, ctx.project.id, null, null, { limitations: output.limitations });
    return { added: rows.length };
  },
});

/* ------------------------------------------------------------------ */
/* Awareness and sophistication                                        */
/* ------------------------------------------------------------------ */

const STAGES_ONLY = AWARENESS_STAGES.filter((stage) => stage !== "unclear") as Exclude<(typeof AWARENESS_STAGES)[number], "unclear">[];

const AwarenessOut = z.object({
  dominant_stage: z.enum(AWARENESS_STAGES),
  dominant_reasoning: z.string(),
  sophistication_level: z.enum(SOPHISTICATION_LEVELS),
  sophistication_reasoning: z.string(),
  stages: z.array(
    z.object({
      stage: z.enum(STAGES_ONLY as [string, ...string[]]),
      customer_knowledge: z.string(),
      existing_beliefs: z.string(),
      main_barrier: z.string(),
      messaging: z.string(),
      hook_styles: z.array(z.string()),
      ad_structure: z.string(),
      proof: z.string(),
      cta: z.string(),
    }),
  ),
  limitations: z.array(z.string()),
});

export type StoredStage = {
  stage: string;
  customerKnowledge: string;
  existingBeliefs: string;
  mainBarrier: string;
  messaging: string;
  hookStyles: string[];
  adStructure: string;
  proof: string;
  cta: string;
};

type AwarenessCtx = {
  project: CosProject;
  products: CosProduct[];
  segment: CosAudienceSegment | null;
  segments: CosAudienceSegment[];
  digest: Digest;
  competitorText: string;
  competitorCount: number;
};

const AWARENESS_SYSTEM = `You are a senior direct-response strategist applying Eugene Schwartz's customer awareness stages and market sophistication levels for a copywriter. Use them as strategic tools, not rigid scientific classifications.

${SHARED_RULES}

Awareness specifics:
- Judge where most of the target market is (dominant_stage) and how sophisticated the market is (sophistication_level 1 to 5: 1 = first to market with a simple claim; 2 = bigger claims; 3 = a new mechanism is needed; 4 = an improved mechanism; 5 = the market is tired of claims and responds to identification and experience). Give the reasoning from the evidence, or "unclear" when the material does not support a call.
- For each of the five stages (unaware, problem_aware, solution_aware, product_aware, most_aware), describe what the customer knows, what they believe, the main psychological barrier, the messaging that fits, suitable hook styles, a suitable ad structure, the proof that persuades at that stage, and a fitting call to action — specific to this product and market, not generic textbook text.
- Competitor messaging, when provided, is the main evidence for market sophistication.`;

export const awarenessAnalysis = defineModule<AwarenessCtx, z.infer<typeof AwarenessOut>>({
  kind: "awareness_analysis",
  maxOutputTokens: 10_000,
  likelyOutputTokens: [2_500, 6_000],
  depth: () => null,
  async load(projectId, options) {
    const loaded = await loadProject(projectId);
    if (!loaded) return { ok: false, error: "That project no longer exists." };
    const segments = await db
      .select()
      .from(cosAudienceSegments)
      .where(eq(cosAudienceSegments.projectId, loaded.project.id))
      .orderBy(asc(cosAudienceSegments.position));
    const segmentId = Number(options.segment);
    const segment = Number.isInteger(segmentId) && segmentId > 0 ? (segments.find((item) => item.id === segmentId) ?? null) : null;
    if (options.segment && options.segment !== "all" && !segment) return { ok: false, error: "That segment no longer exists." };

    const digest = await researchDigest(loaded.project, loaded.products, 60);
    const tracked = await db
      .select({ name: cosCompetitors.name, result: cosCompetitorProfiles.result, at: cosCompetitorProfiles.createdAt })
      .from(cosCompetitorProfiles)
      .innerJoin(cosCompetitors, eq(cosCompetitors.id, cosCompetitorProfiles.competitorId))
      .where(and(eq(cosCompetitorProfiles.projectId, loaded.project.id), eq(cosCompetitors.status, "tracked")))
      .orderBy(desc(cosCompetitorProfiles.createdAt));
    const seen = new Set<string>();
    const competitorLines: string[] = [];
    for (const row of tracked) {
      if (seen.has(row.name)) continue;
      seen.add(row.name);
      const result = row.result as { overview?: string; sections?: Record<string, { text: string }[]> };
      const lines = ["advertising_messages", "marketing_angles", "value_propositions"]
        .flatMap((key) => (result.sections?.[key] ?? []).map((finding) => `- ${finding.text}`))
        .slice(0, 12);
      competitorLines.push(`${row.name}: ${result.overview ?? ""}\n${lines.join("\n")}`);
    }
    if (digest.insightCount === 0 && digest.productResearchCount === 0 && competitorLines.length === 0 && segments.length === 0) {
      return { ok: false, error: "Run some research first (Voice of Customer, product or competitor research), so the analysis rests on evidence." };
    }
    return {
      ok: true,
      ctx: {
        ...loaded,
        segment,
        segments,
        digest,
        competitorText: competitorLines.length ? `<competitor_messaging>\n${competitorLines.join("\n\n")}\n</competitor_messaging>` : "",
        competitorCount: competitorLines.length,
      },
    };
  },
  projectId: (ctx) => ctx.project.id,
  brandDomains: (ctx) => brandDomains(ctx.project, ctx.products),
  providedUrls: () => [],
  system: AWARENESS_SYSTEM,
  user: (ctx) => {
    const segmentText = (segment: CosAudienceSegment) =>
      `${segment.personaName}: ${segment.situation} Primary problem: ${segment.primaryProblem}. Wants: ${segment.desiredTransformation}. Beliefs: ${segment.beliefs.join("; ")}. Tried: ${segment.previousSolutions.join("; ")}.`;
    return [
      ctx.segment
        ? `Analyse customer awareness and market sophistication for the segment "${ctx.segment.personaName}".`
        : "Analyse customer awareness and market sophistication for this project's market.",
      `<project>\n${projectBrief(ctx.project)}\n</project>`,
      ctx.products.length ? `<products>\n${ctx.products.map(productBrief).join("\n\n")}\n</products>` : null,
      ctx.segment
        ? `<segment>\n${segmentText(ctx.segment)}\n</segment>`
        : ctx.segments.length
          ? `<segments>\n${ctx.segments.map(segmentText).join("\n")}\n</segments>`
          : null,
      ctx.digest.text ? `<research>\n${ctx.digest.text}\n</research>` : null,
      ctx.competitorText,
    ]
      .filter(Boolean)
      .join("\n\n");
  },
  materials: (ctx) => [
    { label: "Project details and products", chars: projectBrief(ctx.project).length + ctx.products.map(productBrief).join("").length },
    ctx.segment
      ? { label: `Segment: ${ctx.segment.personaName}`, chars: 0 }
      : { label: `${ctx.segments.length} audience segments`, chars: 0 },
    { label: `${ctx.digest.insightCount} customer insights and product research`, chars: ctx.digest.text.length },
    ...(ctx.competitorCount ? [{ label: `Messaging of ${ctx.competitorCount} tracked competitors`, chars: ctx.competitorText.length }] : []),
  ],
  schema: AwarenessOut,
  async save({ ctx, output, operation }) {
    const stages: StoredStage[] = STAGES_ONLY.map((stage) => {
      const found = output.stages.find((item) => item.stage === stage);
      return {
        stage,
        customerKnowledge: found?.customer_knowledge.trim() ?? "",
        existingBeliefs: found?.existing_beliefs.trim() ?? "",
        mainBarrier: found?.main_barrier.trim() ?? "",
        messaging: found?.messaging.trim() ?? "",
        hookStyles: (found?.hook_styles ?? []).map((item) => item.trim()).filter(Boolean),
        adStructure: found?.ad_structure.trim() ?? "",
        proof: found?.proof.trim() ?? "",
        cta: found?.cta.trim() ?? "",
      };
    });
    const [saved] = await db
      .insert(cosAwarenessAnalyses)
      .values({
        projectId: ctx.project.id,
        segmentId: ctx.segment?.id ?? null,
        operationId: operation.id,
        model: operation.model,
        dominantStage: output.dominant_stage,
        dominantReasoning: output.dominant_reasoning.trim(),
        sophisticationLevel: output.sophistication_level,
        sophisticationReasoning: output.sophistication_reasoning.trim(),
        stages,
        limitations: output.limitations.map((item) => item.trim()).filter(Boolean),
      })
      .returning();
    return saved;
  },
});
