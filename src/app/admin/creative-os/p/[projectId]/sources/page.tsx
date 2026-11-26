import { and, count, desc, eq, sql, type SQL } from "drizzle-orm";
import Link from "next/link";

import { Pill } from "@/components/admin/stats";
import { EmptyState } from "@/components/admin/ui";
import { db } from "@/db";
import { cosCustomerInsights, cosSources } from "@/db/creative-os";
import { when } from "@/lib/admin-time";
import { count as formatCount } from "@/lib/creative-os/format";
import { getProjectOr404 } from "@/lib/creative-os/queries";
import { ACCESS_STATUS_LABEL, SOURCE_CATEGORY_LABEL } from "@/lib/creative-os/research-labels";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sources" };

export default async function SourcesPage({ params, searchParams }: PageProps<"/admin/creative-os/p/[projectId]/sources">) {
  const project = await getProjectOr404((await params).projectId);
  const status = String((await searchParams).status ?? "");
  const base = `/admin/creative-os/p/${project.id}/sources`;

  const conditions: SQL[] = [eq(cosSources.projectId, project.id)];
  if (status in ACCESS_STATUS_LABEL) conditions.push(eq(cosSources.accessStatus, status));

  const [sources, totals, uses] = await Promise.all([
    db
      .select({
        id: cosSources.id,
        url: cosSources.url,
        domain: cosSources.domain,
        title: cosSources.title,
        category: cosSources.category,
        accessStatus: cosSources.accessStatus,
        accessError: cosSources.accessError,
        published: cosSources.published,
        accessedAt: cosSources.accessedAt,
        chars: sql<number | null>`length(${cosSources.content})`,
      })
      .from(cosSources)
      .where(and(...conditions))
      .orderBy(desc(cosSources.accessedAt))
      .limit(500),
    db
      .select({ status: cosSources.accessStatus, value: count() })
      .from(cosSources)
      .where(eq(cosSources.projectId, project.id))
      .groupBy(cosSources.accessStatus),
    db
      .select({ sourceId: cosCustomerInsights.sourceId, value: count() })
      .from(cosCustomerInsights)
      .where(eq(cosCustomerInsights.projectId, project.id))
      .groupBy(cosCustomerInsights.sourceId),
  ]);
  const total = totals.reduce((sum, row) => sum + row.value, 0);
  const byStatus = new Map(totals.map((row) => [row.status, row.value]));
  const insightCount = new Map(uses.map((row) => [row.sourceId, row.value]));

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <p className="max-w-3xl text-sm text-muted">
        Every page a research run searched up or read for this project, with when it was accessed and whether it could be
        read. Findings link to these. A page marked &ldquo;search result only&rdquo; was listed by a search but not opened, so
        quotes from it could not be checked.
      </p>

      {total === 0 ? (
        <EmptyState>No sources yet. They are recorded automatically when a research run uses the web.</EmptyState>
      ) : (
        <>
          <nav aria-label="Access status" className="flex flex-wrap gap-1.5">
            <Pill href={base} active={!(status in ACCESS_STATUS_LABEL)}>
              All <span className="tnum text-faint">{total}</span>
            </Pill>
            {Object.entries(ACCESS_STATUS_LABEL).map(([key, style]) =>
              byStatus.has(key) ? (
                <Pill key={key} href={`${base}?status=${key}`} active={status === key}>
                  {style.label} <span className="tnum text-faint">{byStatus.get(key)}</span>
                </Pill>
              ) : null,
            )}
          </nav>

          <div className="card overflow-x-auto p-0">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <thead className="text-xs text-faint">
                <tr className="border-b border-line">
                  <th className="px-4 py-2 font-medium">Source</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Access</th>
                  <th className="px-3 py-2 font-medium">Published</th>
                  <th className="px-3 py-2 font-medium">Accessed</th>
                  <th className="px-4 py-2 text-right font-medium">Insights</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((source) => {
                  const style = ACCESS_STATUS_LABEL[source.accessStatus] ?? ACCESS_STATUS_LABEL.search_result;
                  const used = insightCount.get(source.id) ?? 0;
                  return (
                    <tr key={source.id} className="border-b border-line align-top last:border-0">
                      <td className="max-w-[28rem] px-4 py-2.5">
                        <a href={source.url} target="_blank" rel="noopener noreferrer nofollow" className="block truncate font-medium text-accent hover:underline">
                          {source.title || source.url}
                        </a>
                        <span className="block truncate text-xs text-faint">{source.domain}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-muted">{SOURCE_CATEGORY_LABEL[source.category] ?? source.category}</td>
                      <td className="px-3 py-2.5">
                        <span className={cn("inline-block whitespace-nowrap rounded-[4px] border px-1.5 py-px text-[11px] font-semibold", style.className)}>
                          {style.label}
                        </span>
                        {source.accessError ? <span className="mt-0.5 block text-xs text-faint">{source.accessError.replace(/_/g, " ")}</span> : null}
                        {source.chars ? <span className="mt-0.5 block text-xs text-faint">{formatCount(Number(source.chars))} characters kept</span> : null}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-muted">{source.published ?? "—"}</td>
                      <td className="tnum whitespace-nowrap px-3 py-2.5 text-muted">{when(source.accessedAt)}</td>
                      <td className="tnum px-4 py-2.5 text-right">
                        {used ? (
                          <Link href={`/admin/creative-os/p/${project.id}/customers`} className="text-accent hover:underline">
                            {used}
                          </Link>
                        ) : (
                          <span className="text-faint">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
