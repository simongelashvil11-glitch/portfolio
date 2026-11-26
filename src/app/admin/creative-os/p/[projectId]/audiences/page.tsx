import { and, asc, desc, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import type { ReactNode } from "react";

import { deleteSegment, previewResearch, setSegmentFocus } from "@/actions/creative-os-research";
import { DeleteForm } from "@/components/admin/delete-form";
import { EmptyState } from "@/components/admin/ui";
import { AuthorizeDialog } from "@/components/creative-os/authorize-dialog";
import { RunNotes, TagList } from "@/components/creative-os/research-view";
import { db } from "@/db";
import { cosAudienceSegments, cosCustomerInsights, cosResearchRuns, type CosAudienceSegment } from "@/db/creative-os";
import { AWARENESS_LABEL } from "@/lib/creative-os/elements";
import { enabledModels } from "@/lib/creative-os/pricing";
import { getProjectOr404 } from "@/lib/creative-os/queries";
import { KNOWLEDGE_CHOICE } from "@/lib/creative-os/research-labels";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audiences" };

const ROWS: { label: string; render: (segment: CosAudienceSegment) => ReactNode }[] = [
  { label: "Situation", render: (s) => s.situation },
  { label: "Primary problem", render: (s) => s.primaryProblem },
  { label: "Secondary problems", render: (s) => <TagList items={s.secondaryProblems} /> },
  { label: "Desired transformation", render: (s) => s.desiredTransformation },
  { label: "Emotional motivations", render: (s) => <TagList items={s.emotionalMotivations} /> },
  { label: "Purchase objections", render: (s) => <TagList items={s.objections} /> },
  { label: "Existing beliefs", render: (s) => <TagList items={s.beliefs} /> },
  { label: "Previous solutions tried", render: (s) => <TagList items={s.previousSolutions} /> },
  { label: "Buying triggers", render: (s) => <TagList items={s.buyingTriggers} /> },
  { label: "Relevant product benefits", render: (s) => <TagList items={s.relevantBenefits} /> },
  { label: "Recommended messaging", render: (s) => <TagList items={s.recommendedMessaging} /> },
  { label: "Recommended formats", render: (s) => <TagList items={s.recommendedFormats} /> },
  {
    label: "Awareness stage",
    render: (s) => AWARENESS_LABEL[s.awarenessStage as keyof typeof AWARENESS_LABEL] ?? s.awarenessStage,
  },
  { label: "How well it is supported", render: (s) => s.evidenceNote ?? "—" },
];

export default async function AudiencesPage({ params }: PageProps<"/admin/creative-os/p/[projectId]/audiences">) {
  const project = await getProjectOr404((await params).projectId);
  const base = `/admin/creative-os/p/${project.id}/audiences`;

  const [segments, [lastRun], models] = await Promise.all([
    db
      .select()
      .from(cosAudienceSegments)
      .where(eq(cosAudienceSegments.projectId, project.id))
      .orderBy(desc(cosAudienceSegments.focus), asc(cosAudienceSegments.position), asc(cosAudienceSegments.id)),
    db
      .select()
      .from(cosResearchRuns)
      .where(and(eq(cosResearchRuns.projectId, project.id), eq(cosResearchRuns.kind, "audience_segments")))
      .orderBy(desc(cosResearchRuns.createdAt))
      .limit(1),
    enabledModels(),
  ]);
  const insightIds = [...new Set(segments.flatMap((segment) => segment.supportingInsightIds))];
  const insights = insightIds.length
    ? await db
        .select({ id: cosCustomerInsights.id, statement: cosCustomerInsights.statement, isQuote: cosCustomerInsights.isQuote })
        .from(cosCustomerInsights)
        .where(and(eq(cosCustomerInsights.projectId, project.id), inArray(cosCustomerInsights.id, insightIds)))
    : [];
  const insightById = new Map(insights.map((insight) => [insight.id, insight]));

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-2xl text-sm text-muted">
          Audience segments built from this project&apos;s customer insights and product research. Each cites the insights it
          rests on. Demographics are never presented as facts. Edit any segment; edited ones are kept when you generate again.
          Star the one to develop concepts for.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href={`${base}/new`} className="btn btn-secondary">
            Add a segment
          </Link>
          <AuthorizeDialog
            triggerLabel={segments.length ? "Generate again" : "Generate segments"}
            title="Audience segments"
            description="Builds distinct segments, each with situation, problems, desired transformation, motivations, objections, beliefs, previous solutions, triggers, the benefits that matter to it, and recommended messaging and formats. Uses the research already saved; no web access."
            models={models}
            preview={previewResearch.bind(null, "audience_segments", project.id)}
            endpoint="/admin/creative-os/api/research"
            body={{ module: "audience_segments", targetId: project.id }}
            choices={[
              {
                name: "count",
                label: "How many segments",
                defaultValue: "4",
                options: ["3", "4", "5", "6"].map((value) => ({ value, label: value })),
              },
              {
                name: "mode",
                label: "Existing segments",
                defaultValue: "replace",
                options: [
                  { value: "replace", label: "Replace", hint: "Segments you have edited or starred are kept; the others are replaced." },
                  { value: "add", label: "Keep all", hint: "New segments are added beside the current ones." },
                ],
              },
              KNOWLEDGE_CHOICE,
            ]}
            durationHint="usually 30–90 seconds"
          />
        </div>
      </div>

      <RunNotes run={lastRun} />

      {segments.length === 0 ? (
        <EmptyState>No segments yet. Research customers first, then generate segments from what was found.</EmptyState>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-left text-sm" style={{ minWidth: `${12 + segments.length * 17}rem` }}>
            <thead>
              <tr className="border-b border-line align-top">
                <th className="sticky left-0 z-10 w-44 bg-background px-4 py-3 text-xs font-medium text-faint">Segment</th>
                {segments.map((segment) => (
                  <th key={segment.id} className={cn("min-w-[16rem] px-4 py-3", segment.focus && "bg-accent-soft")}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold">{segment.personaName}</span>
                      <span className="flex shrink-0 items-center">
                        <form action={setSegmentFocus}>
                          <input type="hidden" name="id" value={segment.id} />
                          <input type="hidden" name="projectId" value={project.id} />
                          <input type="hidden" name="focus" value={segment.focus ? "false" : "true"} />
                          <button
                            type="submit"
                            aria-pressed={segment.focus}
                            title={segment.focus ? "The segment you are developing concepts for" : "Develop concepts for this segment"}
                            className={cn("btn btn-subtle btn-icon !min-h-7 !min-w-7", segment.focus ? "text-accent-hover" : "text-faint")}
                          >
                            {segment.focus ? "★" : "☆"}
                          </button>
                        </form>
                        <DeleteForm action={deleteSegment} id={segment.id} compact confirmMessage={`Delete ${segment.personaName}?`} />
                      </span>
                    </div>
                    <div className="mt-1 flex gap-3 text-xs font-normal">
                      <Link href={`${base}/${segment.id}`} className="text-accent hover:underline">
                        Edit
                      </Link>
                      {segment.edited ? <span className="text-faint">Edited by you</span> : null}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label} className="border-b border-line align-top">
                  <th scope="row" className="sticky left-0 z-10 bg-background px-4 py-3 text-xs font-semibold text-muted">
                    {row.label}
                  </th>
                  {segments.map((segment) => (
                    <td key={segment.id} className={cn("px-4 py-3 leading-5", segment.focus && "bg-accent-soft/40")}>
                      {row.render(segment)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="align-top">
                <th scope="row" className="sticky left-0 z-10 bg-background px-4 py-3 text-xs font-semibold text-muted">
                  Supporting research
                </th>
                {segments.map((segment) => {
                  const cited = segment.supportingInsightIds.map((id) => insightById.get(id)).filter(Boolean);
                  return (
                    <td key={segment.id} className={cn("px-4 py-3 text-xs leading-5 text-muted", segment.focus && "bg-accent-soft/40")}>
                      {cited.length === 0 ? (
                        <span className="text-faint">No insights cited</span>
                      ) : (
                        <ul className="grid gap-1.5">
                          {cited.slice(0, 4).map((insight) => (
                            <li key={insight!.id}>{insight!.isQuote ? `“${insight!.statement}”` : insight!.statement}</li>
                          ))}
                          {cited.length > 4 ? <li className="text-faint">and {cited.length - 4} more</li> : null}
                        </ul>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
