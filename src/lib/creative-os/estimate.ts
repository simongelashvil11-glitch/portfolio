import type { CosPricing } from "@/db/creative-os";

/*
 * Cost estimates before a paid call, made locally: no API call, not even the
 * free token counter, happens until the owner authorizes.
 *
 * Text is counted at one token per 3 characters, on the high side for
 * English (current Claude models' tokenizer averages nearer 3.3-3.6), so
 * input is overestimated rather than under. The worst case assumes the
 * whole output allowance is used — thinking counts as output — which is the
 * most a call can cost in tokens. The likely range is narrower and
 * labelled as such.
 */

export const CHARS_PER_TOKEN = 3;

/** A screenshot, at the most tokens a large image is resized down to. */
export const IMAGE_TOKENS_MAX = 5000;
export const IMAGE_TOKENS_LIKELY = 1600;

export function tokensForText(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export type Estimate = {
  inputTokens: number;
  maxOutputTokens: number;
  likelyOutputTokens: [number, number];
  low: number;
  high: number;
};

export function estimateCost({
  inputChars,
  images = 0,
  maxOutputTokens,
  likelyOutputTokens,
  price,
}: {
  inputChars: number;
  images?: number;
  maxOutputTokens: number;
  likelyOutputTokens: [number, number];
  price: Pick<CosPricing, "inputPerMtok" | "outputPerMtok">;
}): Estimate {
  const text = Math.ceil(inputChars / CHARS_PER_TOKEN);
  const inputHigh = text + images * IMAGE_TOKENS_MAX;
  const inputLow = Math.round(text * 0.85) + images * IMAGE_TOKENS_LIKELY;
  const perIn = price.inputPerMtok / 1_000_000;
  const perOut = price.outputPerMtok / 1_000_000;
  return {
    inputTokens: inputHigh,
    maxOutputTokens,
    likelyOutputTokens,
    low: inputLow * perIn + likelyOutputTokens[0] * perOut,
    high: inputHigh * perIn + maxOutputTokens * perOut,
  };
}
