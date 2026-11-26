import { and, desc, eq, inArray, sql } from "drizzle-orm";
import Link from "next/link";

import { previewResearch } from "@/actions/creative-os-research";
import { setAngleStatus } from "@/actions/creative-os-writing";
import { Pill } from "@/components/admin/stats";
import { EmptyState } from "@/components/admin/ui";
import { AuthorizeDialog, type RunChoice } from "@/components/creative-os/authorize-dialog";
import { RunNotes } from "@/components/creative-os/research-view";
import { db } from "@/db";
import { cosAngles, cosHooks, cosResearchRuns } from "@/db/creative-os";
import { ANGLE_CATEGORY_LABEL, ANGLE_STATUS_LABEL, type ANGLE_CATEGORIES } from "@/lib/creative-os/creative-labels";
import { AWARENESS_LABEL } from "@/lib/creative-os/elements";
import { enabledModels } from "@/lib/creative-os/pricing";
import { getProjectOr404, getWritingChoices } from "@/lib/creative-os/queries";
import { KNOWLEDGE_CHOICE } from "@/lib/creative-os/research-labels";
import { productChoice, segmentChoice } from "@/lib/creative-os/writing-choices";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Angles" };

const VIEWS = {
  active: { label: "Working set", statuses: ["idea", "prioritized", "approved"] },
  approved: { label: "Approved", statuses: ["approved"] },
  rejected: { label: "Rejected", statuses: ["rejected"] },
  archived: { label: "Archived", statuses: ["archived"] },
} as const;

const STATUS_TONE: Record<string, string> = {
  idea: "border-line-strong text-muted",
  prioritized: "border-[#b4d6fa] bg-[#ebf3fc] text-[#0f548c]",
  approved: "border-[#9fd89f] bg-[#f1faf1] text-[#0e700e]",
  rejected: "border-[#f1bbbc] bg-[#fdf3f4] text-danger",
  archived: "border-line-strong bg-surface text-faint",
};

export default async function AnglesPage({ params, searchParams }: PageProps<"/admin/creative-os/p/[projectId]/angles">) {
  const project = await getProjectOr404((await params).projectId);
  const view = ((await searchParams).view as keyof typeof VIEWS) in VIEWS ? ((await searchParams).view as keyof typeof VIEWS) : "active";
  const base = `/admin/creative-os/p/${project.id}/angles`;

  const [angles, choices, [lastRun], models] = await Promise.all([
    db
      .select({
        angle: cosAngles,
        hooks: sql<number>`(select count(*)::int from ${cosHooks} where ${cosHooks.angleId} = ${cosAngles.id})`,
      })
      .from(cosAngles)
      .where(and(eq(cosAngles.projectId, project.id), inArray(cosAngles.status, [...VIEWS[view].statuses])))
      .orderBy(sql`case ${cosAngles.status} when 'approved' then 0 when 'prioritized' then 1 else 2 end`, desc(cosAngles.createdAt)),
    getWritingChoices(project.id),
    db
      .select()
      .from(cosResearchRuns)
      .where(and(eq(cosResearchRuns.projectId, project.id), eq(cosResearchRuns.kind, "angle_generation")))
      .orderBy(desc(cosResearchRuns.createdAt))
      .limit(1),
    enabledModels(),
  ]);

  const dialogChoices = [
    productChoice(choices.products),
    segmentChoice(choices.segments),
    {
      name: "count",
      label: "How many angles",
      defaultValue: "5",
      options: ["3", "5", "8"].map((value) => ({ value, label: value })),
      hint: "Fewer, distinct angles beat many similar ones.",
    },
    KNOWLEDGE_CHOICE,
  ].filter((choice): choice is RunChoice => choice !== null);

  const statusButton = (angleId: number, status: string, label: string) => (
    <form action={setAngleStatus}>
      <input type="hidden" name="id" value={angleId} />
      <input type="hidden" name="status" value={status} />
      <button type="submit" className="btn btn-subtle !min-h-7 !px-2 text-xs">
        {label}
      </button>
    </form>
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-2xl text-sm text-muted">
          Marketing angles: distinct routes into the customer&apos;s mind, each built from this project&apos;s research and
          citing the customer insights behind it. Prioritise, approve or reject them; approved angles feed hooks and scripts.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href={`${base}/new`} className="btn btn-secondary">
            Write one yourself
          </Link>
          <AuthorizeDialog
            triggerLabel="Generate angles"
            title="Marketing angles"
            description="Develops distinct angles from the research saved in this project: customer insights (bookmarked first), product research, segments, awareness and the market's saturated angles. Each comes with its hypothesis, evidence, hooks, proof needed, weaknesses and a test plan. No web access."
            models={models}
            preview={previewResearch.bind(null, "angle_generation", project.id)}
            endpoint="/admin/creative-os/api/research"
            body={{ module: "angle_generation", targetId: project.id }}
            choices={dialogChoices}
            durationHint="usually 40–90 seconds"
          />
        </div>
      </div>

      <RunNotes run={lastRun} />

      <nav aria-label="Which angles" className="flex flex-wrap gap-1.5">
        {Object.entries(VIEWS).map(([key, item]) => (
          <Pill key={key} href={key === "active" ? base : `${base}?view=${key}`} active={view === key}>
            {item.label}
          </Pill>
        ))}
      </nav>

      {angles.length === 0 ? (
        <EmptyState>
          {view === "active"
            ? "No angles yet. Generate them from your research, or write one yourself. They work best after Voice of Customer research with a few bookmarked insights."
            : "None here."}
        </EmptyState>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead className="text-xs text-faint">
              <tr className="border-b border-line">
                <th className="px-4 py-2 font-medium">Angle</th>
                <th className="px-3 py-2 font-medium">Awareness</th>
                <th className="px-3 py-2 font-medium">Pain → desire</th>
                <th className="px-3 py-2 font-medium">Core message</th>
                <th className="px-3 py-2 font-medium">Format</th>
                <th className="px-3 py-2 font-medium">Evidence</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {angles.map(({ angle, hooks }) => (
                <tr key={angle.id} className="border-b border-line align-top last:border-0">
                  <td className="max-w-[16rem] px-4 py-3">
                    <Link href={`${base}/${angle.id}`} className="font-semibold hover:underline">
                      {angle.name}
                    </Link>
                    <span className="block text-xs text-faint">
                      {ANGLE_CATEGORY_LABEL[angle.category as (typeof ANGLE_CATEGORIES)[number]] ?? angle.category}
                      {hooks ? ` · ${hooks} hooks` : ""}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-muted">{AWARENESS_LABEL[angle.awarenessStage as keyof typeof AWARENESS_LABEL] ?? angle.awarenessStage}</td>
                  <td className="max-w-[16rem] px-3 py-3">
                    {angle.painPoint ? <span className="block">{angle.painPoint}</span> : null}
                    {angle.desire ? <span className="mt-1 block text-muted">→ {angle.desire}</span> : null}
                  </td>
                  <td className="max-w-[18rem] px-3 py-3">{angle.coreMessage}</td>
                  <td className="max-w-[10rem] px-3 py-3 text-muted">{angle.recommendedFormat ?? "—"}</td>
                  <td className="px-3 py-3 text-muted">{angle.evidenceInsightIds.length ? `${angle.evidenceInsightIds.length} ${angle.evidenceInsightIds.length === 1 ? "insight" : "insights"}` : "—"}</td>
                  <td className="w-[10rem] px-4 py-3">
                    <span className={cn("inline-block whitespace-nowrap rounded-[4px] border px-1.5 py-px text-[11px] font-semibold", STATUS_TONE[angle.status])}>
                      {ANGLE_STATUS_LABEL[angle.status] ?? angle.status}
                    </span>
                    <div className="mt-1 flex flex-wrap gap-0.5">
                      {angle.status !== "approved" ? statusButton(angle.id, "approved", "Approve") : null}
                      {angle.status === "idea" ? statusButton(angle.id, "prioritized", "Prioritise") : null}
                      {angle.status !== "rejected" ? statusButton(angle.id, "rejected", "Reject") : null}
                      {angle.status !== "archived" ? statusButton(angle.id, "archived", "Archive") : statusButton(angle.id, "idea", "Restore")}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
