import "server-only";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { cosProductResearch, cosProducts, cosProjects, type CosProduct, type CosProject } from "@/db/creative-os";

import { EVIDENCE_TYPES, PRODUCT_SECTIONS } from "../research-labels";
import {
  brandDomains,
  knowledgePack,
  productBrief,
  projectBrief,
  SHARED_RULES,
  WEB_RULES,
  type KnowledgePack,
} from "./context";
import { defineModule, depthOption, Findings, recordRun, storeFindings } from "./module";
import { markSources } from "./web";

/*
 * Product intelligence: what the product is, does and promises, and how
 * that can be sold — from the product page and the brand's site (when web
 * research is on), the product's details and the knowledge base. Facts are
 * kept apart from marketing hypotheses, and each feature is worked through
 * to the benefit, the problem it solves and an advertising message.
 */

type SectionKey = (typeof PRODUCT_SECTIONS)[number][0];

const sections = Object.fromEntries(PRODUCT_SECTIONS.map(([key]) => [key, Findings])) as Record<SectionKey, typeof Findings>;

const MatrixRow = z.object({
  feature: z.string(),
  functional_benefit: z.string(),
  emotional_benefit: z.string(),
  problem_addressed: z.string(),
  ad_message: z.string(),
  supporting_evidence: z.string(),
  evidence_type: z.enum(EVIDENCE_TYPES),
  source_urls: z.array(z.string()),
});

const ProductOut = z.object({
  summary: z.string(),
  sections: z.object(sections),
  feature_benefit_matrix: z.array(MatrixRow),
  limitations: z.array(z.string()),
});

export type StoredProductResult = {
  summary: string;
  sections: Partial<Record<SectionKey, ReturnType<typeof storeFindings>>>;
  matrix: {
    feature: string;
    functionalBenefit: string;
    emotionalBenefit: string;
    problem: string;
    adMessage: string;
    evidence: string;
    evidenceType: string;
    sources: { url: string; seen: boolean }[];
  }[];
  limitations: string[];
  web: boolean;
};

type Ctx = { project: CosProject; product: CosProduct; knowledge: KnowledgePack; web: boolean };

const SYSTEM = `You are a senior direct-response creative strategist doing product research for a copywriter. Your job is to understand the product precisely and turn it into raw material for advertising: features, benefits, mechanism, proof, positioning, objections and offers.

${SHARED_RULES}

Product research specifics:
- Separate verified product facts (stated on the product page, the brand's site or in the provided material) from marketing hypotheses (your ideas about how it could be sold). Mark hypotheses as hypothesis or recommendation.
- Never invent benefits, ingredients, specifications, results, studies, certifications or testimonials. If the product's mechanism or proof is not stated anywhere, say so under limitations and in the unique_mechanism or reasons_to_believe section as unknown.
- The feature_benefit_matrix has one row per real feature: functional benefit, emotional benefit, the customer problem it addresses, a possible advertising message, and the supporting evidence (what the source says, or "none found").
- Each section may be empty if nothing is known. Be concrete; no filler.`;

export const productResearch = defineModule<Ctx, z.infer<typeof ProductOut>>({
  kind: "product_research",
  maxOutputTokens: 16_000,
  likelyOutputTokens: [3_500, 8_000],
  depth: (options) => depthOption(options, { allowNone: true }),
  async load(targetId, options) {
    const [row] = await db
      .select({ product: cosProducts, project: cosProjects })
      .from(cosProducts)
      .innerJoin(cosProjects, eq(cosProjects.id, cosProducts.projectId))
      .where(eq(cosProducts.id, targetId))
      .limit(1);
    if (!row) return { ok: false, error: "That product no longer exists." };
    const web = depthOption(options, { allowNone: true }) !== null;
    if (!web && !row.product.description && !row.product.url) {
      return { ok: false, error: "Add a description or a product URL first, or turn web research on." };
    }
    const knowledge =
      options.knowledge === "off"
        ? { text: "", materials: [] }
        : await knowledgePack(row.project.id, ["product_docs", "specs", "landing_copy", "brief", "messaging", "testimonials"], {
            productId: row.product.id,
          });
    return { ok: true, ctx: { project: row.project, product: row.product, knowledge, web } };
  },
  projectId: (ctx) => ctx.project.id,
  brandDomains: (ctx) => brandDomains(ctx.project, [ctx.product]),
  providedUrls: (ctx) => [ctx.project.website, ctx.product.url],
  system: SYSTEM,
  user: (ctx) =>
    [
      `Research this product${ctx.web ? ", starting with its own product page and the brand's website" : " from the material below only (no web access in this run)"}.`,
      `<project>\n${projectBrief(ctx.project)}\n</project>`,
      `<product>\n${productBrief(ctx.product)}\n</product>`,
      ctx.knowledge.text,
      ctx.web ? WEB_RULES : "Answer in the required format.",
    ]
      .filter(Boolean)
      .join("\n\n"),
  materials: (ctx) => [
    { label: "Project details", chars: projectBrief(ctx.project).length },
    { label: `Product: ${ctx.product.name}`, chars: productBrief(ctx.product).length },
    ...ctx.knowledge.materials,
  ],
  schema: ProductOut,
  async save({ ctx, output, evidence, operation }) {
    const result: StoredProductResult = {
      summary: output.summary.trim(),
      sections: Object.fromEntries(
        PRODUCT_SECTIONS.map(([key]) => [key, storeFindings(evidence, output.sections[key] ?? [])]),
      ) as StoredProductResult["sections"],
      matrix: output.feature_benefit_matrix
        .filter((row) => row.feature.trim())
        .map((row) => ({
          feature: row.feature.trim(),
          functionalBenefit: row.functional_benefit.trim(),
          emotionalBenefit: row.emotional_benefit.trim(),
          problem: row.problem_addressed.trim(),
          adMessage: row.ad_message.trim(),
          evidence: row.supporting_evidence.trim(),
          evidenceType: row.evidence_type,
          sources: markSources(evidence, row.source_urls),
        })),
      limitations: output.limitations.map((item) => item.trim()).filter(Boolean),
      web: ctx.web,
    };
    const [saved] = await db
      .insert(cosProductResearch)
      .values({ projectId: ctx.project.id, productId: ctx.product.id, operationId: operation.id, model: operation.model, result })
      .returning();
    await recordRun(operation, ctx.project.id, ctx.product.id, evidence, { summary: output.summary, limitations: result.limitations });
    return saved;
  },
});
