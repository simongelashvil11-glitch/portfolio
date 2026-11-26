import { desc, eq, sql } from "drizzle-orm";
import Link from "next/link";

import { button, Card, EmptyState } from "@/components/admin/ui";
import { Add } from "@/components/fluent-icons";
import { db } from "@/db";
import { cosAdAnalyses, cosAds } from "@/db/creative-os";
import { when } from "@/lib/admin-time";
import { getProjectOr404 } from "@/lib/creative-os/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ad Deconstruction Lab" };

export default async function AdsPage({ params }: PageProps<"/admin/creative-os/p/[projectId]/ads">) {
  const project = await getProjectOr404((await params).projectId);
  const base = `/admin/creative-os/p/${project.id}/ads`;
  const ads = await db
    .select({
      ad: cosAds,
      analyses: sql<number>`(select count(*)::int from ${cosAdAnalyses} where ${cosAdAnalyses.adId} = ${cosAds.id})`,
    })
    .from(cosAds)
    .where(eq(cosAds.projectId, project.id))
    .orderBy(desc(cosAds.updatedAt));

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-2xl text-sm text-muted">
          Save an ad&apos;s transcript, copy and screenshots, then break it down into its direct-response parts. Each
          analysis is saved: reading or exporting it again costs nothing.
        </p>
        <Link href={`${base}/new`} className={button.primary}>
          <Add />
          Add an ad
        </Link>
      </div>

      {ads.length === 0 ? (
        <EmptyState>No ads saved in this project yet.</EmptyState>
      ) : (
        <ul className="grid gap-3">
          {ads.map(({ ad, analyses }) => (
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
                    {[ad.advertiser, ad.platform, ad.format].filter(Boolean).join(" · ") || "No details"}
                  </p>
                  {ad.tags.length > 0 ? <p className="mt-1 text-xs text-faint">{ad.tags.join(" · ")}</p> : null}
                  <p className="mt-2 text-xs text-faint">Updated {when(ad.updatedAt)}</p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
