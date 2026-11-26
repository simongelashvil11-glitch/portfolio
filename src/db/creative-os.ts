import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgSchema,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

/*
 * CreativeOS — the private creative-strategy workspace in the admin.
 *
 * Everything lives in its own Postgres schema, `creative_os`, with its own
 * migrations (drizzle.creative-os.config.ts → drizzle-creative-os/), so it can
 * never alter the portfolio's tables, and the portfolio's migration history
 * (which has hand-made drift) can never touch it. Every client-owned row hangs
 * off a project and is deleted with it.
 *
 * Phase 1: projects, products, assignments, the knowledge base, ads and their
 * deconstruction, and the ledger of authorized AI operations with the budget
 * settings and price table that govern them.
 */

export const creativeOs = pgSchema("creative_os");

/** Raw bytes, for the few small images kept (ad screenshots). */
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

/* ------------------------------------------------------------------ */
/* Workspace                                                           */
/* ------------------------------------------------------------------ */

export const cosProjects = creativeOs.table(
  "projects",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    brandName: varchar("brand_name", { length: 160 }),
    website: varchar("website", { length: 500 }),
    industry: varchar("industry", { length: 160 }),
    targetCountries: jsonb("target_countries").$type<string[]>().default([]).notNull(),
    targetLanguages: jsonb("target_languages").$type<string[]>().default([]).notNull(),
    targetAudience: text("target_audience"),
    platforms: jsonb("platforms").$type<string[]>().default([]).notNull(),
    objectives: text("objectives"),
    brandVoice: text("brand_voice"),
    clientInstructions: text("client_instructions"),
    approvedClaims: text("approved_claims"),
    prohibitedClaims: text("prohibited_claims"),
    knownCompetitors: text("known_competitors"),
    notes: text("notes"),
    /** "active" or "archived". Archived projects keep everything, out of the way. */
    status: varchar("status", { length: 16 }).default("active").notNull(),
    ...timestamps,
  },
  (t) => [index("projects_status_idx").on(t.status)],
);

export const cosProducts = creativeOs.table(
  "products",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => cosProjects.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    url: varchar("url", { length: 500 }),
    price: varchar("price", { length: 80 }),
    offer: text("offer"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [index("products_project_idx").on(t.projectId)],
);

export const cosAssignments = creativeOs.table(
  "assignments",
  {
    id: serial("id").primaryKey(),
    /** Optional: an assignment can live on its own before it has a project. */
    projectId: integer("project_id").references(() => cosProjects.id, { onDelete: "set null" }),
    client: varchar("client", { length: 200 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    instructions: text("instructions"),
    productInfo: text("product_info"),
    referenceAds: text("reference_ads"),
    deliverables: text("deliverables"),
    deadline: date("deadline"),
    evaluationCriteria: text("evaluation_criteria"),
    notes: text("notes"),
    /** open | submitted | done | archived */
    status: varchar("status", { length: 16 }).default("open").notNull(),
    ...timestamps,
  },
  (t) => [index("assignments_status_idx").on(t.status)],
);

/* ------------------------------------------------------------------ */
/* Knowledge base                                                      */
/* ------------------------------------------------------------------ */

export const KNOWLEDGE_KINDS = [
  "brand_guidelines",
  "product_docs",
  "brief",
  "script",
  "landing_copy",
  "customer_research",
  "testimonials",
  "specs",
  "messaging",
  "compliance",
  "voice",
  "ad_example",
  "note",
  "other",
] as const;

export const cosKnowledgeItems = creativeOs.table(
  "knowledge_items",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => cosProjects.id, { onDelete: "cascade" }),
    productId: integer("product_id").references(() => cosProducts.id, { onDelete: "set null" }),
    kind: varchar("kind", { length: 32 }).notNull(),
    title: varchar("title", { length: 300 }).notNull(),
    /** text | url | file */
    sourceType: varchar("source_type", { length: 8 }).notNull(),
    sourceUrl: varchar("source_url", { length: 1000 }),
    fileName: varchar("file_name", { length: 300 }),
    /** The extracted text. Original files are not kept. */
    content: text("content").notNull(),
    charCount: integer("char_count").notNull(),
    ...timestamps,
  },
  (t) => [index("knowledge_items_project_idx").on(t.projectId)],
);

/** The knowledge base split into passages, so an operation can send only the relevant ones. */
export const cosKnowledgeChunks = creativeOs.table(
  "knowledge_chunks",
  {
    id: serial("id").primaryKey(),
    itemId: integer("item_id")
      .notNull()
      .references(() => cosKnowledgeItems.id, { onDelete: "cascade" }),
    projectId: integer("project_id")
      .notNull()
      .references(() => cosProjects.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    content: text("content").notNull(),
  },
  (t) => [
    index("knowledge_chunks_item_idx").on(t.itemId),
    index("knowledge_chunks_project_idx").on(t.projectId),
    index("knowledge_chunks_search_idx").using("gin", sql`to_tsvector('simple', ${t.content})`),
  ],
);

/* ------------------------------------------------------------------ */
/* Ads and their deconstruction                                        */
/* ------------------------------------------------------------------ */

export const cosAds = creativeOs.table(
  "ads",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => cosProjects.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 300 }).notNull(),
    advertiser: varchar("advertiser", { length: 200 }),
    platform: varchar("platform", { length: 40 }),
    productCategory: varchar("product_category", { length: 160 }),
    sourceUrl: varchar("source_url", { length: 1000 }),
    format: varchar("format", { length: 60 }),
    /** The ad's written copy: primary text, headline, description. */
    adCopy: text("ad_copy"),
    /** What is said in the video, as pasted. Timestamps only if the transcript has them. */
    transcript: text("transcript"),
    notes: text("notes"),
    tags: jsonb("tags").$type<string[]>().default([]).notNull(),
    ...timestamps,
  },
  (t) => [index("ads_project_idx").on(t.projectId)],
);

export const cosAdImages = creativeOs.table(
  "ad_images",
  {
    id: serial("id").primaryKey(),
    adId: integer("ad_id")
      .notNull()
      .references(() => cosAds.id, { onDelete: "cascade" }),
    mediaType: varchar("media_type", { length: 32 }).notNull(),
    size: integer("size").notNull(),
    bytes: bytea("bytes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("ad_images_ad_idx").on(t.adId)],
);

/** One run of the Ad Deconstruction Lab. Every run is kept; the newest is shown. */
export const cosAdAnalyses = creativeOs.table(
  "ad_analyses",
  {
    id: serial("id").primaryKey(),
    adId: integer("ad_id")
      .notNull()
      .references(() => cosAds.id, { onDelete: "cascade" }),
    operationId: integer("operation_id").references(() => cosAiOperations.id, { onDelete: "set null" }),
    model: varchar("model", { length: 64 }).notNull(),
    /** The overview, checklist and limitations, as returned and validated. */
    overview: jsonb("overview").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("ad_analyses_ad_idx").on(t.adId)],
);

export const cosAdSegments = creativeOs.table(
  "ad_segments",
  {
    id: serial("id").primaryKey(),
    analysisId: integer("analysis_id")
      .notNull()
      .references(() => cosAdAnalyses.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    /** "transcript" or "copy": which text the quote comes from. */
    source: varchar("source", { length: 12 }).notNull(),
    originalText: text("original_text").notNull(),
    /** Where the quote was found in the source; null when it is not there verbatim. */
    startChar: integer("start_char"),
    endChar: integer("end_char"),
    element: varchar("element", { length: 40 }).notNull(),
    strategicPurpose: text("strategic_purpose").notNull(),
    psychologicalPrinciple: text("psychological_principle").notNull(),
    strengths: text("strengths").notNull(),
    weaknesses: text("weaknesses").notNull(),
    improvement: text("improvement").notNull(),
  },
  (t) => [index("ad_segments_analysis_idx").on(t.analysisId)],
);

/* ------------------------------------------------------------------ */
/* AI operations, budget and prices                                    */
/* ------------------------------------------------------------------ */

/**
 * Every paid Claude call, from the moment it is authorized. The idempotency
 * key makes a double click or a resent request the same operation; the
 * reserved amount counts against the budget until the real cost is known.
 */
export const cosAiOperations = creativeOs.table(
  "ai_operations",
  {
    id: serial("id").primaryKey(),
    idempotencyKey: varchar("idempotency_key", { length: 64 }).notNull(),
    kind: varchar("kind", { length: 40 }).notNull(),
    projectId: integer("project_id").references(() => cosProjects.id, { onDelete: "set null" }),
    targetType: varchar("target_type", { length: 32 }),
    targetId: integer("target_id"),
    model: varchar("model", { length: 64 }).notNull(),
    effort: varchar("effort", { length: 12 }),
    /** Caps and the exact list of materials sent, for the record. */
    params: jsonb("params").default({}).notNull(),
    /** authorized | running | completed | failed | cancelled | refused | blocked */
    status: varchar("status", { length: 16 }).notNull(),
    estimateLowUsd: doublePrecision("estimate_low_usd").notNull(),
    estimateHighUsd: doublePrecision("estimate_high_usd").notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    cacheReadTokens: integer("cache_read_tokens"),
    cacheWriteTokens: integer("cache_write_tokens"),
    webSearchRequests: integer("web_search_requests"),
    webFetchRequests: integer("web_fetch_requests"),
    /** Cost computed from the provider-reported usage and the price table. Null until known. */
    costUsd: doublePrecision("cost_usd"),
    stopReason: varchar("stop_reason", { length: 32 }),
    error: text("error"),
    authorizedAt: timestamp("authorized_at", { withTimezone: true }).defaultNow().notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("ai_operations_idempotency_idx").on(t.idempotencyKey),
    index("ai_operations_project_idx").on(t.projectId),
    index("ai_operations_authorized_idx").on(t.authorizedAt),
    index("ai_operations_target_idx").on(t.targetType, t.targetId),
  ],
);

/** Editable price table. Prices are USD per million tokens. */
export const cosPricing = creativeOs.table("pricing", {
  model: varchar("model", { length: 64 }).primaryKey(),
  label: varchar("label", { length: 80 }).notNull(),
  inputPerMtok: doublePrecision("input_per_mtok").notNull(),
  outputPerMtok: doublePrecision("output_per_mtok").notNull(),
  cacheWritePerMtok: doublePrecision("cache_write_per_mtok").notNull(),
  cacheReadPerMtok: doublePrecision("cache_read_per_mtok").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  sort: integer("sort").default(0).notNull(),
  note: text("note"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Singleton (id = 1). Limits start empty: nothing paid runs until they are set. */
export const cosSettings = creativeOs.table("settings", {
  id: integer("id").primaryKey().default(1),
  monthlyLimitUsd: doublePrecision("monthly_limit_usd"),
  perOperationLimitUsd: doublePrecision("per_operation_limit_usd"),
  webSearchPer1k: doublePrecision("web_search_per_1k").default(10).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const cosAuditLog = creativeOs.table(
  "audit_log",
  {
    id: serial("id").primaryKey(),
    at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
    action: varchar("action", { length: 60 }).notNull(),
    entity: varchar("entity", { length: 40 }).notNull(),
    entityId: integer("entity_id"),
    detail: jsonb("detail"),
  },
  (t) => [index("audit_log_at_idx").on(t.at)],
);

export type CosProject = typeof cosProjects.$inferSelect;
export type CosProduct = typeof cosProducts.$inferSelect;
export type CosAssignment = typeof cosAssignments.$inferSelect;
export type CosKnowledgeItem = typeof cosKnowledgeItems.$inferSelect;
export type CosAd = typeof cosAds.$inferSelect;
export type CosAdAnalysis = typeof cosAdAnalyses.$inferSelect;
export type CosAdSegment = typeof cosAdSegments.$inferSelect;
export type CosAiOperation = typeof cosAiOperations.$inferSelect;
export type CosPricing = typeof cosPricing.$inferSelect;
export type CosSettings = typeof cosSettings.$inferSelect;
