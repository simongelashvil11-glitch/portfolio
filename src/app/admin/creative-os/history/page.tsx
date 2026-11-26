import { desc, eq } from "drizzle-orm";
import Link from "next/link";

import { Panel } from "@/components/admin/stats";
import { EmptyState, PageHeading } from "@/components/admin/ui";
import { db } from "@/db";
import { cosAds, cosAiOperations, cosProjects } from "@/db/creative-os";
import { when } from "@/lib/admin-time";
import { count, STATUS_LABEL, usd } from "@/lib/creative-os/format";
import { OPERATION_KIND_LABEL } from "@/lib/creative-os/labels";
import { expireStaleOperations } from "@/lib/creative-os/operations";

export const dynamic = "force-dynamic";
export const metadata = { title: "Research history" };

const STATUS_TONE: Record<string, string> = {
  completed: "bg-[#f1faf1] text-[#0e700e] border-[#9fd89f]",
  running: "bg-accent-soft text-accent-hover border-[#b4d6fa]",
  failed: "bg-[#fdf3f4] text-danger border-[#f1bbbc]",
  refused: "bg-[#fdf3f4] text-danger border-[#f1bbbc]",
  cancelled: "bg-surface text-muted border-line-strong",
  blocked: "bg-surface text-muted border-line-strong",
};

export default async function HistoryPage() {
  await expireStaleOperations();
  const rows = await db
    .select({ operation: cosAiOperations, project: cosProjects.name, adTitle: cosAds.title, adProject: cosAds.projectId })
    .from(cosAiOperations)
    .leftJoin(cosProjects, eq(cosProjects.id, cosAiOperations.projectId))
    .leftJoin(cosAds, eq(cosAds.id, cosAiOperations.targetId))
    .orderBy(desc(cosAiOperations.authorizedAt))
    .limit(200);

  return (
    <>
      <PageHeading
        title="Research history"
        description="Every paid operation you authorized: what it was, the model, its status and what it cost. Results stay saved with the item they belong to."
      />
      {rows.length === 0 ? (
        <EmptyState>No paid operations yet. They appear here from the moment you authorize one.</EmptyState>
      ) : (
        <Panel title={`Operations (${rows.length})`}>
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead className="text-xs text-faint">
                <tr className="border-b border-line">
                  <th className="px-5 py-2 font-medium">When</th>
                  <th className="px-2 py-2 font-medium">Operation</th>
                  <th className="px-2 py-2 font-medium">Project</th>
                  <th className="px-2 py-2 font-medium">Model</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 text-right font-medium">Tokens in / out</th>
                  <th className="px-5 py-2 text-right font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ operation, project, adTitle, adProject }) => {
                  const target =
                    operation.targetType === "ad" && adTitle && adProject
                      ? { href: `/admin/creative-os/p/${adProject}/ads/${operation.targetId}`, label: adTitle }
                      : null;
                  return (
                    <tr key={operation.id} className="border-b border-line align-top last:border-0">
                      <td className="tnum whitespace-nowrap px-5 py-2.5 text-muted">{when(operation.authorizedAt)}</td>
                      <td className="px-2 py-2.5">
                        <span className="font-semibold">{OPERATION_KIND_LABEL[operation.kind] ?? operation.kind}</span>
                        {target ? (
                          <Link href={target.href} className="block max-w-[16rem] truncate text-xs text-accent hover:underline">
                            {target.label}
                          </Link>
                        ) : null}
                        {operation.error ? <span className="mt-0.5 block max-w-[22rem] text-xs text-danger">{operation.error}</span> : null}
                      </td>
                      <td className="max-w-[10rem] truncate px-2 py-2.5 text-muted">{project ?? "—"}</td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-muted">
                        {operation.model}
                        {operation.effort ? <span className="block text-xs text-faint">{operation.effort} effort</span> : null}
                      </td>
                      <td className="px-2 py-2.5">
                        <span className={`inline-block whitespace-nowrap rounded-[4px] border px-1.5 py-px text-[11px] font-semibold ${STATUS_TONE[operation.status] ?? ""}`}>
                          {STATUS_LABEL[operation.status] ?? operation.status}
                        </span>
                      </td>
                      <td className="tnum whitespace-nowrap px-2 py-2.5 text-right text-muted">
                        {operation.inputTokens === null ? "—" : `${count(operation.inputTokens)} / ${count(operation.outputTokens)}`}
                      </td>
                      <td className="tnum whitespace-nowrap px-5 py-2.5 text-right">
                        {operation.costUsd !== null ? (
                          usd(operation.costUsd)
                        ) : operation.status === "blocked" ? (
                          "—"
                        ) : (
                          <span className="text-muted" title="Usage was not reported, so the worst case is counted.">
                            ≤ {usd(operation.estimateHighUsd)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </>
  );
}
