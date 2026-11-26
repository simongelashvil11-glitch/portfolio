import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { cosKnowledgeChunks, cosKnowledgeItems } from "@/db/creative-os";

/*
 * The project knowledge base: text from pasted notes, web pages and
 * uploaded documents, split into passages and indexed with Postgres full-
 * text search, so a paid operation can be sent the few passages that matter
 * instead of everything. Original files are not kept — only their text.
 */

/** Passages of roughly this many characters, split at paragraph boundaries where possible. */
const CHUNK_CHARS = 1200;
/** The most text one item may hold, so one document cannot crowd out the database. */
export const MAX_ITEM_CHARS = 400_000;

export function chunkText(text: string): string[] {
  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const paragraph of paragraphs) {
    if (paragraph.length > CHUNK_CHARS) {
      if (current) chunks.push(current);
      current = "";
      for (let at = 0; at < paragraph.length; at += CHUNK_CHARS) chunks.push(paragraph.slice(at, at + CHUNK_CHARS));
      continue;
    }
    if (current && current.length + paragraph.length + 2 > CHUNK_CHARS) {
      chunks.push(current);
      current = paragraph;
    } else {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/** Stores an item and its passages. */
export async function saveKnowledge(item: {
  projectId: number;
  productId: number | null;
  kind: string;
  title: string;
  sourceType: "text" | "url" | "file";
  sourceUrl?: string | null;
  fileName?: string | null;
  content: string;
}) {
  const content = item.content.slice(0, MAX_ITEM_CHARS).trim();
  if (!content) throw new Error("There was no text to save.");
  const [saved] = await db
    .insert(cosKnowledgeItems)
    .values({ ...item, content, charCount: content.length })
    .returning();
  const chunks = chunkText(content);
  if (chunks.length > 0) {
    await db
      .insert(cosKnowledgeChunks)
      .values(chunks.map((chunk, position) => ({ itemId: saved.id, projectId: item.projectId, position, content: chunk })));
  }
  return saved;
}

/** Passages in one project matching the words searched for, best first. Free: no AI involved. */
export async function searchKnowledge(projectId: number, query: string, limit = 20) {
  const q = query.trim();
  if (!q) return [];
  const document = sql`to_tsvector('simple', ${cosKnowledgeChunks.content})`;
  const search = sql`websearch_to_tsquery('simple', ${q})`;
  return db
    .select({
      id: cosKnowledgeChunks.id,
      itemId: cosKnowledgeChunks.itemId,
      title: cosKnowledgeItems.title,
      kind: cosKnowledgeItems.kind,
      snippet: sql<string>`ts_headline('simple', ${cosKnowledgeChunks.content}, ${search}, 'MaxWords=40, MinWords=15, StartSel=<<, StopSel=>>')`,
      rank: sql<number>`ts_rank(${document}, ${search})`,
    })
    .from(cosKnowledgeChunks)
    .innerJoin(cosKnowledgeItems, eq(cosKnowledgeItems.id, cosKnowledgeChunks.itemId))
    .where(and(eq(cosKnowledgeChunks.projectId, projectId), sql`${document} @@ ${search}`))
    .orderBy(desc(sql`ts_rank(${document}, ${search})`))
    .limit(limit);
}

/* ------------------------------------------------------------------ */
/* Reading documents                                                   */
/* ------------------------------------------------------------------ */

/** Text from an uploaded file: PDF, Word (.docx), or plain text and Markdown. */
export async function extractFromFile(name: string, type: string, bytes: Uint8Array): Promise<string> {
  const lower = name.toLowerCase();
  if (type === "application/pdf" || lower.endsWith(".pdf")) {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });
    return Array.isArray(text) ? text.join("\n\n") : text;
  }
  if (lower.endsWith(".docx") || type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    return value;
  }
  if (type.startsWith("text/") || /\.(txt|md|markdown|csv)$/.test(lower)) {
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }
  throw new Error("That file type is not supported. Use PDF, Word (.docx), or a text or Markdown file.");
}

/** Readable text from an HTML page: scripts, styles and markup removed, entities decoded. */
export function htmlToText(html: string): { title: string | null; text: string } {
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim() ?? null;
  const text = html
    .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/section|\/article)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
  return { title: title ? htmlToText(title).text : null, text };
}

/* ------------------------------------------------------------------ */
/* Fetching a page safely                                              */
/* ------------------------------------------------------------------ */

/** True for addresses inside a private network, the machine itself, or cloud metadata. */
function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 6) {
    const a = address.toLowerCase();
    if (a === "::1" || a === "::") return true;
    if (a.startsWith("fc") || a.startsWith("fd") || a.startsWith("fe80")) return true;
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(a);
    return mapped ? isPrivateAddress(mapped[1]) : false;
  }
  const [a, b] = address.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("That is not a valid web address.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Only http and https addresses can be imported.");
  if (url.username || url.password) throw new Error("Addresses with credentials are not allowed.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("Private addresses cannot be imported.");
  }
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (addresses.length === 0) throw new Error("That address could not be found.");
  if (addresses.some(({ address }) => isPrivateAddress(address))) throw new Error("Private addresses cannot be imported.");
  return url;
}

const MAX_PAGE_BYTES = 3_000_000;

/**
 * Downloads a public page for the knowledge base — the server's own fetch,
 * no AI and no cost. Every hop of a redirect is checked against private
 * addresses (server-side request forgery), the size is capped, and only
 * HTML, text and PDF are read.
 */
export async function fetchPublicPage(raw: string): Promise<{ title: string | null; text: string; finalUrl: string }> {
  let url = await assertPublicUrl(raw);
  for (let hop = 0; hop < 4; hop++) {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(12_000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CreativeOS knowledge import)", Accept: "text/html,text/plain,application/pdf" },
    });
    if (response.status >= 300 && response.status < 400) {
      const next = response.headers.get("location");
      if (!next) throw new Error("The page redirected without an address.");
      url = await assertPublicUrl(new URL(next, url).toString());
      continue;
    }
    if (!response.ok) throw new Error(`The page answered ${response.status}; it may block automated readers.`);
    const type = response.headers.get("content-type") ?? "";
    const declared = Number(response.headers.get("content-length") ?? 0);
    if (declared > MAX_PAGE_BYTES) throw new Error("The page is too large to import.");
    const buffer = new Uint8Array(await response.arrayBuffer());
    if (buffer.byteLength > MAX_PAGE_BYTES) throw new Error("The page is too large to import.");
    if (type.includes("application/pdf")) {
      return { title: null, text: await extractFromFile("page.pdf", "application/pdf", buffer), finalUrl: url.toString() };
    }
    if (!type.includes("text/html") && !type.startsWith("text/")) throw new Error("Only web pages, text and PDFs can be imported.");
    const body = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
    if (type.includes("text/html")) return { ...htmlToText(body), finalUrl: url.toString() };
    return { title: null, text: body, finalUrl: url.toString() };
  }
  throw new Error("The page redirected too many times.");
}
