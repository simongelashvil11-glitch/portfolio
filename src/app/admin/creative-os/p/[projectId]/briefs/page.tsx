import { and, desc, eq, inArray } from "drizzle-orm";
import Link from "next/link";

import { Pill } from "@/components/admin/stats";
import { EmptyState } from "@/components/admin/ui";
import { db } from "@/db";
import { cosBriefs, cosScripts } from "@/db/creative-os";
import { when } from "@/lib/admin-time";
import { BRIEF_AUDIENCES, SCRIPT_STATUS_LABEL } from "@/lib/creative-os/creative-labels";
import { getProjectOr404 } from "@/lib/creative-os/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Briefs" };

export default async function BriefsPage({ params, searchParams }: PageProps<"/admin/creative-os/p/[projectId]/briefs">) {
  const project = await getProjectOr404((await params).projectId);
  const base = `/admin/creative-os/p/${project.id}/briefs`;
  const archived = (await searchParams).view === "archived";

  const briefs = await db
    .select({ brief: cosBriefs, script: cosScripts.title })
    .from(cosBriefs)
    .leftJoin(cosScripts, eq(cosScripts.id, cosBriefs.scriptId))
    .where(and(eq(cosBriefs.projectId, project.id), inArray(cosBriefs.status, archived ? ["archived"] : ["draft", "approved"])))
    .orderBy(desc(cosBriefs.createdAt));

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <p className="max-w-2xl text-sm text-muted">
        Production briefs for creators, editors and designers, each with a scene-by-scene storyboard. Make one from a
        script&apos;s page (Make a brief), then export it as a Word document to send.
      </p>
      <nav aria-label="Which briefs" className="flex flex-wrap gap-1.5">
        <Pill href={base} active={!archived}>
          Current
        </Pill>
        <Pill href={`${base}?view=archived`} active={archived}>
          Archived
        </Pill>
      </nav>
      {briefs.length === 0 ? (
        <EmptyState>No briefs yet. Open a script and press Make a brief.</EmptyState>
      ) : (
        <ul className="grid gap-3">
          {briefs.map(({ brief, script }) => (
            <li key={brief.id}>
              <Link href={`${base}/${brief.id}`} className="card card-interactive block p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold">{brief.title}</span>
                  <span className="text-xs text-faint">{SCRIPT_STATUS_LABEL[brief.status] ?? brief.status}</span>
                </div>
                <p className="mt-0.5 text-sm text-muted">
                  For {BRIEF_AUDIENCES[brief.audience as keyof typeof BRIEF_AUDIENCES] ?? brief.audience}
                  {script ? ` · from “${script}”` : ""} · {when(brief.createdAt)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
