import { and, asc, desc, eq, sql, type SQL } from "drizzle-orm";
import Link from "next/link";

import { Pill } from "@/components/admin/stats";
import { button, Card, EmptyState } from "@/components/admin/ui";
import { Add } from "@/components/fluent-icons";
import { db } from "@/db";
import { cosAdAnalyses, cosAds, cosCompetitors } from "@/db/creative-os";
import { when } from "@/lib/admin-time";
import { adDaysRunning, runningLabel } from "@/lib/creative-os/format";
import { getProjectOr404 } from "@/lib/creative-os/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ad Deconstruction Lab" };

export default async function AdsPage({ params, searchParams }: PageProps<"/admin/creative-os/p/[projectId]/ads">) {
  const project = await getProjectOr404((await params).projectId);
  const query = await searchParams;
  const base = `/admin/creative-os/p/${project.id}/ads`;
  const sort = query.sort === "running" ? "running" : "recent";
  const competitorFilter = Number(query.competitor) || null;

  const conditions: SQL[] = [eq(cosAds.projectId, project.id)];
  if (competitorFilter) conditions.push(eq(cosAds.competitorId, competitorFilter));
  const [ads, competitors] = await Promise.all([
    db
      .select({
        ad: cosAds,
        competitor: cosCompetitors.name,
        analyses: sql<number>`(select count(*)::int from ${cosAdAnalyses} where ${cosAdAnalyses.adId} = ${cosAds.id})`,
      })
      .from(cosAds)
      .leftJoin(cosCompetitors, eq(cosCompetitors.id, cosAds.competitorId))
      .where(and(...conditions))
      .orderBy(
        ...(sort === "running" ? [sql`${cosAds.startedRunning} asc nulls last`, desc(cosAds.updatedAt)] : [desc(cosAds.updatedAt)]),
      ),
    db
      .select({ id: cosCompetitors.id, name: cosCompetitors.name })
      .from(cosCompetitors)
      .where(and(eq(cosCompetitors.projectId, project.id), sql`exists (select 1 from ${cosAds} where ${cosAds.competitorId} = ${cosCompetitors.id})`))
      .orderBy(asc(cosCompetitors.name)),
  ]);
  const fromLibrary = ads.some(({ ad }) => ad.source === "extension");
  const href = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams();
    const current = { sort: sort === "running" ? "running" : null, competitor: competitorFilter ? String(competitorFilter) : null, ...changes };
    for (const [key, value] of Object.entries(current)) if (value) next.set(key, value);
    return next.size ? `${base}?${next}` : base;
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-2xl text-sm text-muted">
          Save an ad&apos;s transcript, copy and screenshots, then break it down into its direct-response parts. Ads saved
          from the Meta Ad Library with the Chrome extension land here too, with how long each has been running: the
          longest-running ones are usually the winners. Each analysis is saved: reading it again costs nothing.
        </p>
        <Link href={`${base}/new`} className={button.primary}>
          <Add />
          Add an ad
        </Link>
      </div>

      {fromLibrary || competitors.length ? (
        <nav aria-label="Sort and filter" className="flex flex-wrap items-center gap-1.5">
          <Pill href={href({ sort: null })} active={sort === "recent"}>
            Recently saved
          </Pill>
          <Pill href={href({ sort: "running" })} active={sort === "running"}>
            Longest running
          </Pill>
          {competitors.length ? <span className="mx-1 h-5 w-px bg-line" aria-hidden /> : null}
          {competitors.length ? (
            <Pill href={href({ competitor: null })} active={!competitorFilter}>
              All advertisers
            </Pill>
          ) : null}
          {competitors.map((competitor) => (
            <Pill key={competitor.id} href={href({ competitor: String(competitor.id) })} active={competitorFilter === competitor.id}>
              {competitor.name}
            </Pill>
          ))}
        </nav>
      ) : null}

      {ads.length === 0 ? (
        <EmptyState>
          {competitorFilter ? "No ads saved for this competitor." : "No ads saved in this project yet. Add one, or save ads from the Meta Ad Library with the Chrome extension."}
        </EmptyState>
      ) : (
        <ul className="grid gap-3">
          {ads.map(({ ad, analyses, competitor }) => {
            const days = adDaysRunning(ad);
            return (
            <li key={ad.id}>
              <Link href={`${base}/${ad.id}`} className="block">
                <Card className="card-interactive">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold">{ad.title}</p>
                    <span
                      className={
                        analyses > 0
                          ? "rounded-[4px] bg-accent-soft px-1.5 py-0.5 text-[11px] font-semibold text-accent-hover"
                          : "rounded-[4px] border border-line-strong px-1.5 py-px text-[11px] font-semibold text-muted"
                      }
                    >
                      {analyses > 0 ? `Analysed${analyses > 1 ? ` ×${analyses}` : ""}` : "Not analysed"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted">
                    {[competitor ?? ad.advertiser, ad.platform, ad.format ?? ad.mediaKind].filter(Boolean).join(" · ") || "No details"}
                  </p>
                  {days !== null ? (
                    <p className="mt-1.5 flex flex-wrap gap-x-3 text-sm">
                      <span className={days >= 30 ? "font-semibold text-[#0e700e]" : "font-semibold"}>
                        {runningLabel(days)}
                      </span>
                      <span className="text-muted">since {ad.startedRunning}</span>
                      {ad.stillActive === false ? <span className="text-muted">stopped</span> : null}
                      {ad.variations && ad.variations > 1 ? <span className="text-muted">{ad.variations} versions</span> : null}
                    </p>
                  ) : null}
                  {ad.tags.length > 0 ? <p className="mt-1 text-xs text-faint">{ad.tags.join(" · ")}</p> : null}
                  <p className="mt-2 text-xs text-faint">Updated {when(ad.updatedAt)}</p>
                </Card>
              </Link>
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
