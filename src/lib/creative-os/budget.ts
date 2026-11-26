import "server-only";

import { and, gte, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { cosAiOperations } from "@/db/creative-os";

import { getSettings } from "./pricing";

/*
 * The spending guard. Before any paid call, the worst case of that call is
 * checked against two limits the owner sets in Settings:
 *
 * - per operation: the call's worst case must fit under it;
 * - per month: everything spent this month, plus anything still running
 *   (counted at its worst case), plus this call's worst case, must fit.
 *
 * With either limit unset, nothing paid can run. "Spent" uses the cost
 * computed from the provider-reported usage when it is known, and the
 * worst-case estimate when it is not (a call still running, or cancelled
 * after it was sent): conservative on purpose. These are estimates from the
 * price table, not the provider's invoice; the only true hard cap is the
 * spending limit set on the Anthropic account itself.
 */

/** Operations whose cost counts: anything that was or may have been sent. */
const COUNTED = ["running", "completed", "failed", "cancelled", "refused"];

/** Start of the current calendar month, UTC, computed by the database. */
const monthStart = sql`date_trunc('month', now() at time zone 'UTC') at time zone 'UTC'`;

export async function spentThisMonth(): Promise<number> {
  const [row] = await db
    .select({ value: sql<number>`coalesce(sum(coalesce(${cosAiOperations.costUsd}, ${cosAiOperations.estimateHighUsd})), 0)` })
    .from(cosAiOperations)
    .where(and(inArray(cosAiOperations.status, COUNTED), gte(cosAiOperations.authorizedAt, monthStart)));
  return Number(row?.value ?? 0);
}

export type BudgetCheck =
  | { ok: true; spent: number; monthlyLimit: number; perOperationLimit: number; remaining: number }
  | { ok: false; reason: string; spent: number; monthlyLimit: number | null; perOperationLimit: number | null };

export async function checkBudget(worstCaseUsd: number): Promise<BudgetCheck> {
  const [settings, spent] = await Promise.all([getSettings(), spentThisMonth()]);
  const monthlyLimit = settings.monthlyLimitUsd;
  const perOperationLimit = settings.perOperationLimitUsd;

  if (monthlyLimit === null || perOperationLimit === null) {
    return {
      ok: false,
      reason: "Set a monthly limit and a per-operation limit in CreativeOS Settings before running paid operations.",
      spent,
      monthlyLimit,
      perOperationLimit,
    };
  }
  if (worstCaseUsd > perOperationLimit) {
    return {
      ok: false,
      reason: `This operation could cost up to $${worstCaseUsd.toFixed(2)}, over your per-operation limit of $${perOperationLimit.toFixed(2)}. Choose a cheaper model, lower the scope, or raise the limit.`,
      spent,
      monthlyLimit,
      perOperationLimit,
    };
  }
  if (spent + worstCaseUsd > monthlyLimit) {
    return {
      ok: false,
      reason: `This month's spending is $${spent.toFixed(2)} of $${monthlyLimit.toFixed(2)}; this operation could add up to $${worstCaseUsd.toFixed(2)}, which would pass the limit.`,
      spent,
      monthlyLimit,
      perOperationLimit,
    };
  }
  return { ok: true, spent, monthlyLimit, perOperationLimit, remaining: monthlyLimit - spent };
}
