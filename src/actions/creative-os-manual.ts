"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth";
import { cleanOptions } from "@/lib/creative-os/research";
import { buildManualPrompt, importManualAnswer, type ManualImport, type ManualPrompt } from "@/lib/creative-os/research/manual";

/*
 * "Use my Claude subscription" for the steps without web research: the
 * prompt to paste into claude.ai, and importing the answer pasted back.
 * Neither calls the Claude API; nothing here costs money.
 */

export async function manualPrompt(kind: string, targetId: number, options: Record<string, string>): Promise<ManualPrompt> {
  await requireSession();
  if (!/^[a-z_]{3,40}$/.test(kind) || !Number.isInteger(targetId) || targetId <= 0) return { ok: false, error: "Invalid request." };
  return buildManualPrompt(kind, targetId, cleanOptions(options));
}

export async function manualImport(kind: string, targetId: number, options: Record<string, string>, pasted: string): Promise<ManualImport> {
  await requireSession();
  if (!/^[a-z_]{3,40}$/.test(kind) || !Number.isInteger(targetId) || targetId <= 0 || typeof pasted !== "string") {
    return { ok: false, error: "Invalid request." };
  }
  const result = await importManualAnswer(kind, targetId, cleanOptions(options), pasted);
  revalidatePath("/admin/creative-os", "layout");
  return result;
}
