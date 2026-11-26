import "server-only";

import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { cosPricing, cosSettings, type CosPricing, type CosSettings } from "@/db/creative-os";

/*
 * Prices and settings for CreativeOS's paid operations.
 *
 * The defaults are Anthropic's published API prices as checked on 2026-11-26
 * (platform.claude.com/docs/en/about-claude/pricing): USD per million tokens,
 * 5-minute cache writes, and web search at $10 per 1,000 searches (web fetch
 * has no fee beyond its tokens). They are written once, then edited in
 * Settings; costs shown in the app are estimates from this table, not the
 * provider's invoice.
 */

export const DEFAULT_PRICES: Omit<CosPricing, "updatedAt">[] = [
  {
    model: "claude-opus-5-5",
    label: "Claude Opus 5.5",
    inputPerMtok: 4,
    outputPerMtok: 20,
    cacheWritePerMtok: 5,
    cacheReadPerMtok: 0.2,
    enabled: true,
    sort: 1,
    note: null,
  },
  {
    model: "claude-sonnet-5-5",
    label: "Claude Sonnet 5.5",
    inputPerMtok: 2,
    outputPerMtok: 10,
    cacheWritePerMtok: 2.5,
    cacheReadPerMtok: 0.1,
    enabled: true,
    sort: 2,
    note: null,
  },
  {
    model: "claude-haiku-5-5",
    label: "Claude Haiku 5.5",
    inputPerMtok: 0.1,
    outputPerMtok: 0.5,
    cacheWritePerMtok: 0.125,
    cacheReadPerMtok: 0.01,
    enabled: true,
    sort: 3,
    note: "Prompts over 100,000 tokens cost $0.50 / $2.50 per million instead.",
  },
  {
    model: "claude-fable-5-2",
    label: "Claude Fable 5.2",
    inputPerMtok: 8,
    outputPerMtok: 40,
    cacheWritePerMtok: 10,
    cacheReadPerMtok: 0.2,
    enabled: true,
    sort: 4,
    note: "Anthropic's most capable widely released model; the most expensive here.",
  },
];

/** Writes the default prices and the settings row once; later edits are never overwritten. */
export async function ensureDefaults() {
  await db.insert(cosPricing).values(DEFAULT_PRICES).onConflictDoNothing();
  await db.insert(cosSettings).values({ id: 1 }).onConflictDoNothing();
}

export async function getPricing(): Promise<CosPricing[]> {
  await ensureDefaults();
  return db.select().from(cosPricing).orderBy(asc(cosPricing.sort), asc(cosPricing.model));
}

export async function getModelPrice(model: string): Promise<CosPricing | null> {
  await ensureDefaults();
  const [row] = await db.select().from(cosPricing).where(eq(cosPricing.model, model)).limit(1);
  return row ?? null;
}

export async function getSettings(): Promise<CosSettings> {
  await ensureDefaults();
  const [row] = await db.select().from(cosSettings).where(eq(cosSettings.id, 1)).limit(1);
  return row;
}

export type Usage = {
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens?: number;
  cacheReadTokens?: number;
  webSearches?: number;
};

/** USD for a usage record at a model's prices. */
export function costOf(usage: Usage, price: CosPricing, webSearchPer1k: number): number {
  const perToken = (perMtok: number) => perMtok / 1_000_000;
  return (
    usage.inputTokens * perToken(price.inputPerMtok) +
    usage.outputTokens * perToken(price.outputPerMtok) +
    (usage.cacheWriteTokens ?? 0) * perToken(price.cacheWritePerMtok) +
    (usage.cacheReadTokens ?? 0) * perToken(price.cacheReadPerMtok) +
    (usage.webSearches ?? 0) * (webSearchPer1k / 1000)
  );
}
