import "server-only";

import { and, asc, count, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  cosCompetitors,
  cosCustomerInsights,
  cosProducts,
  cosProjects,
  type CosCompetitor,
  type CosProduct,
  type CosProject,
} from "@/db/creative-os";

import { CONFIDENCE, EVIDENCE_STRENGTH, VOC_CATEGORIES } from "../research-labels";
import {
  brandDomains,
  knowledgePack,
  productBrief,
  projectBrief,
  projectCountry,
  SHARED_RULES,
  WEB_RULES,
  type KnowledgePack,
} from "./context";
import { defineModule, depthOption, orNull, recordRun } from "./module";
import { checkQuote, normalizeUrl, wasSeen } from "./web";

/*
 * Voice of Customer: what real customers say, in their own words, from
 * public discussions and reviews — about the product, a competitor, or the
 * category as a whole. Each finding is stored in the project's searchable
 * bank; quotes are checked against the text of the page they came from.
 */

const VocOut = z.object({
  summary: z.string(),
  findings: z.array(
    z.object({
      category: z.enum(VOC_CATEGORIES),
      statement: z.string(),
      is_direct_quote: z.boolean(),
      interpretation: z.string(),
      source_url: z.string(),
      subject: z.string(),
      confidence: z.enum(CONFIDENCE),
      evidence_strength: z.enum(EVIDENCE_STRENGTH),
      frequency_note: z.string(),
    }),
  ),
  sources_unavailable: z.array(z.string()),
  limitations: z.array(z.string()),
});

type Ctx = {
  project: CosProject;
  products: CosProduct[];
  product: CosProduct | null;
  competitor: CosCompetitor | null;
  knowledge: KnowledgePack;
  existing: number;
};

const SYSTEM = `You are a direct-response researcher mining Voice of Customer for a copywriter. You look for the exact words real customers use about their problems, desires, doubts and experiences, because those words become hooks, headlines and scripts.

${SHARED_RULES}

Voice of Customer specifics:
- Look at accessible public sources: Reddit and forums, review sites such as Trustpilot, marketplace reviews, YouTube comments, brand-site reviews and community discussions. Use only what you can actually access.
- is_direct_quote is true only when statement is copied word for word from a page you read with web_fetch. Keep quotes short (one to three sentences) and do not tidy them up: keep the customer's spelling and phrasing. The server checks every quote against the text of the page it is attributed to.
- When you only saw a search result, or you are summarizing several people, write a paraphrase and set is_direct_quote to false.
- source_url is the exact page the statement came from. Never attribute a statement to a page you did not see.
- interpretation says what the statement means for advertising, in one sentence.
- frequency_note only when you actually observed it in what you read ("4 of the 15 reviews read mention this"); otherwise an empty string. Never estimate how common something is.
- subject names what the statement is about: the product, a competitor, or the category.
- Aim for breadth across the categories, and quality over quantity: 15 to 40 findings. List sites you could not access under sources_unavailable.`;

function focusOf(options: Record<string, string>): { productId: number | null; competitorId: number | null } {
  const [kind, raw] = (options.focus ?? "all").split(":");
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) return { productId: null, competitorId: null };
  return { productId: kind === "product" ? value : null, competitorId: kind === "competitor" ? value : null };
}

export const vocResearch = defineModule<Ctx, z.infer<typeof VocOut>>({
  kind: "voc_research",
  maxOutputTokens: 16_000,
  likelyOutputTokens: [4_000, 9_000],
  depth: (options) => depthOption(options, { allowNone: false }),
  async load(projectId, options) {
    const [project] = await db.select().from(cosProjects).where(eq(cosProjects.id, projectId)).limit(1);
    if (!project) return { ok: false, error: "That project no longer exists." };
    const products = await db.select().from(cosProducts).where(eq(cosProducts.projectId, project.id)).orderBy(asc(cosProducts.name));
    const focus = focusOf(options);
    const product = focus.productId ? (products.find((item) => item.id === focus.productId) ?? null) : null;
    const [competitor] = focus.competitorId
      ? await db
          .select()
          .from(cosCompetitors)
          .where(and(eq(cosCompetitors.id, focus.competitorId), eq(cosCompetitors.projectId, project.id)))
          .limit(1)
      : [];
    if ((focus.productId && !product) || (focus.competitorId && !competitor)) {
      return { ok: false, error: "That focus no longer exists." };
    }
    if (!project.industry && !project.brandName && products.length === 0 && !competitor) {
      return { ok: false, error: "Add the brand, industry or a product first, so the research knows what to look for." };
    }
    const knowledge =
      options.knowledge === "off"
        ? { text: "", materials: [] }
        : await knowledgePack(project.id, ["customer_research", "testimonials", "brief"], { maxChars: 12_000 });
    const [{ value }] = await db.select({ value: count() }).from(cosCustomerInsights).where(eq(cosCustomerInsights.projectId, project.id));
    return { ok: true, ctx: { project, products, product, competitor: competitor ?? null, knowledge, existing: value } };
  },
  projectId: (ctx) => ctx.project.id,
  country: (ctx) => projectCountry(ctx.project),
  brandDomains: (ctx) => brandDomains(ctx.project, ctx.products),
  providedUrls: (ctx) => [ctx.project.website, ...ctx.products.map((product) => product.url), ctx.competitor?.website ?? null],
  system: SYSTEM,
  user: (ctx) => {
    const focus = ctx.competitor
      ? `Focus on what customers say about the competitor ${ctx.competitor.name}${ctx.competitor.website ? ` (${ctx.competitor.website})` : ""} and its products.`
      : ctx.product
        ? `Focus on the product ${ctx.product.name}, its direct alternatives, and the problem it solves.`
        : "Cover the product category as a whole: the problem, the solutions people try, and the brands they mention.";
    return [
      "Research the Voice of Customer for this project.",
      focus,
      `<project>\n${projectBrief(ctx.project)}\n</project>`,
      ctx.products.length
        ? `<products>\n${(ctx.product ? [ctx.product] : ctx.products).map(productBrief).join("\n\n")}\n</products>`
        : null,
      ctx.knowledge.text,
      WEB_RULES,
    ]
      .filter(Boolean)
      .join("\n\n");
  },
  materials: (ctx) => [
    { label: "Project details", chars: projectBrief(ctx.project).length },
    ctx.competitor
      ? { label: `Focus: ${ctx.competitor.name}`, chars: 0 }
      : ctx.product
        ? { label: `Focus: ${ctx.product.name}`, chars: productBrief(ctx.product).length }
        : { label: `Products (${ctx.products.length})`, chars: ctx.products.map(productBrief).join("").length },
    ...ctx.knowledge.materials,
  ],
  schema: VocOut,
  async save({ ctx, output, evidence, sourceIds, operation }) {
    const rows = output.findings
      .filter((finding) => finding.statement.trim())
      .map((finding) => {
        const url = finding.source_url.trim();
        const seen = wasSeen(evidence, url);
        return {
          projectId: ctx.project.id,
          productId: ctx.product?.id ?? null,
          competitorId: ctx.competitor?.id ?? null,
          operationId: operation.id,
          category: finding.category,
          statement: finding.statement.trim(),
          isQuote: finding.is_direct_quote,
          quoteCheck: finding.is_direct_quote ? checkQuote(evidence, url, finding.statement) : "paraphrase",
          interpretation: orNull(finding.interpretation),
          sourceUrl: url ? url.slice(0, 1000) : null,
          sourceSeen: seen,
          sourceId: url ? (sourceIds.get(normalizeUrl(url)) ?? null) : null,
          subject: orNull(finding.subject)?.slice(0, 200) ?? null,
          confidence: finding.confidence,
          evidenceStrength: finding.evidence_strength,
          frequencyNote: orNull(finding.frequency_note),
        };
      });
    if (rows.length) await db.insert(cosCustomerInsights).values(rows);
    await recordRun(operation, ctx.project.id, ctx.product?.id ?? ctx.competitor?.id ?? null, evidence, {
      summary: output.summary,
      limitations: [
        ...output.sources_unavailable.map((site) => `Could not access: ${site}`),
        ...output.limitations,
      ],
    });
    return { added: rows.length };
  },
});
