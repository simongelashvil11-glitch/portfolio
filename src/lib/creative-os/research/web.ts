import "server-only";

import type Anthropic from "@anthropic-ai/sdk";
import { sql } from "drizzle-orm";

import { db } from "@/db";
import { cosSources } from "@/db/creative-os";

import { DEPTHS, type Depth } from "../research-labels";

/*
 * Web access for research calls, and the server-side checks on what came
 * back.
 *
 * Claude searches and reads pages through Anthropic's own web search and
 * web fetch tools, inside the one authorized call. The basic tool versions
 * are used on purpose (not the "dynamic filtering" ones, which route results
 * through code execution): their result blocks list every address searched
 * up and the text of every page read, so the server can check the answer
 * against them instead of trusting it.
 *
 * - A source address counts as seen only if it came back in that call.
 * - A customer quote counts as found only if its words are in the text of a
 *   page read in that call.
 * - Every address is stored in `sources` with whether it was read, only
 *   listed by a search, or could not be read, and why.
 */

/** The most page text one read may add, in tokens (approximate; PDFs are not capped by it). */
export const FETCH_MAX_TOKENS = 6000;

/** Web search and fetch tools for one call, capped by the depth chosen. */
export function webTools(depth: Depth, country: string | null) {
  const caps = DEPTHS[depth];
  return [
    {
      type: "web_search_20250305" as const,
      name: "web_search" as const,
      max_uses: caps.searches,
      ...(country ? { user_location: { type: "approximate" as const, country } } : {}),
    },
    {
      type: "web_fetch_20250910" as const,
      name: "web_fetch" as const,
      max_uses: caps.fetches,
      max_content_tokens: FETCH_MAX_TOKENS,
    },
  ];
}

export type WebEvidence = {
  queries: string[];
  /** Normalized address → what the search said about it. */
  searched: Map<string, { url: string; title: string | null; published: string | null }>;
  /** Normalized address → the text read (null for a PDF, which arrives as bytes). */
  read: Map<string, { url: string; title: string | null; text: string | null }>;
  /** Normalized address → why it could not be read. */
  failed: Map<string, { url: string; error: string }>;
  /** Addresses given in the material itself (the brand's site, the product page), normalized. */
  provided: Set<string>;
};

/** Addresses compared without the fragment, a trailing slash, "www." or letter case in the host. */
export function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw.trim());
    url.hash = "";
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const path = url.pathname.replace(/\/+$/, "");
    return `${host}${path}${url.search}`;
  } catch {
    return raw.trim().toLowerCase();
  }
}

/** Reads every search and fetch result out of a finished response. */
export function collectEvidence(message: Anthropic.Message): WebEvidence {
  const evidence: WebEvidence = { queries: [], searched: new Map(), read: new Map(), failed: new Map(), provided: new Set() };
  const fetchUrls = new Map<string, string>();

  for (const block of message.content) {
    if (block.type === "server_tool_use") {
      const input = (block.input ?? {}) as { query?: unknown; url?: unknown };
      if (block.name === "web_search" && typeof input.query === "string") evidence.queries.push(input.query);
      if (block.name === "web_fetch" && typeof input.url === "string") fetchUrls.set(block.id, input.url);
    } else if (block.type === "web_search_tool_result") {
      if (Array.isArray(block.content)) {
        for (const result of block.content) {
          evidence.searched.set(normalizeUrl(result.url), { url: result.url, title: result.title || null, published: result.page_age ?? null });
        }
      }
    } else if (block.type === "web_fetch_tool_result") {
      const content = block.content;
      if (content.type === "web_fetch_result") {
        const source = content.content.source;
        evidence.read.set(normalizeUrl(content.url), {
          url: content.url,
          title: content.content.title ?? null,
          text: source.type === "text" ? source.data : null,
        });
      } else {
        const url = fetchUrls.get(block.tool_use_id);
        if (url) evidence.failed.set(normalizeUrl(url), { url, error: content.error_code });
      }
    }
  }
  // A page that was read is not also a failure.
  for (const key of evidence.read.keys()) evidence.failed.delete(key);
  return evidence;
}

export function wasSeen(evidence: WebEvidence | null, url: string): boolean {
  if (!evidence || !url) return false;
  const key = normalizeUrl(url);
  return evidence.searched.has(key) || evidence.read.has(key) || evidence.provided.has(key);
}

/** Lower case, one kind of quote mark and dash, single spaces: how quotes are compared with pages. */
function flatten(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’‛′`]/g, "'")
    .replace(/[“”‟″]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/…/g, "...")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Whether a quote's words are on the page it is attributed to. "found" only
 * when the page was read in this call and contains them; "no_page" when
 * the page was not read, so it could not be checked.
 */
export function checkQuote(evidence: WebEvidence | null, url: string, quote: string): "found" | "not_found" | "no_page" {
  if (!evidence) return "no_page";
  const page = evidence.read.get(normalizeUrl(url));
  if (!page?.text) return "no_page";
  const needle = flatten(quote).replace(/^["']|["']$/g, "");
  if (!needle) return "not_found";
  return flatten(page.text).includes(needle) ? "found" : "not_found";
}

/** A finding's sources, each marked by whether the call actually returned it. */
export function markSources(evidence: WebEvidence | null, urls: string[]) {
  return [...new Set(urls.map((url) => url.trim()).filter(Boolean))].slice(0, 8).map((url) => ({ url, seen: wasSeen(evidence, url) }));
}

function categorize(domain: string, brandDomains: string[]): string {
  if (brandDomains.some((brand) => domain === brand || domain.endsWith(`.${brand}`))) return "brand_site";
  if (/(^|\.)(reddit\.com|quora\.com|stackexchange\.com|discord\.com)$/.test(domain) || /forum|community|board/.test(domain)) return "forum";
  if (/(^|\.)(trustpilot\.com|sitejabber\.com|yelp\.com|bbb\.org|g2\.com|capterra\.com|consumeraffairs\.com|reviews\.io)$/.test(domain)) return "review_site";
  if (/(^|\.)(amazon\.[a-z.]+|ebay\.[a-z.]+|walmart\.com|target\.com|etsy\.com|bestbuy\.com|aliexpress\.com)$/.test(domain)) return "marketplace";
  if (/(^|\.)(youtube\.com|youtu\.be|vimeo\.com|tiktok\.com)$/.test(domain)) return "video";
  if (/(^|\.)(facebook\.com|instagram\.com|x\.com|twitter\.com|linkedin\.com|threads\.net|pinterest\.com)$/.test(domain)) return "social";
  if (/news|times|post|journal|magazine|forbes|bloomberg|reuters|cnn|bbc|wired|verge|techcrunch/.test(domain)) return "news";
  return "website";
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

/** The most page text kept per source, for checking quotes later and showing evidence. */
const MAX_STORED_CHARS = 40_000;

/**
 * Stores every address the call touched in the project's sources and
 * returns their ids by normalized address. A page read again is refreshed;
 * a page read before keeps its text if a later call only searched it up.
 */
export async function saveSources(
  projectId: number,
  operationId: number,
  evidence: WebEvidence,
  brandDomains: string[],
): Promise<Map<string, number>> {
  type Row = typeof cosSources.$inferInsert;
  const rows = new Map<string, Row>();
  const base = (url: string): Row => {
    const domain = domainOf(url);
    return {
      projectId,
      url: url.slice(0, 1000),
      domain: domain.slice(0, 255),
      category: categorize(domain, brandDomains),
      accessStatus: "search_result",
      operationId,
    };
  };
  for (const [key, hit] of evidence.searched) {
    rows.set(key, { ...base(hit.url), title: hit.title?.slice(0, 500) ?? null, published: hit.published?.slice(0, 80) ?? null });
  }
  for (const [key, page] of evidence.read) {
    const previous = rows.get(key);
    rows.set(key, {
      ...base(page.url),
      ...previous,
      url: page.url.slice(0, 1000),
      title: (page.title ?? previous?.title ?? null)?.slice(0, 500) ?? null,
      accessStatus: "read",
      accessError: null,
      content: page.text ? page.text.slice(0, MAX_STORED_CHARS) : null,
    });
  }
  for (const [key, failure] of evidence.failed) {
    const previous = rows.get(key);
    rows.set(key, { ...base(failure.url), ...previous, accessStatus: "failed", accessError: failure.error.slice(0, 64) });
  }
  if (rows.size === 0) return new Map();

  const saved = await db
    .insert(cosSources)
    .values([...rows.values()])
    .onConflictDoUpdate({
      target: [cosSources.projectId, cosSources.url],
      set: {
        title: sql`coalesce(excluded.title, ${cosSources.title})`,
        published: sql`coalesce(excluded.published, ${cosSources.published})`,
        // Read beats failed beats a bare search result; a page read before stays read.
        accessStatus: sql`case
          when excluded.access_status = 'read' then 'read'
          when ${cosSources.accessStatus} = 'read' then 'read'
          when excluded.access_status = 'failed' then 'failed'
          else ${cosSources.accessStatus} end`,
        accessError: sql`case when excluded.access_status = 'read' then null else coalesce(excluded.access_error, ${cosSources.accessError}) end`,
        content: sql`coalesce(excluded.content, ${cosSources.content})`,
        operationId: sql`excluded.operation_id`,
        accessedAt: sql`now()`,
      },
    })
    .returning({ id: cosSources.id, url: cosSources.url });
  return new Map(saved.map((row) => [normalizeUrl(row.url), row.id]));
}
