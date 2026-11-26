import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";

import { previewResearch } from "@/actions/creative-os-research";
import { EmptyState } from "@/components/admin/ui";
import { AuthorizeDialog } from "@/components/creative-os/authorize-dialog";
import { EvidenceBadge, Limitations, RunMeta } from "@/components/creative-os/research-view";
import { db } from "@/db";
import { cosAiOperations, cosCompetitorProfiles, cosCompetitors, cosMarketAnalyses } from "@/db/creative-os";
import { enabledModels } from "@/lib/creative-os/pricing";
import { getProjectOr404 } from "@/lib/creative-os/queries";
import type { StoredCompetitorProfile, StoredMarketAnalysis } from "@/lib/creative-os/research/competitors";
import { COMPETITOR_SECTIONS } from "@/lib/creative-os/research-labels";

export const dynamic = "force-dynamic";
export const metadata = { title: "Competitor matrix" };

const SHOWN = 3;

export default async function MatrixPage({ params }: PageProps<"/admin/creative-os/p/[projectId]/competitors/matrix">) {
  const project = await getProjectOr404((await params).projectId);
  const base = `/admin/creative-os/p/${project.id}/competitors`;

  const [rows, [analysis], models] = await Promise.all([
    db
      .select({ competitor: cosCompetitors, profile: cosCompetitorProfiles })
      .from(cosCompetitorProfiles)
      .innerJoin(cosCompetitors, eq(cosCompetitors.id, cosCompetitorProfiles.competitorId))
      .where(and(eq(cosCompetitorProfiles.projectId, project.id), eq(cosCompetitors.status, "tracked")))
      .orderBy(desc(cosCompetitorProfiles.createdAt)),
    db
      .select({ analysis: cosMarketAnalyses, cost: cosAiOperations.costUsd })
      .from(cosMarketAnalyses)
      .leftJoin(cosAiOperations, eq(cosAiOperations.id, cosMarketAnalyses.operationId))
      .where(eq(cosMarketAnalyses.projectId, project.id))
      .orderBy(desc(cosMarketAnalyses.createdAt))
      .limit(1),
    enabledModels(),
  ]);
  const latest = new Map<number, { name: string; result: StoredCompetitorProfile }>();
  for (const row of rows) {
    if (!latest.has(row.competitor.id)) latest.set(row.competitor.id, { name: row.competitor.name, result: row.profile.result as StoredCompetitorProfile });
  }
  const columns = [...latest.entries()];
  const market = analysis ? (analysis.analysis.result as StoredMarketAnalysis) : null;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href={base} className="text-sm text-accent hover:underline">
            Competitors
          </Link>
          <h2 className="mt-1 text-xl font-semibold leading-7">Comparison matrix</h2>
          <p className="mt-0.5 max-w-2xl text-sm text-muted">
            The latest profile of every tracked competitor, side by side. Market patterns reads them all and names the shared
            messages, the saturated angles and the gaps.
          </p>
        </div>
        <AuthorizeDialog
          triggerLabel={market ? "Find patterns again" : "Find market patterns"}
          title="Market patterns"
          description="Reads the latest profiles of your tracked competitors, plus your own product research, and names the messaging patterns, saturated angles, market gaps and differentiation opportunities. No web access."
          models={models}
          preview={previewResearch.bind(null, "market_patterns", project.id)}
          endpoint="/admin/creative-os/api/research"
          body={{ module: "market_patterns", targetId: project.id }}
          disabledReason={columns.length < 2 ? "Research at least two competitors first." : null}
          durationHint="usually 30–90 seconds"
        />
      </div>

      {market && analysis ? (
        <section aria-labelledby="patterns" className="grid gap-4">
          <h3 id="patterns" className="text-base font-semibold leading-[22px]">
            Market patterns
          </h3>
          <RunMeta createdAt={analysis.analysis.createdAt} model={analysis.analysis.model} cost={analysis.cost} />
          {market.summary ? <p className="max-w-3xl text-[15px] leading-6">{market.summary}</p> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <section className="card grid content-start gap-3 p-4">
              <h4 className="text-sm font-semibold">Messaging patterns</h4>
              <ul className="grid gap-2 text-sm">
                {market.messaging_patterns.map((item, index) => (
                  <li key={index}>
                    <p className="font-medium">{item.pattern}</p>
                    <p className="text-xs text-muted">
                      {item.competitors.join(", ")}
                      {item.evidence ? ` — ${item.evidence}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
            <section className="card grid content-start gap-3 p-4">
              <h4 className="text-sm font-semibold">Saturated angles</h4>
              <ul className="grid gap-2 text-sm">
                {market.saturated_angles.map((item, index) => (
                  <li key={index}>
                    <p className="font-medium">{item.angle}</p>
                    <p className="text-xs text-muted">
                      {item.competitors.join(", ")}
                      {item.why_saturated ? ` — ${item.why_saturated}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
            <section className="card grid content-start gap-3 p-4">
              <h4 className="text-sm font-semibold">Market gaps</h4>
              <ul className="grid gap-2 text-sm">
                {market.market_gaps.map((item, index) => (
                  <li key={index} className="grid gap-1">
                    <p className="font-medium">{item.gap}</p>
                    <p className="text-xs text-muted">{item.evidence}</p>
                    <EvidenceBadge type={item.evidence_type} />
                  </li>
                ))}
              </ul>
            </section>
            <section className="card grid content-start gap-3 p-4">
              <h4 className="text-sm font-semibold">Differentiation opportunities</h4>
              <ul className="grid gap-2 text-sm">
                {market.differentiation_opportunities.map((item, index) => (
                  <li key={index} className="grid gap-1">
                    <p className="font-medium">{item.opportunity}</p>
                    <p className="text-xs text-muted">{item.rationale}</p>
                    <EvidenceBadge type={item.evidence_type} />
                  </li>
                ))}
              </ul>
            </section>
          </div>
          <Limitations items={market.limitations} />
        </section>
      ) : null}

      {columns.length === 0 ? (
        <EmptyState>No competitor has been researched yet. Open a tracked competitor and press Research competitor.</EmptyState>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-left text-sm" style={{ minWidth: `${12 + columns.length * 17}rem` }}>
            <thead>
              <tr className="border-b border-line align-top">
                <th className="sticky left-0 z-10 w-44 bg-background px-4 py-3 text-xs font-medium text-faint"> </th>
                {columns.map(([id, column]) => (
                  <th key={id} className="min-w-[16rem] px-4 py-3">
                    <Link href={`${base}/${id}`} className="font-semibold hover:underline">
                      {column.name}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-line align-top">
                <th scope="row" className="sticky left-0 z-10 bg-background px-4 py-3 text-xs font-semibold text-muted">
                  Overview
                </th>
                {columns.map(([id, column]) => (
                  <td key={id} className="px-4 py-3 leading-5">
                    {column.result.overview || "—"}
                  </td>
                ))}
              </tr>
              {COMPETITOR_SECTIONS.map(([key, label]) => (
                <tr key={key} className="border-b border-line align-top last:border-0">
                  <th scope="row" className="sticky left-0 z-10 bg-background px-4 py-3 text-xs font-semibold text-muted">
                    {label}
                  </th>
                  {columns.map(([id, column]) => {
                    const findings = column.result.sections[key] ?? [];
                    return (
                      <td key={id} className="px-4 py-3 leading-5">
                        {findings.length === 0 ? (
                          <span className="text-faint">Not found</span>
                        ) : (
                          <ul className="grid list-disc gap-1 pl-4">
                            {findings.slice(0, SHOWN).map((finding, index) => (
                              <li key={index}>{finding.text}</li>
                            ))}
                            {findings.length > SHOWN ? <li className="list-none text-xs text-faint">and {findings.length - SHOWN} more</li> : null}
                          </ul>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
