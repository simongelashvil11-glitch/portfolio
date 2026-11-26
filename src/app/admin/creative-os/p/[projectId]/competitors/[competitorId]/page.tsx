import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { previewResearch, saveCompetitor, setCompetitorStatus } from "@/actions/creative-os-research";
import { EmptyState } from "@/components/admin/ui";
import { AuthorizeDialog } from "@/components/creative-os/authorize-dialog";
import { CompetitorFields, CompetitorLinks } from "@/components/creative-os/competitor-fields";
import { CosForm } from "@/components/creative-os/forms";
import { FindingSection, Limitations, RunMeta, RunNotes } from "@/components/creative-os/research-view";
import { db } from "@/db";
import { cosAiOperations, cosCompetitorProfiles, cosCompetitors, cosResearchRuns } from "@/db/creative-os";
import { enabledModels } from "@/lib/creative-os/pricing";
import { getProjectOr404 } from "@/lib/creative-os/queries";
import type { StoredCompetitorProfile } from "@/lib/creative-os/research/competitors";
import { adLibraryUrl, COMPETITOR_KIND_LABEL, COMPETITOR_SECTIONS, countryCode, depthChoice } from "@/lib/creative-os/research-labels";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/admin/creative-os/p/[projectId]/competitors/[competitorId]">) {
  const [competitor] = await db
    .select({ name: cosCompetitors.name })
    .from(cosCompetitors)
    .where(eq(cosCompetitors.id, Number((await params).competitorId) || 0))
    .limit(1);
  return { title: competitor?.name ?? "Competitor" };
}

export default async function CompetitorPage({ params, searchParams }: PageProps<"/admin/creative-os/p/[projectId]/competitors/[competitorId]">) {
  const { projectId, competitorId } = await params;
  const project = await getProjectOr404(projectId);
  const [competitor] = await db
    .select()
    .from(cosCompetitors)
    .where(and(eq(cosCompetitors.id, Number(competitorId) || 0), eq(cosCompetitors.projectId, project.id)))
    .limit(1);
  if (!competitor) notFound();

  const [profiles, models] = await Promise.all([
    db
      .select({ profile: cosCompetitorProfiles, cost: cosAiOperations.costUsd })
      .from(cosCompetitorProfiles)
      .leftJoin(cosAiOperations, eq(cosAiOperations.id, cosCompetitorProfiles.operationId))
      .where(eq(cosCompetitorProfiles.competitorId, competitor.id))
      .orderBy(desc(cosCompetitorProfiles.createdAt)),
    enabledModels(),
  ]);
  const requested = Number((await searchParams).run);
  const current = profiles.find((row) => row.profile.id === requested) ?? profiles[0] ?? null;
  const result = current ? (current.profile.result as StoredCompetitorProfile) : null;
  const [notes] = current?.profile.operationId
    ? await db.select().from(cosResearchRuns).where(eq(cosResearchRuns.operationId, current.profile.operationId)).limit(1)
    : [];
  const base = `/admin/creative-os/p/${project.id}/competitors`;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href={base} className="text-sm text-accent hover:underline">
            Competitors
          </Link>
          <h2 className="mt-1 text-xl font-semibold leading-7">{competitor.name}</h2>
          <p className="mb-1.5 mt-0.5 text-sm text-muted">
            {COMPETITOR_KIND_LABEL[competitor.kind] ?? competitor.kind}
            {competitor.status !== "tracked" ? ` · ${competitor.status}` : ""}
          </p>
          <CompetitorLinks competitor={competitor} adLibrary={adLibraryUrl(competitor.name, countryCode(project.targetCountries))} />
        </div>
        <div className="flex flex-wrap gap-2">
          {competitor.status !== "tracked" ? (
            <form action={setCompetitorStatus}>
              <input type="hidden" name="id" value={competitor.id} />
              <input type="hidden" name="status" value="tracked" />
              <button type="submit" className="btn btn-secondary">
                Track
              </button>
            </form>
          ) : null}
          <AuthorizeDialog
            triggerLabel={current ? "Research again" : "Research competitor"}
            title={`Competitor research: ${competitor.name}`}
            description="Reads the competitor's website, product and pricing pages, reviews and public messaging, and builds a profile: product range, audience, value propositions, USPs, pricing, offers, ad messages, angles, formats, objections handled, strengths, weaknesses and where you could win."
            models={models}
            preview={previewResearch.bind(null, "competitor_research", competitor.id)}
            endpoint="/admin/creative-os/api/research"
            body={{ module: "competitor_research", targetId: competitor.id }}
            choices={[depthChoice(false)]}
            durationHint="usually 1–3 minutes"
          />
        </div>
      </div>

      {!current || !result ? (
        <EmptyState>Not researched yet. Press Research competitor to choose the depth and model and see the cost first.</EmptyState>
      ) : (
        <>
          <RunMeta
            createdAt={current.profile.createdAt}
            model={current.profile.model}
            cost={current.cost}
            runs={profiles.map((row) => ({ id: row.profile.id }))}
            currentId={current.profile.id}
            hrefFor={(id) => `${base}/${competitor.id}?run=${id}`}
          />
          {result.overview ? <p className="max-w-3xl text-[15px] leading-6">{result.overview}</p> : null}
          <div className="grid gap-4 md:grid-cols-2">
            {COMPETITOR_SECTIONS.map(([key, label]) => (
              <FindingSection key={key} title={label} findings={result.sections[key]} />
            ))}
          </div>
          <Limitations items={result.limitations} />
          <RunNotes run={notes} />
        </>
      )}

      <details className="card p-0">
        <summary className="cursor-pointer select-none p-5 font-semibold">Edit details</summary>
        <div className="border-t border-line p-5">
          <CosForm action={saveCompetitor} submitLabel="Save competitor">
            <input type="hidden" name="projectId" value={project.id} />
            <input type="hidden" name="id" value={competitor.id} />
            <CompetitorFields competitor={competitor} />
          </CosForm>
        </div>
      </details>
    </div>
  );
}
