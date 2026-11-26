import "server-only";

import { and, asc, desc, eq, ne } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  cosCompetitorProfiles,
  cosCompetitors,
  cosMarketAnalyses,
  cosProductResearch,
  cosProducts,
  cosProjects,
  type CosCompetitor,
  type CosProduct,
  type CosProject,
} from "@/db/creative-os";

import { COMPETITOR_SECTIONS, EVIDENCE_TYPES } from "../research-labels";
import { brandDomains, productBrief, projectBrief, projectCountry, SHARED_RULES, WEB_RULES } from "./context";
import { defineModule, depthOption, Findings, recordRun, storeFindings } from "./module";
import type { StoredProductResult } from "./product";
import { markSources, normalizeUrl, wasSeen } from "./web";

/*
 * Competitor intelligence: finding rivals ("Find my rivals"), profiling one
 * competitor from its public pages, and reading the patterns across all the
 * tracked ones. Ads themselves are not scraped: each competitor gets a link
 * to its Meta Ad Library results, opened by the owner.
 */

async function loadProject(projectId: number) {
  const [project] = await db.select().from(cosProjects).where(eq(cosProjects.id, projectId)).limit(1);
  if (!project) return null;
  const products = await db.select().from(cosProducts).where(eq(cosProducts.projectId, project.id)).orderBy(asc(cosProducts.name));
  return { project, products };
}

function hostOf(raw: string | null | undefined): string | null {
  try {
    return raw ? new URL(raw).hostname.toLowerCase().replace(/^www\./, "") : null;
  } catch {
    return null;
  }
}

/** A link from research, kept only when it is a web address. */
function cleanUrl(raw: string): string | null {
  const value = raw.trim();
  if (!/^https?:\/\//i.test(value)) return null;
  try {
    return new URL(value).toString().slice(0, 500);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Find my rivals                                                      */
/* ------------------------------------------------------------------ */

const DiscoveryOut = z.object({
  summary: z.string(),
  competitors: z.array(
    z.object({
      name: z.string(),
      website: z.string(),
      kind: z.enum(["direct", "indirect", "alternative"]),
      why_competitor: z.string(),
      overlap: z.string(),
      facebook_url: z.string(),
      instagram_url: z.string(),
      tiktok_url: z.string(),
      source_urls: z.array(z.string()),
    }),
  ),
  limitations: z.array(z.string()),
});

type DiscoveryCtx = { project: CosProject; products: CosProduct[]; existing: CosCompetitor[]; count: number };

const DISCOVERY_SYSTEM = `You are a competitive-intelligence researcher helping a copywriter find the brands competing for the same customers.

${SHARED_RULES}

Discovery specifics:
- Find real companies that sell to the same customers in the target countries: direct competitors (same kind of product), indirect competitors (different product, same problem) and alternative solutions (what people do instead).
- Only list a company you found evidence of in this research. website must be its real homepage as seen in your results; leave social links empty unless you saw them.
- why_competitor and overlap explain in one sentence each why it competes and where it overlaps (product, audience, price point, claim).
- Do not repeat competitors already listed as known. Do not guess at revenue, ad spend or performance.`;

export const competitorDiscovery = defineModule<DiscoveryCtx, z.infer<typeof DiscoveryOut>>({
  kind: "competitor_discovery",
  maxOutputTokens: 10_000,
  likelyOutputTokens: [1_500, 4_000],
  depth: (options) => depthOption(options, { allowNone: false }),
  async load(projectId, options) {
    const loaded = await loadProject(projectId);
    if (!loaded) return { ok: false, error: "That project no longer exists." };
    if (!loaded.project.industry && loaded.products.length === 0 && !loaded.project.brandName) {
      return { ok: false, error: "Add the industry or a product first, so the search knows the market." };
    }
    const existing = await db.select().from(cosCompetitors).where(eq(cosCompetitors.projectId, loaded.project.id));
    const count = [5, 8, 12].includes(Number(options.count)) ? Number(options.count) : 8;
    return { ok: true, ctx: { ...loaded, existing, count } };
  },
  projectId: (ctx) => ctx.project.id,
  country: (ctx) => projectCountry(ctx.project),
  brandDomains: (ctx) => brandDomains(ctx.project, ctx.products),
  providedUrls: (ctx) => [ctx.project.website, ...ctx.products.map((product) => product.url)],
  system: DISCOVERY_SYSTEM,
  user: (ctx) =>
    [
      `Find up to ${ctx.count} competitors for this project${ctx.project.targetCountries.length ? ` in ${ctx.project.targetCountries.join(", ")}` : ""}.`,
      `<project>\n${projectBrief(ctx.project)}\n</project>`,
      ctx.products.length ? `<products>\n${ctx.products.map(productBrief).join("\n\n")}\n</products>` : null,
      ctx.existing.length
        ? `<already_known>\n${ctx.existing.map((item) => `${item.name}${item.website ? ` (${item.website})` : ""}`).join("\n")}\n</already_known>`
        : null,
      WEB_RULES,
    ]
      .filter(Boolean)
      .join("\n\n"),
  materials: (ctx) => [
    { label: "Project details and products", chars: projectBrief(ctx.project).length + ctx.products.map(productBrief).join("").length },
    ...(ctx.existing.length ? [{ label: `${ctx.existing.length} competitors you already have, to skip`, chars: 0 }] : []),
  ],
  schema: DiscoveryOut,
  async save({ ctx, output, evidence, operation }) {
    const knownNames = new Set(ctx.existing.map((item) => item.name.trim().toLowerCase()));
    const knownHosts = new Set(ctx.existing.map((item) => hostOf(item.website)).filter(Boolean));
    const ownHosts = new Set(brandDomains(ctx.project, ctx.products));
    const rows = [];
    for (const item of output.competitors) {
      const name = item.name.trim();
      const website = cleanUrl(item.website);
      const host = hostOf(website);
      if (!name || knownNames.has(name.toLowerCase()) || (host && (knownHosts.has(host) || ownHosts.has(host)))) continue;
      knownNames.add(name.toLowerCase());
      if (host) knownHosts.add(host);
      rows.push({
        projectId: ctx.project.id,
        name: name.slice(0, 200),
        website,
        facebookUrl: cleanUrl(item.facebook_url),
        instagramUrl: cleanUrl(item.instagram_url),
        tiktokUrl: cleanUrl(item.tiktok_url),
        kind: item.kind,
        status: "suggested",
        discovery: {
          why: item.why_competitor.trim(),
          overlap: item.overlap.trim(),
          websiteSeen: website ? wasSeen(evidence, website) : false,
          sources: markSources(evidence, item.source_urls),
        },
        discoveredByOperationId: operation.id,
      });
    }
    if (rows.length) await db.insert(cosCompetitors).values(rows);
    await recordRun(operation, ctx.project.id, null, evidence, { summary: output.summary, limitations: output.limitations });
    return { added: rows.length };
  },
});

/* ------------------------------------------------------------------ */
/* One competitor's profile                                            */
/* ------------------------------------------------------------------ */

type SectionKey = (typeof COMPETITOR_SECTIONS)[number][0];
const sections = Object.fromEntries(COMPETITOR_SECTIONS.map(([key]) => [key, Findings])) as Record<SectionKey, typeof Findings>;

const ProfileOut = z.object({
  overview: z.string(),
  website: z.string(),
  facebook_url: z.string(),
  instagram_url: z.string(),
  tiktok_url: z.string(),
  sections: z.object(sections),
  limitations: z.array(z.string()),
});

export type StoredCompetitorProfile = {
  overview: string;
  sections: Partial<Record<SectionKey, ReturnType<typeof storeFindings>>>;
  limitations: string[];
};

type ProfileCtx = { project: CosProject; products: CosProduct[]; competitor: CosCompetitor };

const PROFILE_SYSTEM = `You are a competitive-intelligence researcher profiling one competitor for a copywriter: what it sells, to whom, how it positions itself and how it advertises.

${SHARED_RULES}

Profile specifics:
- Start with the competitor's own website: the homepage, a main product page, pricing or offers. Then look for public reviews and public ad messaging (landing pages, social profiles, press).
- Pricing and offers only as stated on a page you saw, with its source. If not found, say "not found" as unknown.
- advertising_messages and marketing_angles come from what the competitor actually says publicly; label your own reading as ai_interpretation.
- weaknesses and differentiation_opportunities are where this project could win: label them hypothesis or recommendation, and ground them in what you found.
- Never invent advertising spend, ROAS, CPA, revenue, conversion rates or customer counts.
- website and the social links are the addresses you actually saw, or empty strings.`;

export const competitorResearch = defineModule<ProfileCtx, z.infer<typeof ProfileOut>>({
  kind: "competitor_research",
  maxOutputTokens: 14_000,
  likelyOutputTokens: [3_000, 7_000],
  depth: (options) => depthOption(options, { allowNone: false }),
  async load(competitorId) {
    const [competitor] = await db.select().from(cosCompetitors).where(eq(cosCompetitors.id, competitorId)).limit(1);
    if (!competitor) return { ok: false, error: "That competitor no longer exists." };
    const loaded = await loadProject(competitor.projectId);
    if (!loaded) return { ok: false, error: "That project no longer exists." };
    return { ok: true, ctx: { ...loaded, competitor } };
  },
  projectId: (ctx) => ctx.project.id,
  country: (ctx) => projectCountry(ctx.project),
  brandDomains: (ctx) => brandDomains(ctx.project, ctx.products),
  providedUrls: (ctx) => [ctx.competitor.website, ctx.competitor.facebookUrl, ctx.competitor.instagramUrl, ctx.competitor.tiktokUrl],
  system: PROFILE_SYSTEM,
  user: (ctx) =>
    [
      `Profile the competitor ${ctx.competitor.name}.`,
      `<competitor>\nName: ${ctx.competitor.name}\n${ctx.competitor.website ? `Website: ${ctx.competitor.website}\n` : ""}${
        ctx.competitor.notes ? `Notes: ${ctx.competitor.notes}\n` : ""
      }</competitor>`,
      `For context, this is the project the copywriter works for (compare against it, but research the competitor):\n<project>\n${projectBrief(ctx.project)}\n</project>`,
      ctx.products.length ? `<products>\n${ctx.products.map(productBrief).join("\n\n")}\n</products>` : null,
      WEB_RULES,
    ]
      .filter(Boolean)
      .join("\n\n"),
  materials: (ctx) => [
    { label: `Competitor: ${ctx.competitor.name}${ctx.competitor.website ? ` (${ctx.competitor.website})` : ""}`, chars: 0 },
    { label: "Your project details and products, for comparison", chars: projectBrief(ctx.project).length + ctx.products.map(productBrief).join("").length },
  ],
  schema: ProfileOut,
  async save({ ctx, output, evidence, operation }) {
    const result: StoredCompetitorProfile = {
      overview: output.overview.trim(),
      sections: Object.fromEntries(
        COMPETITOR_SECTIONS.map(([key]) => [key, storeFindings(evidence, output.sections[key] ?? [])]),
      ) as StoredCompetitorProfile["sections"],
      limitations: output.limitations.map((item) => item.trim()).filter(Boolean),
    };
    const [saved] = await db
      .insert(cosCompetitorProfiles)
      .values({ competitorId: ctx.competitor.id, projectId: ctx.project.id, operationId: operation.id, model: operation.model, result })
      .returning();

    // Fill in links the owner has not set, but only with addresses the research actually saw.
    const seenLink = (raw: string) => {
      const value = cleanUrl(raw);
      return value && evidence && (evidence.searched.has(normalizeUrl(value)) || evidence.read.has(normalizeUrl(value))) ? value : null;
    };
    const fill = {
      website: ctx.competitor.website ?? seenLink(output.website),
      facebookUrl: ctx.competitor.facebookUrl ?? seenLink(output.facebook_url),
      instagramUrl: ctx.competitor.instagramUrl ?? seenLink(output.instagram_url),
      tiktokUrl: ctx.competitor.tiktokUrl ?? seenLink(output.tiktok_url),
    };
    await db.update(cosCompetitors).set({ ...fill, updatedAt: new Date() }).where(eq(cosCompetitors.id, ctx.competitor.id));
    await recordRun(operation, ctx.project.id, ctx.competitor.id, evidence, { summary: output.overview, limitations: result.limitations });
    return saved;
  },
});

/* ------------------------------------------------------------------ */
/* Patterns across competitors                                         */
/* ------------------------------------------------------------------ */

const MarketOut = z.object({
  summary: z.string(),
  messaging_patterns: z.array(z.object({ pattern: z.string(), competitors: z.array(z.string()), evidence: z.string() })),
  saturated_angles: z.array(z.object({ angle: z.string(), competitors: z.array(z.string()), why_saturated: z.string() })),
  market_gaps: z.array(z.object({ gap: z.string(), evidence: z.string(), evidence_type: z.enum(EVIDENCE_TYPES) })),
  differentiation_opportunities: z.array(
    z.object({ opportunity: z.string(), rationale: z.string(), evidence_type: z.enum(EVIDENCE_TYPES) }),
  ),
  limitations: z.array(z.string()),
});

export type StoredMarketAnalysis = z.infer<typeof MarketOut>;

type MarketCtx = { project: CosProject; products: CosProduct[]; profilesText: string; profileCount: number; ownText: string };

const MARKET_SYSTEM = `You are a senior creative strategist reading a set of competitor profiles to find where a brand can stand out.

${SHARED_RULES}

Market specifics:
- messaging_patterns: claims, promises and themes several competitors share, naming which ones.
- saturated_angles: angles so common they no longer differentiate, and why.
- market_gaps: needs, objections or audiences nobody is addressing well, with the evidence from the profiles.
- differentiation_opportunities: concrete positions this project could take, grounded in its own product facts where given. These are hypotheses and recommendations, labelled as such.
- Work only from the profiles and project material provided. If there are too few profiles to see patterns, say so under limitations.`;

export const marketPatterns = defineModule<MarketCtx, StoredMarketAnalysis>({
  kind: "market_patterns",
  maxOutputTokens: 10_000,
  likelyOutputTokens: [2_000, 5_000],
  depth: () => null,
  async load(projectId) {
    const loaded = await loadProject(projectId);
    if (!loaded) return { ok: false, error: "That project no longer exists." };
    const rows = await db
      .select({ name: cosCompetitors.name, competitorId: cosCompetitors.id, result: cosCompetitorProfiles.result })
      .from(cosCompetitorProfiles)
      .innerJoin(cosCompetitors, eq(cosCompetitors.id, cosCompetitorProfiles.competitorId))
      .where(and(eq(cosCompetitorProfiles.projectId, loaded.project.id), ne(cosCompetitors.status, "dismissed")))
      .orderBy(desc(cosCompetitorProfiles.createdAt));
    const latest = new Map<number, { name: string; result: StoredCompetitorProfile }>();
    for (const row of rows) if (!latest.has(row.competitorId)) latest.set(row.competitorId, { name: row.name, result: row.result as StoredCompetitorProfile });
    if (latest.size < 2) return { ok: false, error: "Research at least two competitors first, so there are patterns to compare." };

    const profilesText = [...latest.values()]
      .map(({ name, result }) => {
        const body = COMPETITOR_SECTIONS.map(([key, label]) => {
          const items = (result.sections[key] ?? []).map((finding) => `  - ${finding.text}`).join("\n");
          return items ? `${label}:\n${items}` : null;
        })
          .filter(Boolean)
          .join("\n");
        return `<competitor name="${name.replace(/"/g, "'")}">\n${result.overview}\n${body}\n</competitor>`;
      })
      .join("\n\n");

    const research = loaded.products.length
      ? await db
          .select()
          .from(cosProductResearch)
          .where(eq(cosProductResearch.projectId, loaded.project.id))
          .orderBy(desc(cosProductResearch.createdAt))
      : [];
    const own = new Map<number, StoredProductResult>();
    for (const row of research) if (!own.has(row.productId)) own.set(row.productId, row.result as StoredProductResult);
    const ownText = [...own.entries()]
      .map(([productId, result]) => {
        const name = loaded.products.find((product) => product.id === productId)?.name ?? "Product";
        const pick = (key: keyof StoredProductResult["sections"]) => (result.sections[key] ?? []).map((finding) => `  - ${finding.text}`).join("\n");
        return `${name}: ${result.summary}\nUSPs:\n${pick("usps")}\nMechanism:\n${pick("unique_mechanism")}\nPositioning:\n${pick("positioning")}`;
      })
      .join("\n\n");

    return { ok: true, ctx: { ...loaded, profilesText, profileCount: latest.size, ownText } };
  },
  projectId: (ctx) => ctx.project.id,
  country: (ctx) => projectCountry(ctx.project),
  brandDomains: (ctx) => brandDomains(ctx.project, ctx.products),
  providedUrls: () => [],
  system: MARKET_SYSTEM,
  user: (ctx) =>
    [
      "Find the messaging patterns, saturated angles, market gaps and differentiation opportunities across these competitors.",
      `<project>\n${projectBrief(ctx.project)}\n</project>`,
      ctx.products.length ? `<products>\n${ctx.products.map(productBrief).join("\n\n")}\n</products>` : null,
      ctx.ownText ? `<own_product_research>\n${ctx.ownText}\n</own_product_research>` : null,
      `<competitor_profiles>\n${ctx.profilesText}\n</competitor_profiles>`,
    ]
      .filter(Boolean)
      .join("\n\n"),
  materials: (ctx) => [
    { label: "Project details and products", chars: projectBrief(ctx.project).length + ctx.products.map(productBrief).join("").length },
    { label: `Latest profiles of ${ctx.profileCount} competitors`, chars: ctx.profilesText.length },
    ...(ctx.ownText ? [{ label: "Your product research", chars: ctx.ownText.length }] : []),
  ],
  schema: MarketOut,
  async save({ ctx, output, operation }) {
    const [saved] = await db
      .insert(cosMarketAnalyses)
      .values({ projectId: ctx.project.id, operationId: operation.id, model: operation.model, result: output })
      .returning();
    await recordRun(operation, ctx.project.id, null, null, { summary: output.summary, limitations: output.limitations });
    return saved;
  },
});

