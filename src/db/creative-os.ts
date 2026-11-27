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
    /* Phase 3: ads saved from the Meta Ad Library by the Chrome extension. */
    /** manual | extension */
    source: varchar("source", { length: 16 }).default("manual").notNull(),
    competitorId: integer("competitor_id").references(() => cosCompetitors.id, { onDelete: "set null" }),
    /** The Ad Library's own id for the ad; saving the same ad again updates it. */
    libraryId: varchar("library_id", { length: 40 }),
    /** "Started running on", as the Ad Library shows it. */
    startedRunning: date("started_running"),
    /** The end of the date range the Ad Library shows for an ad that stopped. */
    stoppedRunning: date("stopped_running"),
    /** When the ad was last seen in the Ad Library, and whether it was still running then. */
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    stillActive: boolean("still_active"),
    /** "N ads use this creative and text". */
    variations: integer("variations"),
    headline: text("headline"),
    cta: varchar("cta", { length: 60 }),
    landingUrl: varchar("landing_url", { length: 1000 }),
    /** image | video | carousel | text */
    mediaKind: varchar("media_kind", { length: 12 }),
    /** The video file's address on Facebook's CDN, as the page had it. Signed links expire after some days. */
    videoUrl: varchar("video_url", { length: 2000 }),
    /** The video's length as the page reported it, used to price a transcript before making it. */
    videoSeconds: doublePrecision("video_seconds"),
    /** manual (pasted) | scribe (transcribed automatically) */
    transcriptSource: varchar("transcript_source", { length: 12 }),
    ...timestamps,
  },
  (t) => [
    index("ads_project_idx").on(t.projectId),
    uniqueIndex("ads_project_library_idx").on(t.projectId, t.libraryId),
    index("ads_competitor_idx").on(t.competitorId),
  ],
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
  /** SHA-256 of the Chrome extension's connection code; the code itself is shown once and never stored. */
  captureTokenHash: varchar("capture_token_hash", { length: 64 }),
  captureTokenCreatedAt: timestamp("capture_token_created_at", { withTimezone: true }),
  captureTokenUsedAt: timestamp("capture_token_used_at", { withTimezone: true }),
  /** Transcribe video ads as soon as the extension saves them (still within the spending limits). */
  autoTranscribe: boolean("auto_transcribe").default(false).notNull(),
  /** ElevenLabs Scribe batch price, USD per hour of audio. */
  transcriptionPerHour: doublePrecision("transcription_per_hour").default(0.2).notNull(),
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

/* ------------------------------------------------------------------ */
/* Phase 2 — research                                                  */
/* ------------------------------------------------------------------ */

/**
 * A finding as stored inside a research result: the claim, what kind of
 * evidence it is, and each source it gave, marked by whether that address
 * was actually returned by a search or read during the same call (`seen`).
 */
export type StoredFinding = {
  text: string;
  evidenceType: string;
  sources: { url: string; seen: boolean }[];
};

/**
 * Every web page a research call searched up or read, per project. One row
 * per address; a later call that reads it again refreshes it. The text of a
 * page that was read is kept (capped), so quotes can be checked against it.
 */
export const cosSources = creativeOs.table(
  "sources",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => cosProjects.id, { onDelete: "cascade" }),
    url: varchar("url", { length: 1000 }).notNull(),
    domain: varchar("domain", { length: 255 }).notNull(),
    title: varchar("title", { length: 500 }),
    /** forum | review_site | marketplace | video | social | news | brand_site | website */
    category: varchar("category", { length: 24 }).notNull(),
    /** read | search_result | failed */
    accessStatus: varchar("access_status", { length: 16 }).notNull(),
    accessError: varchar("access_error", { length: 64 }),
    /** The page's own date as the search reported it, when it did ("3 weeks ago", "2025-04-02"). */
    published: varchar("published", { length: 80 }),
    /** The text read from the page, capped; null when it was only a search result. */
    content: text("content"),
    operationId: integer("operation_id").references(() => cosAiOperations.id, { onDelete: "set null" }),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).defaultNow().notNull(),
    accessedAt: timestamp("accessed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("sources_project_url_idx").on(t.projectId, t.url), index("sources_project_idx").on(t.projectId)],
);

/**
 * What a research run said about itself: its summary, the searches it ran
 * and its limitations (sites it could not read, information that was not
 * available). One row per completed run, whatever the module.
 */
export const cosResearchRuns = creativeOs.table(
  "research_runs",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => cosProjects.id, { onDelete: "cascade" }),
    operationId: integer("operation_id").references(() => cosAiOperations.id, { onDelete: "set null" }),
    kind: varchar("kind", { length: 40 }).notNull(),
    targetId: integer("target_id"),
    model: varchar("model", { length: 64 }).notNull(),
    summary: text("summary"),
    queries: jsonb("queries").$type<string[]>().default([]).notNull(),
    limitations: jsonb("limitations").$type<string[]>().default([]).notNull(),
    /** Pages read, search results and failures, counted. */
    sourceCounts: jsonb("source_counts").$type<{ read: number; searched: number; failed: number }>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("research_runs_project_kind_idx").on(t.projectId, t.kind)],
);

/** One product-research run. Every run is kept; the newest is shown. */
export const cosProductResearch = creativeOs.table(
  "product_research",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => cosProjects.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => cosProducts.id, { onDelete: "cascade" }),
    operationId: integer("operation_id").references(() => cosAiOperations.id, { onDelete: "set null" }),
    model: varchar("model", { length: 64 }).notNull(),
    /** { summary, sections: Record<section, StoredFinding[]>, matrix: [...], limitations: string[] } */
    result: jsonb("result").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("product_research_product_idx").on(t.productId)],
);

/**
 * The Voice of Customer bank: one row per finding, from research or added
 * by hand. A quote is only marked verified when its words were found in the
 * text of the page it is attributed to, read during the same call.
 */
export const cosCustomerInsights = creativeOs.table(
  "customer_insights",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => cosProjects.id, { onDelete: "cascade" }),
    productId: integer("product_id").references(() => cosProducts.id, { onDelete: "set null" }),
    competitorId: integer("competitor_id").references(() => cosCompetitors.id, { onDelete: "set null" }),
    /** Null for insights added by hand. */
    operationId: integer("operation_id").references(() => cosAiOperations.id, { onDelete: "set null" }),
    category: varchar("category", { length: 32 }).notNull(),
    statement: text("statement").notNull(),
    isQuote: boolean("is_quote").default(false).notNull(),
    /** found | not_found | no_page (the page was not read, so it could not be checked) | manual */
    quoteCheck: varchar("quote_check", { length: 12 }).notNull(),
    interpretation: text("interpretation"),
    sourceUrl: varchar("source_url", { length: 1000 }),
    /** Whether the source address came back from a search or read in the same call. */
    sourceSeen: boolean("source_seen").default(false).notNull(),
    sourceId: integer("source_id").references(() => cosSources.id, { onDelete: "set null" }),
    /** The product, competitor or category the statement is about, as named. */
    subject: varchar("subject", { length: 200 }),
    /** low | medium | high */
    confidence: varchar("confidence", { length: 8 }).notNull(),
    /** weak | moderate | strong */
    evidenceStrength: varchar("evidence_strength", { length: 10 }).notNull(),
    /** Only when it was actually observable ("in 4 of the 12 reviews read"); never estimated. */
    frequencyNote: text("frequency_note"),
    bookmarked: boolean("bookmarked").default(false).notNull(),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("customer_insights_project_idx").on(t.projectId),
    index("customer_insights_search_idx").using(
      "gin",
      sql`to_tsvector('simple', coalesce(${t.statement}, '') || ' ' || coalesce(${t.interpretation}, ''))`,
    ),
  ],
);

/** Audience segments: generated from the research, then edited freely. */
export const cosAudienceSegments = creativeOs.table(
  "audience_segments",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => cosProjects.id, { onDelete: "cascade" }),
    operationId: integer("operation_id").references(() => cosAiOperations.id, { onDelete: "set null" }),
    position: integer("position").default(0).notNull(),
    personaName: varchar("persona_name", { length: 160 }).notNull(),
    situation: text("situation").notNull(),
    primaryProblem: text("primary_problem").notNull(),
    secondaryProblems: jsonb("secondary_problems").$type<string[]>().default([]).notNull(),
    desiredTransformation: text("desired_transformation").notNull(),
    emotionalMotivations: jsonb("emotional_motivations").$type<string[]>().default([]).notNull(),
    objections: jsonb("objections").$type<string[]>().default([]).notNull(),
    beliefs: jsonb("beliefs").$type<string[]>().default([]).notNull(),
    previousSolutions: jsonb("previous_solutions").$type<string[]>().default([]).notNull(),
    buyingTriggers: jsonb("buying_triggers").$type<string[]>().default([]).notNull(),
    relevantBenefits: jsonb("relevant_benefits").$type<string[]>().default([]).notNull(),
    recommendedMessaging: jsonb("recommended_messaging").$type<string[]>().default([]).notNull(),
    recommendedFormats: jsonb("recommended_formats").$type<string[]>().default([]).notNull(),
    awarenessStage: varchar("awareness_stage", { length: 20 }).default("unclear").notNull(),
    /** Ids of the customer insights the segment rests on. */
    supportingInsightIds: jsonb("supporting_insight_ids").$type<number[]>().default([]).notNull(),
    evidenceNote: text("evidence_note"),
    /** The segment chosen for developing concepts. */
    focus: boolean("focus").default(false).notNull(),
    edited: boolean("edited").default(false).notNull(),
    ...timestamps,
  },
  (t) => [index("audience_segments_project_idx").on(t.projectId)],
);

/** Awareness and sophistication analyses; the newest is shown and can be adjusted by hand. */
export const cosAwarenessAnalyses = creativeOs.table(
  "awareness_analyses",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => cosProjects.id, { onDelete: "cascade" }),
    segmentId: integer("segment_id").references(() => cosAudienceSegments.id, { onDelete: "set null" }),
    operationId: integer("operation_id").references(() => cosAiOperations.id, { onDelete: "set null" }),
    model: varchar("model", { length: 64 }).notNull(),
    dominantStage: varchar("dominant_stage", { length: 20 }).notNull(),
    dominantReasoning: text("dominant_reasoning").notNull(),
    sophisticationLevel: varchar("sophistication_level", { length: 8 }).notNull(),
    sophisticationReasoning: text("sophistication_reasoning").notNull(),
    /** One entry per stage: knowledge, beliefs, barrier, messaging, hooks, structure, proof, CTA. */
    stages: jsonb("stages").notNull(),
    limitations: jsonb("limitations").$type<string[]>().default([]).notNull(),
    edited: boolean("edited").default(false).notNull(),
    ...timestamps,
  },
  (t) => [index("awareness_analyses_project_idx").on(t.projectId)],
);

/** Competitors, added by hand or suggested by "Find my rivals" until accepted. */
export const cosCompetitors = creativeOs.table(
  "competitors",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => cosProjects.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    website: varchar("website", { length: 500 }),
    facebookUrl: varchar("facebook_url", { length: 500 }),
    instagramUrl: varchar("instagram_url", { length: 500 }),
    tiktokUrl: varchar("tiktok_url", { length: 500 }),
    /** direct | indirect | alternative */
    kind: varchar("kind", { length: 12 }).default("direct").notNull(),
    /** tracked | suggested | dismissed */
    status: varchar("status", { length: 12 }).default("tracked").notNull(),
    /** Why discovery suggested it, with its sources. */
    discovery: jsonb("discovery"),
    discoveredByOperationId: integer("discovered_by_operation_id").references(() => cosAiOperations.id, { onDelete: "set null" }),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [index("competitors_project_idx").on(t.projectId)],
);

/** One competitor-research run. Every run is kept; the newest is shown. */
export const cosCompetitorProfiles = creativeOs.table(
  "competitor_profiles",
  {
    id: serial("id").primaryKey(),
    competitorId: integer("competitor_id")
      .notNull()
      .references(() => cosCompetitors.id, { onDelete: "cascade" }),
    projectId: integer("project_id")
      .notNull()
      .references(() => cosProjects.id, { onDelete: "cascade" }),
    operationId: integer("operation_id").references(() => cosAiOperations.id, { onDelete: "set null" }),
    model: varchar("model", { length: 64 }).notNull(),
    /** { overview, sections: Record<section, StoredFinding[]>, limitations } */
    result: jsonb("result").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("competitor_profiles_competitor_idx").on(t.competitorId)],
);

/** Messaging patterns, saturated angles and gaps across the tracked competitors. */
export const cosMarketAnalyses = creativeOs.table(
  "market_analyses",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => cosProjects.id, { onDelete: "cascade" }),
    operationId: integer("operation_id").references(() => cosAiOperations.id, { onDelete: "set null" }),
    model: varchar("model", { length: 64 }).notNull(),
    result: jsonb("result").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("market_analyses_project_idx").on(t.projectId)],
);

/* ------------------------------------------------------------------ */
/* Phase 4 — creative strategy and copywriting                         */
/* ------------------------------------------------------------------ */

/** Marketing angles: generated from the research or written by hand, then prioritised, approved or rejected. */
export const cosAngles = creativeOs.table(
  "angles",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => cosProjects.id, { onDelete: "cascade" }),
    operationId: integer("operation_id").references(() => cosAiOperations.id, { onDelete: "set null" }),
    productId: integer("product_id").references(() => cosProducts.id, { onDelete: "set null" }),
    segmentId: integer("segment_id").references(() => cosAudienceSegments.id, { onDelete: "set null" }),
    name: varchar("name", { length: 200 }).notNull(),
    category: varchar("category", { length: 32 }).notNull(),
    hypothesis: text("hypothesis").notNull(),
    audience: text("audience"),
    awarenessStage: varchar("awareness_stage", { length: 20 }).default("unclear").notNull(),
    painPoint: text("pain_point"),
    desire: text("desire"),
    motivation: text("motivation"),
    coreMessage: text("core_message").notNull(),
    productBenefit: text("product_benefit"),
    customerEvidence: text("customer_evidence"),
    evidenceInsightIds: jsonb("evidence_insight_ids").$type<number[]>().default([]).notNull(),
    recommendedFormat: text("recommended_format"),
    potentialHooks: jsonb("potential_hooks").$type<string[]>().default([]).notNull(),
    proofRequirements: text("proof_requirements"),
    weaknesses: text("weaknesses"),
    testingRecommendation: text("testing_recommendation"),
    /** idea | prioritized | approved | rejected | archived */
    status: varchar("status", { length: 12 }).default("idea").notNull(),
    notes: text("notes"),
    edited: boolean("edited").default(false).notNull(),
    ...timestamps,
  },
  (t) => [index("angles_project_idx").on(t.projectId)],
);

/** The hook library. */
export const cosHooks = creativeOs.table(
  "hooks",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => cosProjects.id, { onDelete: "cascade" }),
    operationId: integer("operation_id").references(() => cosAiOperations.id, { onDelete: "set null" }),
    angleId: integer("angle_id").references(() => cosAngles.id, { onDelete: "set null" }),
    segmentId: integer("segment_id").references(() => cosAudienceSegments.id, { onDelete: "set null" }),
    productId: integer("product_id").references(() => cosProducts.id, { onDelete: "set null" }),
    text: text("text").notNull(),
    category: varchar("category", { length: 24 }).notNull(),
    awarenessStage: varchar("awareness_stage", { length: 20 }).default("unclear").notNull(),
    trigger: text("trigger"),
    supportingResearch: text("supporting_research"),
    evidenceInsightIds: jsonb("evidence_insight_ids").$type<number[]>().default([]).notNull(),
    visualOpening: text("visual_opening"),
    format: varchar("format", { length: 120 }),
    /** draft | approved | rejected | archived */
    status: varchar("status", { length: 12 }).default("draft").notNull(),
    bookmarked: boolean("bookmarked").default(false).notNull(),
    tags: jsonb("tags").$type<string[]>().default([]).notNull(),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [index("hooks_project_idx").on(t.projectId), index("hooks_angle_idx").on(t.angleId)],
);

/** A section of a script or piece of copy: what is said or written, and how it should look. */
export type ScriptSection = { label: string; text: string; direction: string };

/**
 * A piece of copy or a script: the brief it was written to (chosen in the
 * New script form, no AI involved), its working text (autosaved as you
 * edit), and every version in script_versions.
 */
export const cosScripts = creativeOs.table(
  "scripts",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => cosProjects.id, { onDelete: "cascade" }),
    productId: integer("product_id").references(() => cosProducts.id, { onDelete: "set null" }),
    segmentId: integer("segment_id").references(() => cosAudienceSegments.id, { onDelete: "set null" }),
    angleId: integer("angle_id").references(() => cosAngles.id, { onDelete: "set null" }),
    hookId: integer("hook_id").references(() => cosHooks.id, { onDelete: "set null" }),
    title: varchar("title", { length: 200 }).notNull(),
    /** What it is: ugc_script, meta_primary_text, advertorial… (see COPY_KINDS) */
    kind: varchar("kind", { length: 32 }).notNull(),
    platform: varchar("platform", { length: 40 }),
    format: varchar("format", { length: 60 }),
    framework: varchar("framework", { length: 32 }).default("freeform").notNull(),
    awarenessStage: varchar("awareness_stage", { length: 20 }),
    durationSeconds: integer("duration_seconds"),
    language: varchar("language", { length: 40 }).default("English").notNull(),
    offer: text("offer"),
    cta: varchar("cta", { length: 200 }),
    instructions: text("instructions"),
    /** The text being edited now; autosaved without any AI call. */
    working: jsonb("working").$type<ScriptSection[]>().default([]).notNull(),
    /** draft | approved | archived */
    status: varchar("status", { length: 12 }).default("draft").notNull(),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [index("scripts_project_idx").on(t.projectId)],
);

/** Every saved state of a script: AI variations, section rewrites and versions you saved by hand. Never overwritten. */
export const cosScriptVersions = creativeOs.table(
  "script_versions",
  {
    id: serial("id").primaryKey(),
    scriptId: integer("script_id")
      .notNull()
      .references(() => cosScripts.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    /** generated | rewrite | manual | restored */
    source: varchar("source", { length: 12 }).notNull(),
    label: varchar("label", { length: 200 }),
    sections: jsonb("sections").$type<ScriptSection[]>().notNull(),
    /** What the writer said about its approach, or what a rewrite changed. */
    note: text("note"),
    operationId: integer("operation_id").references(() => cosAiOperations.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("script_versions_script_idx").on(t.scriptId)],
);

/** Creative-director reviews of a script version: scored criteria, editorial notes and compliance flags. */
export const cosScriptReviews = creativeOs.table(
  "script_reviews",
  {
    id: serial("id").primaryKey(),
    scriptId: integer("script_id")
      .notNull()
      .references(() => cosScripts.id, { onDelete: "cascade" }),
    /** The text that was reviewed, as it stood. */
    sections: jsonb("sections").$type<ScriptSection[]>().notNull(),
    operationId: integer("operation_id").references(() => cosAiOperations.id, { onDelete: "set null" }),
    model: varchar("model", { length: 64 }).notNull(),
    result: jsonb("result").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("script_reviews_script_idx").on(t.scriptId)],
);

/** Production briefs for editors, designers and UGC creators, with a scene-by-scene storyboard. */
export const cosBriefs = creativeOs.table(
  "briefs",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => cosProjects.id, { onDelete: "cascade" }),
    scriptId: integer("script_id").references(() => cosScripts.id, { onDelete: "set null" }),
    operationId: integer("operation_id").references(() => cosAiOperations.id, { onDelete: "set null" }),
    model: varchar("model", { length: 64 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    /** Who it is for: ugc_creator | video_editor | designer | actor */
    audience: varchar("audience", { length: 20 }).notNull(),
    result: jsonb("result").notNull(),
    /** draft | approved | archived */
    status: varchar("status", { length: 12 }).default("draft").notNull(),
    ...timestamps,
  },
  (t) => [index("briefs_project_idx").on(t.projectId)],
);

/**
 * AI video plans: a script turned into what an AI video tool needs — the
 * recommended tool and settings, a style and character sheet, and a
 * ready-to-paste prompt per shot — plus how to assemble the result.
 */
export const cosVideoPlans = creativeOs.table(
  "video_plans",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => cosProjects.id, { onDelete: "cascade" }),
    scriptId: integer("script_id").references(() => cosScripts.id, { onDelete: "set null" }),
    operationId: integer("operation_id").references(() => cosAiOperations.id, { onDelete: "set null" }),
    model: varchar("model", { length: 64 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    /** The tool the plan is written for (see VIDEO_TOOLS). */
    tool: varchar("tool", { length: 24 }).notNull(),
    aspect: varchar("aspect", { length: 8 }).notNull(),
    result: jsonb("result").notNull(),
    /** draft | approved | archived */
    status: varchar("status", { length: 12 }).default("draft").notNull(),
    ...timestamps,
  },
  (t) => [index("video_plans_project_idx").on(t.projectId)],
);

/**
 * AI image plans: static ad and website images from a script or copy — the
 * recommended image tool, a style sheet, and per concept a ready-to-paste
 * prompt, the exact text to render or overlay, layout, sizes and variations.
 */
export const cosImagePlans = creativeOs.table(
  "image_plans",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => cosProjects.id, { onDelete: "cascade" }),
    scriptId: integer("script_id").references(() => cosScripts.id, { onDelete: "set null" }),
    operationId: integer("operation_id").references(() => cosAiOperations.id, { onDelete: "set null" }),
    model: varchar("model", { length: 64 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    /** The tool the plan is written for (see IMAGE_TOOLS). */
    tool: varchar("tool", { length: 24 }).notNull(),
    /** Where the images go (see IMAGE_FORMATS). */
    format: varchar("format", { length: 24 }).notNull(),
    result: jsonb("result").notNull(),
    /** draft | approved | archived */
    status: varchar("status", { length: 12 }).default("draft").notNull(),
    ...timestamps,
  },
  (t) => [index("image_plans_project_idx").on(t.projectId)],
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
export type CosSource = typeof cosSources.$inferSelect;
export type CosResearchRun = typeof cosResearchRuns.$inferSelect;
export type CosProductResearch = typeof cosProductResearch.$inferSelect;
export type CosCustomerInsight = typeof cosCustomerInsights.$inferSelect;
export type CosAudienceSegment = typeof cosAudienceSegments.$inferSelect;
export type CosAwarenessAnalysis = typeof cosAwarenessAnalyses.$inferSelect;
export type CosCompetitor = typeof cosCompetitors.$inferSelect;
export type CosCompetitorProfile = typeof cosCompetitorProfiles.$inferSelect;
export type CosMarketAnalysis = typeof cosMarketAnalyses.$inferSelect;
export type CosAngle = typeof cosAngles.$inferSelect;
export type CosHook = typeof cosHooks.$inferSelect;
export type CosScript = typeof cosScripts.$inferSelect;
export type CosScriptVersion = typeof cosScriptVersions.$inferSelect;
export type CosScriptReview = typeof cosScriptReviews.$inferSelect;
export type CosBrief = typeof cosBriefs.$inferSelect;
export type CosVideoPlan = typeof cosVideoPlans.$inferSelect;
export type CosImagePlan = typeof cosImagePlans.$inferSelect;
