import "server-only";

import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

import type { CosPricing } from "@/db/creative-os";

import { CHARS_PER_TOKEN } from "../estimate";
import { DEPTHS, type Depth } from "../research-labels";
import { FETCH_MAX_TOKENS, webTools } from "./web";

/*
 * How a research call is made, priced in advance, and read back.
 *
 * Calls with web access give Claude the capped search and fetch tools plus
 * one tool of our own, `record_findings`, whose input schema is the result
 * format with strict validation: Claude researches, then hands the findings
 * over as that tool's input, which the API guarantees matches the schema.
 * Calls without web access use structured outputs directly, as the Ad
 * Deconstruction Lab does.
 */

export const RECORD_TOOL = "record_findings";

type Effort = "low" | "medium" | "high";

export function webResearchCall<T extends z.ZodType>({
  model,
  effort,
  system,
  user,
  schema,
  maxTokens,
  depth,
}: {
  model: string;
  effort: Effort;
  system: string;
  user: string;
  schema: T;
  maxTokens: number;
  depth: Depth;
}) {
  const inputSchema = zodOutputFormat(schema).schema as Anthropic.Tool.InputSchema;
  return (client: Anthropic, signal: AbortSignal) =>
    client.messages.create(
      {
        model,
        max_tokens: maxTokens,
        system,
        output_config: { effort },
        tools: [
          ...webTools(depth),
          {
            name: RECORD_TOOL,
            description:
              "Hand over the finished research. Call this exactly once, at the end, after searching and reading. Its input is saved as the result.",
            input_schema: inputSchema,
            strict: true,
          },
        ],
        tool_choice: { type: "auto" },
        messages: [{ role: "user", content: user }],
      },
      { signal },
    );
}

export function structuredCall<T extends z.ZodType>({
  model,
  effort,
  system,
  user,
  schema,
  maxTokens,
}: {
  model: string;
  effort: Effort;
  system: string;
  user: string;
  schema: T;
  maxTokens: number;
}) {
  return (client: Anthropic, signal: AbortSignal) =>
    client.messages.parse(
      {
        model,
        max_tokens: maxTokens,
        system,
        output_config: { effort, format: zodOutputFormat(schema) },
        messages: [{ role: "user", content: user }],
      },
      { signal },
    );
}

/** The validated result of a call, or an error that says plainly why there is none. */
export function readResult<T extends z.ZodType>(message: Anthropic.Message, schema: T, web: boolean): z.infer<T> {
  if (message.stop_reason === "max_tokens") {
    throw new Error("The answer was cut off at the output limit, so it could not be read. Nothing was saved.");
  }
  if (message.stop_reason === "pause_turn") {
    throw new Error("The research needed more steps than one call allows, so it stopped before finishing. Try a lower depth.");
  }
  const raw = web
    ? message.content.find((block): block is Anthropic.ToolUseBlock => block.type === "tool_use" && block.name === RECORD_TOOL)?.input
    : (message as { parsed_output?: unknown }).parsed_output;
  if (raw === undefined || raw === null) {
    throw new Error("Claude finished without handing over its findings, so nothing was saved.");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new Error("The answer did not match the expected structure, so nothing was saved.");
  return parsed.data;
}

/* ------------------------------------------------------------------ */
/* Estimates                                                           */
/* ------------------------------------------------------------------ */

/**
 * The most tokens one search's results add. Results arrive as encrypted
 * page extracts whose size is not published; this is a high allowance.
 */
const SEARCH_RESULT_TOKENS_MAX = 12_000;
const SEARCH_RESULT_TOKENS_LIKELY = 4_000;
/** The tool definitions, the result schema and the tools' own instructions. */
const WEB_OVERHEAD_TOKENS = 3_500;
const SCHEMA_OVERHEAD_TOKENS = 1_500;

export type ResearchEstimate = {
  inputTokens: number;
  maxOutputTokens: number;
  webSearches: number;
  webFetches: number;
  low: number;
  high: number;
};

/**
 * A research call's cost range, worked out locally.
 *
 * With web tools, the API runs a loop inside the one call: after each search
 * or page read, Claude reads the whole conversation again, and every pass is
 * billed as input. So the worst case is the base prompt read once per step,
 * plus each result read again on every later step:
 *
 *   (n + 1) × base  +  r × n(n + 1)/2      for n tool uses of up to r tokens
 *
 * and the whole output allowance, and every search at its fee. The likely
 * figure assumes half the uses with smaller results and the low end of the
 * likely output.
 */
export function estimateResearch({
  inputChars,
  depth,
  maxOutputTokens,
  likelyOutputTokens,
  price,
  webSearchPer1k,
}: {
  inputChars: number;
  depth: Depth | null;
  maxOutputTokens: number;
  likelyOutputTokens: [number, number];
  price: Pick<CosPricing, "inputPerMtok" | "outputPerMtok">;
  webSearchPer1k: number;
}): ResearchEstimate {
  const perIn = price.inputPerMtok / 1_000_000;
  const perOut = price.outputPerMtok / 1_000_000;
  const text = Math.ceil(inputChars / CHARS_PER_TOKEN) + SCHEMA_OVERHEAD_TOKENS;

  if (!depth) {
    return {
      inputTokens: text,
      maxOutputTokens,
      webSearches: 0,
      webFetches: 0,
      low: Math.round(text * 0.85) * perIn + likelyOutputTokens[0] * perOut,
      high: text * perIn + maxOutputTokens * perOut,
    };
  }

  const { searches, fetches } = DEPTHS[depth];
  const base = text + WEB_OVERHEAD_TOKENS;
  const n = searches + fetches;
  const r = Math.max(SEARCH_RESULT_TOKENS_MAX, FETCH_MAX_TOKENS + 1000);
  const worstInput = (n + 1) * base + (r * n * (n + 1)) / 2;
  const m = Math.ceil(n / 2);
  const likelyInput = (m + 1) * base + (SEARCH_RESULT_TOKENS_LIKELY * m * (m + 1)) / 2;
  const perSearch = webSearchPer1k / 1000;

  return {
    inputTokens: Math.round(worstInput),
    maxOutputTokens,
    webSearches: searches,
    webFetches: fetches,
    low: likelyInput * perIn + likelyOutputTokens[0] * perOut + Math.ceil(searches / 2) * perSearch,
    high: worstInput * perIn + maxOutputTokens * perOut + searches * perSearch,
  };
}
