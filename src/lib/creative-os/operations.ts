import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { cosAiOperations, cosAuditLog, type CosAiOperation } from "@/db/creative-os";

import { checkBudget, spentThisMonth } from "./budget";
import { costOf, getModelPrice, getSettings } from "./pricing";

/*
 * Runs one authorized, paid Claude operation from start to finish, and is
 * the only code in CreativeOS that calls the Claude API.
 *
 * 1. The idempotency key (made by the browser when the owner pressed
 *    Authorize) is unique: a double click or a resent request finds the
 *    existing operation and never calls Claude a second time.
 * 2. The worst case is recomputed on the server and must not exceed what the
 *    owner was shown and authorized.
 * 3. The budget is checked, the operation is recorded as running (so its
 *    worst case counts against the month at once), and the month is checked
 *    again with it included — two operations started together cannot both
 *    slip under the limit.
 * 4. One call, no automatic retries (a retry is a new, authorized operation),
 *    cancellable through the request's abort signal.
 * 5. The provider-reported usage is recorded and priced, whatever happened.
 */

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new OperationError("ANTHROPIC_API_KEY is not set on the server.");
  }
  // maxRetries 0: a retry would be a second billable call nobody authorized.
  client ??= new Anthropic({ maxRetries: 0, timeout: 280_000 });
  return client;
}

export class OperationError extends Error {}

export type OperationRequest = {
  idempotencyKey: string;
  kind: string;
  projectId: number | null;
  targetType: string;
  targetId: number;
  model: string;
  effort: string;
  /** The worst case the owner saw and authorized, in USD. */
  authorizedMaxUsd: number;
  /** The worst case recomputed now, and the likely low end, in USD. */
  estimate: { low: number; high: number };
  /** Recorded with the operation: caps and the list of materials sent. */
  params: Record<string, unknown>;
};

export type OperationOutcome<T> =
  | { status: "completed"; operation: CosAiOperation; result: T }
  | { status: "duplicate"; operation: CosAiOperation }
  | { status: "rejected"; reason: string; operation?: CosAiOperation };

/** Usage as reported on a Claude response, flattened for the ledger. */
function usageOf(message: Anthropic.Message) {
  const usage = message.usage;
  return {
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
    cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    webSearches: usage.server_tool_use?.web_search_requests ?? 0,
    webFetches:
      (usage.server_tool_use as { web_fetch_requests?: number } | null | undefined)?.web_fetch_requests ?? 0,
  };
}

async function audit(action: string, operation: CosAiOperation, detail?: Record<string, unknown>) {
  await db.insert(cosAuditLog).values({ action, entity: "ai_operation", entityId: operation.id, detail: detail ?? null });
}

/**
 * Runs `call` under the rules above. `call` makes the one Claude request with
 * the client and signal it is given, and returns the response; `save` turns
 * the response into stored results.
 */
export async function runOperation<T>(
  request: OperationRequest,
  call: (client: Anthropic, signal: AbortSignal) => Promise<Anthropic.Message>,
  save: (message: Anthropic.Message, operation: CosAiOperation) => Promise<T>,
  signal: AbortSignal,
): Promise<OperationOutcome<T>> {
  const [existing] = await db
    .select()
    .from(cosAiOperations)
    .where(eq(cosAiOperations.idempotencyKey, request.idempotencyKey))
    .limit(1);
  if (existing) return { status: "duplicate", operation: existing };

  // Without a key nothing can be sent, so nothing is recorded or counted.
  if (!process.env.ANTHROPIC_API_KEY) {
    return { status: "rejected", reason: "The Anthropic API key is not set on this server (ANTHROPIC_API_KEY)." };
  }

  const price = await getModelPrice(request.model);
  if (!price || !price.enabled) return { status: "rejected", reason: "That model is not enabled in Settings." };

  // The server's own worst case must fit within what was authorized (a cent of rounding allowed).
  if (request.estimate.high > request.authorizedMaxUsd + 0.01) {
    return {
      status: "rejected",
      reason: "The cost estimate changed since you authorized it. Review it again before running.",
    };
  }

  // One operation at a time on the same item.
  const [busy] = await db
    .select({ id: cosAiOperations.id })
    .from(cosAiOperations)
    .where(
      and(
        eq(cosAiOperations.targetType, request.targetType),
        eq(cosAiOperations.targetId, request.targetId),
        eq(cosAiOperations.status, "running"),
        sql`${cosAiOperations.startedAt} > now() - interval '6 minutes'`,
      ),
    )
    .limit(1);
  if (busy) return { status: "rejected", reason: "An operation on this item is already running." };

  const budget = await checkBudget(request.estimate.high);
  if (!budget.ok) return { status: "rejected", reason: budget.reason };

  // Record it as running: from here its worst case counts against the month.
  const inserted = await db
    .insert(cosAiOperations)
    .values({
      idempotencyKey: request.idempotencyKey,
      kind: request.kind,
      projectId: request.projectId,
      targetType: request.targetType,
      targetId: request.targetId,
      model: request.model,
      effort: request.effort,
      params: request.params,
      status: "running",
      estimateLowUsd: request.estimate.low,
      estimateHighUsd: request.estimate.high,
      startedAt: new Date(),
    })
    .onConflictDoNothing({ target: cosAiOperations.idempotencyKey })
    .returning();
  if (inserted.length === 0) {
    const [raced] = await db
      .select()
      .from(cosAiOperations)
      .where(eq(cosAiOperations.idempotencyKey, request.idempotencyKey))
      .limit(1);
    return { status: "duplicate", operation: raced };
  }
  let operation = inserted[0];

  // Re-check the month with this operation counted, in case another started at the same moment.
  const spent = await spentThisMonth();
  if (spent > budget.monthlyLimit + 1e-9) {
    [operation] = await db
      .update(cosAiOperations)
      .set({ status: "blocked", error: "Monthly limit would be passed.", completedAt: new Date() })
      .where(eq(cosAiOperations.id, operation.id))
      .returning();
    return { status: "rejected", reason: "This would pass your monthly limit.", operation };
  }
  await audit("authorized", operation, { model: request.model, worstCaseUsd: request.estimate.high });

  const settings = await getSettings();
  let message: Anthropic.Message;
  try {
    message = await call(anthropic(), signal);
  } catch (error) {
    const cancelled = signal.aborted || error instanceof Anthropic.APIUserAbortError;
    const reason =
      error instanceof OperationError
        ? error.message
        : error instanceof Anthropic.APIError
          ? `Claude API error${error.status ? ` ${error.status}` : ""}: ${
              (error.error as { error?: { message?: string } } | undefined)?.error?.message ?? error.message
            }`
          : error instanceof Error
            ? error.message
            : "Unknown error";
    // An error answer from the API (a 4xx or 5xx status) means no response was
    // produced, so nothing is billed: recorded at $0. Otherwise — cancelled or
    // the connection lost mid-flight — usage is unknown, and the worst case
    // stays counted (cost_usd null) because a sent request may be billed.
    const answeredWithError = !cancelled && error instanceof Anthropic.APIError && typeof error.status === "number";
    [operation] = await db
      .update(cosAiOperations)
      .set({
        status: cancelled ? "cancelled" : "failed",
        error: cancelled ? "Cancelled. The request had already been sent, so it may still be billed." : reason,
        costUsd: answeredWithError ? 0 : null,
        completedAt: new Date(),
      })
      .where(eq(cosAiOperations.id, operation.id))
      .returning();
    await audit(cancelled ? "cancelled" : "failed", operation, { reason });
    return { status: "rejected", reason: cancelled ? "Cancelled." : reason, operation };
  }

  const usage = usageOf(message);
  const cost = costOf(usage, price, settings.webSearchPer1k);
  const base = {
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cacheReadTokens: usage.cacheReadTokens,
    cacheWriteTokens: usage.cacheWriteTokens,
    webSearchRequests: usage.webSearches,
    webFetchRequests: usage.webFetches,
    costUsd: cost,
    stopReason: message.stop_reason ?? null,
    completedAt: new Date(),
  };

  if (message.stop_reason === "refusal") {
    [operation] = await db
      .update(cosAiOperations)
      .set({ ...base, status: "refused", error: "The model declined this request." })
      .where(eq(cosAiOperations.id, operation.id))
      .returning();
    await audit("refused", operation);
    return { status: "rejected", reason: "The model declined this request. It was billed for what it used.", operation };
  }

  try {
    const result = await save(message, operation);
    [operation] = await db
      .update(cosAiOperations)
      .set({ ...base, status: "completed", error: null })
      .where(eq(cosAiOperations.id, operation.id))
      .returning();
    await audit("completed", operation, { costUsd: cost });
    return { status: "completed", operation, result };
  } catch (error) {
    const reason =
      message.stop_reason === "max_tokens"
        ? "The answer was cut off at the output limit, so it could not be read. Nothing was saved."
        : error instanceof Error
          ? error.message
          : "The answer could not be saved.";
    [operation] = await db
      .update(cosAiOperations)
      .set({ ...base, status: "failed", error: reason })
      .where(eq(cosAiOperations.id, operation.id))
      .returning();
    await audit("failed", operation, { reason });
    return { status: "rejected", reason, operation };
  }
}

/**
 * Operations still marked running long after any call could have ended (the
 * function hit its time limit, or the connection was lost) are marked failed.
 * Their cost stays unknown and counted at the worst case.
 */
export async function expireStaleOperations() {
  await db
    .update(cosAiOperations)
    .set({ status: "failed", error: "Stopped without finishing (the server time limit or a lost connection).", completedAt: new Date() })
    .where(
      and(
        inArray(cosAiOperations.status, ["running"]),
        sql`${cosAiOperations.startedAt} < now() - interval '10 minutes'`,
      ),
    );
}
