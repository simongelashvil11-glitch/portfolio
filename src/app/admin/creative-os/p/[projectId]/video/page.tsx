import { and, desc, eq, inArray } from "drizzle-orm";
import Link from "next/link";

import { Pill } from "@/components/admin/stats";
import { button, EmptyState } from "@/components/admin/ui";
import { Add } from "@/components/fluent-icons";
import { db } from "@/db";
import { cosScripts, cosVideoPlans } from "@/db/creative-os";
import { when } from "@/lib/admin-time";
import { SCRIPT_STATUS_LABEL, VIDEO_TOOLS, type VideoTool } from "@/lib/creative-os/creative-labels";
import { getProjectOr404 } from "@/lib/creative-os/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "AI video" };

export default async function VideoPlansPage({ params, searchParams }: PageProps<"/admin/creative-os/p/[projectId]/video">) {
  const project = await getProjectOr404((await params).projectId);
  const base = `/admin/creative-os/p/${project.id}/video`;
  const archived = (await searchParams).view === "archived";

  const plans = await db
    .select({ plan: cosVideoPlans, script: cosScripts.title })
    .from(cosVideoPlans)
    .leftJoin(cosScripts, eq(cosScripts.id, cosVideoPlans.scriptId))
    .where(and(eq(cosVideoPlans.projectId, project.id), inArray(cosVideoPlans.status, archived ? ["archived"] : ["draft", "approved"])))
    .orderBy(desc(cosVideoPlans.createdAt));

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-2xl text-sm text-muted">
          Ads made with AI video tools. Write a script (type <strong>AI-generated video script</strong> works best), then press{" "}
          <strong>Make AI video prompts</strong> on it: you get the tool to use, its settings, a style and character sheet, a
          ready-to-paste prompt for every shot, and how to put it together.
        </p>
        <Link href={`/admin/creative-os/p/${project.id}/scripts/new?kind=ai_video`} className={button.primary}>
          <Add />
          New AI video script
        </Link>
      </div>

      <details className="rounded-[8px] border border-line px-4 py-3 text-sm" open={plans.length === 0}>
        <summary className="cursor-pointer select-none font-semibold">Which tool for what</summary>
        <ul className="mt-3 grid gap-3">
          {Object.entries(VIDEO_TOOLS).map(([key, tool]) => (
            <li key={key} className="grid gap-0.5">
              <span>
                <a href={tool.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent hover:underline">
                  {tool.label} ↗
                </a>
                <span className="ml-2 text-xs text-faint">{tool.kind === "avatar" ? "AI presenter" : "Video generator"}</span>
              </span>
              <span className="text-muted">{tool.bestFor}</span>
              <span className="text-xs text-faint">{tool.works}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-faint">
          From public comparisons in November 2026. Prices and commercial-use terms change: check them in the tool before you
          pay. A common setup for UGC-style ads: an avatar tool for the person talking, a generator for product shots and
          b-roll, and your editor to cut them together with captions.
        </p>
      </details>

      <nav aria-label="Which plans" className="flex flex-wrap gap-1.5">
        <Pill href={base} active={!archived}>
          Current
        </Pill>
        <Pill href={`${base}?view=archived`} active={archived}>
          Archived
        </Pill>
      </nav>

      {plans.length === 0 ? (
        <EmptyState>No AI video plans yet. Open a video script and press Make AI video prompts.</EmptyState>
      ) : (
        <ul className="grid gap-3">
          {plans.map(({ plan, script }) => (
            <li key={plan.id}>
              <Link href={`${base}/${plan.id}`} className="card card-interactive block p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold">{plan.title}</span>
                  <span className="text-xs text-faint">{SCRIPT_STATUS_LABEL[plan.status] ?? plan.status}</span>
                </div>
                <p className="mt-0.5 text-sm text-muted">
                  {VIDEO_TOOLS[plan.tool as VideoTool]?.label ?? plan.tool} · {plan.aspect}
                  {script ? ` · from “${script}”` : ""} · {when(plan.createdAt)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
