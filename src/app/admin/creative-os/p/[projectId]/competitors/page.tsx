import { and, asc, desc, eq, max } from "drizzle-orm";
import Link from "next/link";

import { deleteCompetitor, previewResearch, saveCompetitor, setCompetitorStatus } from "@/actions/creative-os-research";
import { DeleteForm } from "@/components/admin/delete-form";
import { EmptyState } from "@/components/admin/ui";
import { AuthorizeDialog } from "@/components/creative-os/authorize-dialog";
import { CompetitorFields, CompetitorLinks } from "@/components/creative-os/competitor-fields";
import { CosForm } from "@/components/creative-os/forms";
import { RunNotes, SourceLinks } from "@/components/creative-os/research-view";
import { db } from "@/db";
import { cosCompetitorProfiles, cosCompetitors, cosResearchRuns, type CosCompetitor } from "@/db/creative-os";
import { when } from "@/lib/admin-time";
import { enabledModels } from "@/lib/creative-os/pricing";
import { getProjectOr404 } from "@/lib/creative-os/queries";
import { adLibraryUrl, COMPETITOR_KIND_LABEL, countryCode, depthChoice } from "@/lib/creative-os/research-labels";

export const dynamic = "force-dynamic";
export const metadata = { title: "Competitors" };

type Discovery = { why?: string; overlap?: string; websiteSeen?: boolean; sources?: { url: string; seen: boolean }[] };

export default async function CompetitorsPage({ params }: PageProps<"/admin/creative-os/p/[projectId]/competitors">) {
  const project = await getProjectOr404((await params).projectId);
  const base = `/admin/creative-os/p/${project.id}/competitors`;
  const country = countryCode(project.targetCountries);

  const [competitors, profiled, [lastRun], models] = await Promise.all([
    db.select().from(cosCompetitors).where(eq(cosCompetitors.projectId, project.id)).orderBy(asc(cosCompetitors.name)),
    db
      .select({ competitorId: cosCompetitorProfiles.competitorId, at: max(cosCompetitorProfiles.createdAt) })
      .from(cosCompetitorProfiles)
      .where(eq(cosCompetitorProfiles.projectId, project.id))
      .groupBy(cosCompetitorProfiles.competitorId),
    db
      .select()
      .from(cosResearchRuns)
      .where(and(eq(cosResearchRuns.projectId, project.id), eq(cosResearchRuns.kind, "competitor_discovery")))
      .orderBy(desc(cosResearchRuns.createdAt))
      .limit(1),
    enabledModels(),
  ]);
  const lastProfiled = new Map(profiled.map((row) => [row.competitorId, row.at]));
  const tracked = competitors.filter((item) => item.status === "tracked");
  const suggested = competitors.filter((item) => item.status === "suggested");
  const dismissed = competitors.filter((item) => item.status === "dismissed");

  const statusButton = (competitor: CosCompetitor, status: string, label: string, primary = false) => (
    <form action={setCompetitorStatus}>
      <input type="hidden" name="id" value={competitor.id} />
      <input type="hidden" name="status" value={status} />
      <button type="submit" className={primary ? "btn btn-primary" : "btn btn-secondary"}>
        {label}
      </button>
    </form>
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-2xl text-sm text-muted">
          The brands competing for the same customers. Add them yourself, or let Find my rivals search for them; suggestions
          wait here until you accept them. Ads are not scraped: each competitor links to its Meta Ad Library results
          {country ? ` for ${country}` : ""}, for you to open; save the ones worth studying with the{" "}
          <Link href="/admin/creative-os/guide#extension" className="text-accent hover:underline">
            Chrome extension
          </Link>
          .
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href={`${base}/matrix`} className="btn btn-secondary">
            Comparison matrix
          </Link>
          <AuthorizeDialog
            triggerLabel="Find my rivals"
            title="Find my rivals"
            description="Searches the web for brands selling to the same customers in your target countries: direct and indirect competitors and alternative solutions, each with why it competes and where it overlaps. Results are suggestions until you accept them."
            models={models}
            preview={previewResearch.bind(null, "competitor_discovery", project.id)}
            endpoint="/admin/creative-os/api/research"
            body={{ module: "competitor_discovery", targetId: project.id }}
            choices={[
              {
                name: "count",
                label: "How many",
                defaultValue: "8",
                options: ["5", "8", "12"].map((value) => ({ value, label: `Up to ${value}` })),
              },
              depthChoice(false),
            ]}
            durationHint="usually 1–2 minutes"
          />
        </div>
      </div>

      <RunNotes run={lastRun} />

      {suggested.length > 0 ? (
        <section aria-labelledby="suggested" className="grid gap-3">
          <h2 id="suggested" className="text-base font-semibold leading-[22px]">
            Suggested <span className="tnum font-normal text-faint">{suggested.length}</span>
          </h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {suggested.map((competitor) => {
              const discovery = (competitor.discovery ?? {}) as Discovery;
              return (
                <li key={competitor.id} className="card grid content-start gap-2 p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold">{competitor.name}</span>
                    <span className="text-xs text-faint">{COMPETITOR_KIND_LABEL[competitor.kind] ?? competitor.kind}</span>
                  </div>
                  {discovery.why ? <p className="text-sm">{discovery.why}</p> : null}
                  {discovery.overlap ? <p className="text-sm text-muted">Overlap: {discovery.overlap}</p> : null}
                  <CompetitorLinks competitor={competitor} adLibrary={adLibraryUrl(competitor.name, country)} />
                  {competitor.website && discovery.websiteSeen === false ? (
                    <p className="text-xs text-danger">The website address was not returned by the research; check it.</p>
                  ) : null}
                  {discovery.sources?.length ? (
                    <p className="text-xs text-faint">
                      Found on: <SourceLinks sources={discovery.sources} />
                    </p>
                  ) : null}
                  <div className="mt-1 flex flex-wrap gap-2">
                    {statusButton(competitor, "tracked", "Track", true)}
                    {statusButton(competitor, "dismissed", "Dismiss")}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="tracked" className="grid gap-3">
        <h2 id="tracked" className="text-base font-semibold leading-[22px]">
          Tracked <span className="tnum font-normal text-faint">{tracked.length}</span>
        </h2>
        {tracked.length === 0 ? (
          <EmptyState>No competitors tracked yet. Add one below or press Find my rivals.</EmptyState>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {tracked.map((competitor) => {
              const at = lastProfiled.get(competitor.id);
              return (
                <li key={competitor.id} className="card grid content-start gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`${base}/${competitor.id}`} className="font-semibold hover:underline">
                      {competitor.name}
                    </Link>
                    <DeleteForm
                      action={deleteCompetitor}
                      id={competitor.id}
                      compact
                      confirmMessage={`Delete ${competitor.name} and its research?`}
                    />
                  </div>
                  <p className="text-xs text-faint">
                    {COMPETITOR_KIND_LABEL[competitor.kind] ?? competitor.kind} · {at ? `profiled ${when(at)}` : "not researched yet"}
                  </p>
                  <CompetitorLinks competitor={competitor} adLibrary={adLibraryUrl(competitor.name, country)} />
                  <Link href={`${base}/${competitor.id}`} className="text-sm text-accent hover:underline">
                    {at ? "Open profile" : "Research this competitor"}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {dismissed.length > 0 ? (
        <details className="text-sm">
          <summary className="cursor-pointer select-none text-muted">Dismissed ({dismissed.length})</summary>
          <ul className="mt-2 grid gap-2">
            {dismissed.map((competitor) => (
              <li key={competitor.id} className="flex flex-wrap items-center gap-3">
                <span>{competitor.name}</span>
                {statusButton(competitor, "tracked", "Track after all")}
                <DeleteForm action={deleteCompetitor} id={competitor.id} compact confirmMessage={`Delete ${competitor.name}?`} />
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <details className="card p-0">
        <summary className="cursor-pointer select-none p-5 font-semibold">Add a competitor yourself</summary>
        <div className="border-t border-line p-5">
          <CosForm action={saveCompetitor} submitLabel="Add competitor" resetOnSuccess>
            <input type="hidden" name="projectId" value={project.id} />
            <CompetitorFields />
          </CosForm>
        </div>
      </details>
    </div>
  );
}
