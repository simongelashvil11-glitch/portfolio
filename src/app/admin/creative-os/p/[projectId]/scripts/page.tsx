import { and, desc, eq, inArray, sql } from "drizzle-orm";
import Link from "next/link";

import { Pill } from "@/components/admin/stats";
import { button, EmptyState } from "@/components/admin/ui";
import { Add } from "@/components/fluent-icons";
import { db } from "@/db";
import { cosAngles, cosScripts, cosScriptVersions } from "@/db/creative-os";
import { when } from "@/lib/admin-time";
import { COPY_KINDS, SCRIPT_STATUS_LABEL, type CopyKind } from "@/lib/creative-os/creative-labels";
import { spokenSeconds } from "@/lib/creative-os/format";
import { getProjectOr404 } from "@/lib/creative-os/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Scripts and copy" };

export default async function ScriptsPage({ params, searchParams }: PageProps<"/admin/creative-os/p/[projectId]/scripts">) {
  const project = await getProjectOr404((await params).projectId);
  const base = `/admin/creative-os/p/${project.id}/scripts`;
  const view = (await searchParams).view === "archived" ? "archived" : (await searchParams).view === "approved" ? "approved" : "active";
  const statuses = view === "archived" ? ["archived"] : view === "approved" ? ["approved"] : ["draft", "approved"];

  const scripts = await db
    .select({
      script: cosScripts,
      angle: cosAngles.name,
      versions: sql<number>`(select count(*)::int from ${cosScriptVersions} where ${cosScriptVersions.scriptId} = ${cosScripts.id})`,
    })
    .from(cosScripts)
    .leftJoin(cosAngles, eq(cosAngles.id, cosScripts.angleId))
    .where(and(eq(cosScripts.projectId, project.id), inArray(cosScripts.status, statuses)))
    .orderBy(desc(cosScripts.updatedAt));

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-2xl text-sm text-muted">
          Scripts and ad copy. Fill in a short brief (free), then let Claude write it from your research when you authorize it.
          Edit freely: changes save themselves without any AI, every version is kept, and one section can be rewritten at a time.
        </p>
        <Link href={`${base}/new`} className={button.primary}>
          <Add />
          New script or copy
        </Link>
      </div>

      <nav aria-label="Which scripts" className="flex flex-wrap gap-1.5">
        <Pill href={base} active={view === "active"}>
          Drafts and approved
        </Pill>
        <Pill href={`${base}?view=approved`} active={view === "approved"}>
          Approved
        </Pill>
        <Pill href={`${base}?view=archived`} active={view === "archived"}>
          Archived
        </Pill>
      </nav>

      {scripts.length === 0 ? (
        <EmptyState>Nothing here yet. Start with New script or copy, or from an angle or hook.</EmptyState>
      ) : (
        <ul className="grid gap-3">
          {scripts.map(({ script, angle, versions }) => {
            const words = script.working.map((section) => section.text).join(" ").trim().split(/\s+/).filter(Boolean).length;
            const video = COPY_KINDS[script.kind as CopyKind]?.video;
            return (
              <li key={script.id}>
                <Link href={`${base}/${script.id}`} className="card card-interactive block p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold">{script.title}</span>
                    <span
                      className={cn(
                        "rounded-[4px] border px-1.5 py-px text-[11px] font-semibold",
                        script.status === "approved" ? "border-[#9fd89f] bg-[#f1faf1] text-[#0e700e]" : "border-line-strong text-muted",
                      )}
                    >
                      {SCRIPT_STATUS_LABEL[script.status] ?? script.status}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted">
                    {[COPY_KINDS[script.kind as CopyKind]?.label ?? script.kind, script.language, angle ? `angle: ${angle}` : null].filter(Boolean).join(" · ")}
                  </p>
                  <p className="mt-1.5 text-xs text-faint">
                    {words ? `${words} words${video ? ` · about ${spokenSeconds(script.working.map((section) => section.text).join(" "))} s spoken` : ""}` : "Not written yet"}
                    {versions ? ` · ${versions} ${versions === 1 ? "version" : "versions"}` : ""} · updated {when(script.updatedAt)}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
