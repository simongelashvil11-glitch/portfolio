import "server-only";

import { and, desc, eq, inArray, notInArray } from "drizzle-orm";

import { db } from "@/db";
import {
  cosAdAnalyses,
  cosAds,
  cosAdSegments,
  cosAngles,
  cosAssignments,
  cosAudienceSegments,
  cosAwarenessAnalyses,
  cosBriefs,
  cosCompetitorProfiles,
  cosCompetitors,
  cosCustomerInsights,
  cosHooks,
  cosImagePlans,
  cosKnowledgeItems,
  cosMarketAnalyses,
  cosProductResearch,
  cosProducts,
  cosProjects,
  cosResearchRuns,
  cosScriptReviews,
  cosScripts,
  cosSources,
  cosVideoPlans,
  type ScriptSection,
} from "@/db/creative-os";

/*
 * Everything a project holds, as one CSV to hand to another AI tool (Manus,
 * ChatGPT, Claude) or open in Excel. One fact per row, in four columns:
 * section, item, field, value. Built from the database only; no AI call.
 *
 * Every table that belongs to a project is walked column by column, so new
 * columns show up here without changes. Left out on purpose: internal ids,
 * bookkeeping (timestamps, positions, the AI ledger), screenshots, expiring
 * video links and the full text of fetched web pages (their links stay).
 * Rejected and archived angles, hooks, scripts and plans are left out too.
 */

type Row = Record<string, unknown>;
export type ExportRow = [section: string, item: string, field: string, value: string];

/** Columns that never help a reader: bookkeeping, internal links, binary data. */
const SKIP = new Set([
  "id",
  "projectId",
  "operationId",
  "discoveredByOperationId",
  "sourceId",
  "createdAt",
  "updatedAt",
  "firstSeenAt",
  "accessedAt",
  "lastSeenAt",
  "edited",
  "position",
  "videoUrl",
  "charCount",
  "evidenceInsightIds",
  "supportingInsightIds",
  "model",
  "quoteCheck",
  "sourceSeen",
]);

/** Keys inside research results that only record how a source was checked. */
const SKIP_NESTED = new Set(["seen"]);

/** Ids that point at another item, shown as that item's name instead. */
type Names = Record<"product" | "segment" | "angle" | "hook" | "competitor" | "script" | "ad", Map<number, string>>;
const REFERENCES: Record<string, keyof Names> = {
  productId: "product",
  segmentId: "segment",
  angleId: "angle",
  hookId: "hook",
  competitorId: "competitor",
  scriptId: "script",
  adId: "ad",
};

/** "primaryProblem" -> "primary problem"; "opening_hook" -> "opening hook". */
function humanize(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .trim();
}

function plain(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "boolean") return value ? "yes" : "no";
  const text = String(value).trim();
  return text ? text : null;
}

/** Nested JSON as readable rows: arrays of words joined, objects and lists of objects spelled out by path. */
function flatten(field: string, value: unknown, out: Array<[string, string]>, depth = 0): void {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    if (value.length === 0) return;
    if (value.every((entry) => entry === null || typeof entry !== "object")) {
      const joined = value.map(plain).filter(Boolean).join(" | ");
      if (joined) out.push([field, joined]);
      return;
    }
    value.forEach((entry, index) => flatten(`${field} ${index + 1}`, entry, out, depth + 1));
    return;
  }
  if (typeof value === "object" && !(value instanceof Date)) {
    if (depth > 6) {
      out.push([field, JSON.stringify(value)]);
      return;
    }
    for (const [key, entry] of Object.entries(value as Row)) {
      if (SKIP_NESTED.has(key)) continue;
      flatten(field ? `${field} › ${humanize(key)}` : humanize(key), entry, out, depth + 1);
    }
    return;
  }
  const text = plain(value);
  if (text) out.push([field, text]);
}

/** One database row as [field, value] pairs, with references named and nested JSON spelled out. */
function fieldsOf(row: Row, names: Names, skip: string[] = []): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(row)) {
    if (SKIP.has(key) || skip.includes(key)) continue;
    // A mark worth knowing when it is set; "not bookmarked" says nothing.
    if ((key === "bookmarked" || key === "focus") && value !== true) continue;
    const reference = REFERENCES[key];
    if (reference) {
      const name = typeof value === "number" ? names[reference].get(value) : null;
      if (name) out.push([humanize(key.replace(/Id$/, "")), name]);
      continue;
    }
    if (key === "result" || key === "overview") {
      flatten("", value, out);
      continue;
    }
    flatten(humanize(key), value, out);
  }
  return out;
}

/** Spreadsheet programs run cells that start like a formula; web research must never do that. */
function cell(value: string): string {
  const safe = /^[=+@\t\r]/.test(value) || /^-[^\s\d]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** Every fact the project holds, in reading order, and a file name stem for it. */
export async function projectExportRows(projectId: number): Promise<{ stem: string; rows: ExportRow[] } | null> {
  const [project] = await db.select().from(cosProjects).where(eq(cosProjects.id, projectId)).limit(1);
  if (!project) return null;
  const live = <T extends { status: unknown }>(column: T) => notInArray(column.status as never, ["rejected", "archived"]);

  const [
    products,
    assignments,
    insights,
    segments,
    awareness,
    competitors,
    profiles,
    markets,
    productResearch,
    angles,
    hooks,
    scripts,
    briefs,
    videoPlans,
    imagePlans,
    ads,
    knowledge,
    sources,
    runs,
  ] = await Promise.all([
    db.select().from(cosProducts).where(eq(cosProducts.projectId, projectId)).orderBy(cosProducts.id),
    db.select().from(cosAssignments).where(eq(cosAssignments.projectId, projectId)).orderBy(cosAssignments.id),
    db.select().from(cosCustomerInsights).where(eq(cosCustomerInsights.projectId, projectId)).orderBy(cosCustomerInsights.id),
    db.select().from(cosAudienceSegments).where(eq(cosAudienceSegments.projectId, projectId)).orderBy(cosAudienceSegments.position, cosAudienceSegments.id),
    db.select().from(cosAwarenessAnalyses).where(eq(cosAwarenessAnalyses.projectId, projectId)).orderBy(desc(cosAwarenessAnalyses.createdAt)),
    db.select().from(cosCompetitors).where(eq(cosCompetitors.projectId, projectId)).orderBy(cosCompetitors.id),
    db.select().from(cosCompetitorProfiles).where(eq(cosCompetitorProfiles.projectId, projectId)).orderBy(desc(cosCompetitorProfiles.createdAt)),
    db.select().from(cosMarketAnalyses).where(eq(cosMarketAnalyses.projectId, projectId)).orderBy(desc(cosMarketAnalyses.createdAt)).limit(1),
    db.select().from(cosProductResearch).where(eq(cosProductResearch.projectId, projectId)).orderBy(desc(cosProductResearch.createdAt)),
    db.select().from(cosAngles).where(and(eq(cosAngles.projectId, projectId), live(cosAngles))).orderBy(cosAngles.id),
    db.select().from(cosHooks).where(and(eq(cosHooks.projectId, projectId), live(cosHooks))).orderBy(cosHooks.id),
    db.select().from(cosScripts).where(and(eq(cosScripts.projectId, projectId), live(cosScripts))).orderBy(cosScripts.id),
    db.select().from(cosBriefs).where(and(eq(cosBriefs.projectId, projectId), live(cosBriefs))).orderBy(cosBriefs.id),
    db.select().from(cosVideoPlans).where(and(eq(cosVideoPlans.projectId, projectId), live(cosVideoPlans))).orderBy(cosVideoPlans.id),
    db.select().from(cosImagePlans).where(and(eq(cosImagePlans.projectId, projectId), live(cosImagePlans))).orderBy(cosImagePlans.id),
    db.select().from(cosAds).where(eq(cosAds.projectId, projectId)).orderBy(cosAds.id),
    db.select().from(cosKnowledgeItems).where(eq(cosKnowledgeItems.projectId, projectId)).orderBy(cosKnowledgeItems.id),
    db
      .select({ url: cosSources.url, title: cosSources.title, domain: cosSources.domain, category: cosSources.category, published: cosSources.published, accessStatus: cosSources.accessStatus })
      .from(cosSources)
      .where(eq(cosSources.projectId, projectId))
      .orderBy(cosSources.id),
    db
      .select({ kind: cosResearchRuns.kind, model: cosResearchRuns.model, summary: cosResearchRuns.summary, limitations: cosResearchRuns.limitations, createdAt: cosResearchRuns.createdAt })
      .from(cosResearchRuns)
      .where(eq(cosResearchRuns.projectId, projectId))
      .orderBy(desc(cosResearchRuns.createdAt)),
  ]);

  // The latest analysis of each Ad Lab ad, with its segment by segment breakdown; the latest review of each script.
  const adIds = ads.map((ad) => ad.id);
  const analyses = adIds.length
    ? await db.select().from(cosAdAnalyses).where(inArray(cosAdAnalyses.adId, adIds)).orderBy(desc(cosAdAnalyses.createdAt))
    : [];
  const latestAnalysis = new Map<number, (typeof analyses)[number]>();
  for (const analysis of analyses) if (!latestAnalysis.has(analysis.adId)) latestAnalysis.set(analysis.adId, analysis);
  const analysisIds = [...latestAnalysis.values()].map((analysis) => analysis.id);
  const adSegments = analysisIds.length
    ? await db.select().from(cosAdSegments).where(inArray(cosAdSegments.analysisId, analysisIds)).orderBy(cosAdSegments.position)
    : [];
  const scriptIds = scripts.map((script) => script.id);
  const reviews = scriptIds.length
    ? await db.select().from(cosScriptReviews).where(inArray(cosScriptReviews.scriptId, scriptIds)).orderBy(desc(cosScriptReviews.createdAt))
    : [];
  const latestReview = new Map<number, (typeof reviews)[number]>();
  for (const review of reviews) if (!latestReview.has(review.scriptId)) latestReview.set(review.scriptId, review);

  const names: Names = {
    product: new Map(products.map((row) => [row.id, row.name])),
    segment: new Map(segments.map((row) => [row.id, row.personaName])),
    angle: new Map(angles.map((row) => [row.id, row.name])),
    hook: new Map(hooks.map((row) => [row.id, row.text])),
    competitor: new Map(competitors.map((row) => [row.id, row.name])),
    script: new Map(scripts.map((row) => [row.id, row.title])),
    ad: new Map(ads.map((row) => [row.id, row.title])),
  };

  const rows: ExportRow[] = [];
  const add = (section: string, item: string, fields: Array<[string, string]>) => {
    for (const [field, value] of fields) rows.push([section, item, field, value]);
  };

  const today = new Date().toISOString().slice(0, 10);
  add("About this file", "", [
    ["what it is", `Everything CreativeOS holds for the project "${project.name}", exported ${today}. One fact per row: section, item, field, value.`],
    ["how to use it", "Use it as the briefing for planning and setting up advertising for this brand: audiences, messages, offers, creatives and copy."],
    ["claims", "Only state as fact what appears under Project (approved claims) or Products (price, offer, description). Everything under Audiences, Awareness, Market, Angles and Hooks is research and hypothesis, not proven fact. Never use anything listed under prohibited claims."],
    ["customer insights", "Voice of Customer items are numbered #N. When other sections cite (#N) or 'insight #N', they mean that customer insight. 'is quote: yes' means the customer's own words."],
    ["competitors", "Competitor details, and the ads under Ad Lab (saved ads), which are mostly competitors' ads saved for study, are for understanding the market. Do not copy their wording or claims."],
  ]);

  add("Project", project.name, fieldsOf(project as Row, names, ["status"]));
  for (const product of products) add("Products", product.name, fieldsOf(product as Row, names));
  for (const assignment of assignments) add("Assignments (client briefs)", assignment.title, fieldsOf(assignment as Row, names));
  for (const research of productResearch) add("Product research", names.product.get(research.productId ?? 0) ?? "Product", fieldsOf(research as Row, names, ["productId"]));

  for (const insight of insights) add("Voice of Customer", `#${insight.id}`, fieldsOf(insight as Row, names));
  for (const segment of segments) {
    const fields = fieldsOf(segment as Row, names, ["personaName"]);
    if (segment.supportingInsightIds?.length) fields.push(["supporting insights", segment.supportingInsightIds.map((id) => `#${id}`).join(" ")]);
    add("Audiences", segment.personaName, fields);
  }
  for (const analysis of awareness) add("Awareness and sophistication", names.segment.get(analysis.segmentId ?? 0) ?? "Whole market", fieldsOf(analysis as Row, names, ["segmentId"]));

  const profileSeen = new Set<number>();
  for (const competitor of competitors) {
    add("Competitors", competitor.name, fieldsOf(competitor as Row, names));
    const profile = profiles.find((row) => row.competitorId === competitor.id);
    if (profile && !profileSeen.has(profile.id)) {
      profileSeen.add(profile.id);
      add("Competitor profiles", competitor.name, fieldsOf(profile as Row, names, ["competitorId"]));
    }
  }
  for (const market of markets) add("Market patterns", "Market", fieldsOf(market as Row, names));

  for (const angle of angles) {
    const fields = fieldsOf(angle as Row, names, ["name"]);
    if (angle.evidenceInsightIds?.length) fields.push(["evidence insights", angle.evidenceInsightIds.map((id) => `#${id}`).join(" ")]);
    add("Angles", angle.name, fields);
  }
  hooks.forEach((hook, index) => {
    const fields = fieldsOf(hook as Row, names);
    if (hook.evidenceInsightIds?.length) fields.push(["evidence insights", hook.evidenceInsightIds.map((id) => `#${id}`).join(" ")]);
    add("Hooks", `Hook ${index + 1}`, fields);
  });

  for (const script of scripts) {
    const fields = fieldsOf(script as Row, names, ["title", "working"]);
    (script.working as ScriptSection[]).forEach((section, index) => {
      if (section.text.trim()) fields.push([`copy ${index + 1}: ${section.label}`, section.text.trim()]);
      if (section.direction.trim()) fields.push([`copy ${index + 1}: ${section.label} (direction)`, section.direction.trim()]);
    });
    const review = latestReview.get(script.id);
    if (review) for (const [field, value] of fieldsOf(review as Row, names, ["scriptId", "sections"])) fields.push([`latest review › ${field}`, value]);
    add("Scripts and copy", script.title, fields);
  }
  for (const brief of briefs) add("Briefs", brief.title, fieldsOf(brief as Row, names, ["title"]));
  for (const plan of videoPlans) add("AI video plans", plan.title, fieldsOf(plan as Row, names, ["title"]));
  for (const plan of imagePlans) add("AI image plans", plan.title, fieldsOf(plan as Row, names, ["title"]));

  for (const ad of ads) {
    const fields = fieldsOf(ad as Row, names, ["title", "libraryId", "transcriptSource", "source", "tags"]);
    const analysis = latestAnalysis.get(ad.id);
    if (analysis) {
      for (const [field, value] of fieldsOf(analysis as Row, names, ["adId"])) fields.push([`analysis › ${field}`, value]);
      adSegments
        .filter((segment) => segment.analysisId === analysis.id)
        .forEach((segment, index) => {
          const parts = [
            `"${segment.originalText.trim()}"`,
            segment.strategicPurpose ? `purpose: ${segment.strategicPurpose}` : null,
            segment.psychologicalPrinciple ? `principle: ${segment.psychologicalPrinciple}` : null,
            segment.strengths ? `works: ${segment.strengths}` : null,
            segment.weaknesses ? `weak: ${segment.weaknesses}` : null,
            segment.improvement ? `improve: ${segment.improvement}` : null,
          ];
          fields.push([`analysis › segment ${index + 1} (${segment.element})`, parts.filter(Boolean).join(" — ")]);
        });
    }
    add("Ad Lab (saved ads)", ad.title, fields);
  }

  for (const item of knowledge) add("Knowledge base", item.title, fieldsOf(item as Row, names, ["title"]));
  for (const run of runs) add("Research runs", `${humanize(run.kind)} ${plain(run.createdAt)}`, fieldsOf(run as Row, names));
  // One row per source: what kind it is, then its title and address.
  sources.forEach((source, index) =>
    add("Sources", `Source ${index + 1}`, [[source.category ?? "source", [source.title, source.url].filter(Boolean).join(" — ")]]),
  );

  const slug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || `project-${project.id}`;
  return { stem: `${slug}-all-info-${today}`, rows };
}

const BYTE_ORDER_MARK = String.fromCharCode(0xfeff);

/** The rows as CSV: quoted, CRLF, with a byte-order mark so Excel reads Georgian correctly. */
export function rowsToCsv(rows: ExportRow[]): string {
  const lines = [["section", "item", "field", "value"], ...rows].map((row) => row.map(cell).join(","));
  return `${BYTE_ORDER_MARK}${lines.join("\r\n")}\r\n`;
}
