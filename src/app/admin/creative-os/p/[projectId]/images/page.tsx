import { and, desc, eq, inArray } from "drizzle-orm";
import Link from "next/link";

import { Pill } from "@/components/admin/stats";
import { button, EmptyState } from "@/components/admin/ui";
import { Add } from "@/components/fluent-icons";
import { db } from "@/db";
import { cosImagePlans, cosScripts } from "@/db/creative-os";
import { when } from "@/lib/admin-time";
import { IMAGE_FORMATS, IMAGE_TOOLS, SCRIPT_STATUS_LABEL, type ImageFormat, type ImageTool } from "@/lib/creative-os/creative-labels";
import { getProjectOr404 } from "@/lib/creative-os/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "AI images" };

export default async function ImagePlansPage({ params, searchParams }: PageProps<"/admin/creative-os/p/[projectId]/images">) {
  const project = await getProjectOr404((await params).projectId);
  const base = `/admin/creative-os/p/${project.id}/images`;
  const archived = (await searchParams).view === "archived";

  const plans = await db
    .select({ plan: cosImagePlans, script: cosScripts.title })
    .from(cosImagePlans)
    .leftJoin(cosScripts, eq(cosScripts.id, cosImagePlans.scriptId))
    .where(and(eq(cosImagePlans.projectId, project.id), inArray(cosImagePlans.status, archived ? ["archived"] : ["draft", "approved"])))
    .orderBy(desc(cosImagePlans.createdAt));

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-2xl text-sm text-muted">
          Static images for Facebook and Instagram ads and for the website, made with AI image tools. Write the copy first (a
          static ad, Meta primary text or any script), then press <strong>Make AI image prompts</strong> on it: you get the tool
          to use, a style sheet, and per concept a ready-to-paste prompt, the exact text for the image, layout, sizes and
          variations to test.
        </p>
        <Link href={`/admin/creative-os/p/${project.id}/scripts/new?kind=static_ad`} className={button.primary}>
          <Add />
          New static ad copy
        </Link>
      </div>

      <details className="rounded-[8px] border border-line px-4 py-3 text-sm" open={plans.length === 0}>
        <summary className="cursor-pointer select-none font-semibold">Which tool for what</summary>
        <ul className="mt-3 grid gap-3">
          {Object.entries(IMAGE_TOOLS).map(([key, tool]) => (
            <li key={key} className="grid gap-0.5">
              <a href={tool.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent hover:underline">
                {tool.label} ↗
              </a>
              <span className="text-muted">{tool.bestFor}</span>
              <span className="text-xs text-faint">{tool.works}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-faint">
          From public comparisons in November 2026. Versions, prices and commercial licensing change: check them in the tool
          before you publish. Georgian words are best added in Canva or Figma, not generated in the image.
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
        <EmptyState>No image plans yet. Open some copy or a script and press Make AI image prompts.</EmptyState>
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
                  {IMAGE_TOOLS[plan.tool as ImageTool]?.label ?? plan.tool} · {IMAGE_FORMATS[plan.format as ImageFormat]?.label ?? plan.format}
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
