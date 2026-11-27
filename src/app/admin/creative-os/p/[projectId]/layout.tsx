import { and, count, eq, ne, notInArray } from "drizzle-orm";

import { deleteProject, duplicateProject, setProjectArchived } from "@/actions/creative-os";
import { ConfirmForm } from "@/components/admin/confirm-form";
import { button } from "@/components/admin/ui";
import { CosTabs } from "@/components/creative-os/tabs";
import { db } from "@/db";
import {
  cosAds,
  cosAngles,
  cosAudienceSegments,
  cosBriefs,
  cosCompetitors,
  cosCustomerInsights,
  cosHooks,
  cosKnowledgeItems,
  cosProducts,
  cosScripts,
  cosSources,
  cosVideoPlans,
} from "@/db/creative-os";
import { getProjectOr404 } from "@/lib/creative-os/queries";

/*
 * Everything inside one client or brand. The project is in the address, so
 * it stays selected across its modules, and nothing here reads another
 * project's data: every query below and in the pages filters by it.
 */
export default async function ProjectLayout({ children, params }: LayoutProps<"/admin/creative-os/p/[projectId]">) {
  const { projectId } = await params;
  const project = await getProjectOr404(projectId);
  const base = `/admin/creative-os/p/${project.id}`;

  const [[products], [knowledge], [ads], [insights], [segments], [competitors], [sources], [angles], [hooks], [scripts], [briefs], [videoPlans]] = await Promise.all([
    db.select({ value: count() }).from(cosProducts).where(eq(cosProducts.projectId, project.id)),
    db.select({ value: count() }).from(cosKnowledgeItems).where(eq(cosKnowledgeItems.projectId, project.id)),
    db.select({ value: count() }).from(cosAds).where(eq(cosAds.projectId, project.id)),
    db.select({ value: count() }).from(cosCustomerInsights).where(eq(cosCustomerInsights.projectId, project.id)),
    db.select({ value: count() }).from(cosAudienceSegments).where(eq(cosAudienceSegments.projectId, project.id)),
    db
      .select({ value: count() })
      .from(cosCompetitors)
      .where(and(eq(cosCompetitors.projectId, project.id), eq(cosCompetitors.status, "tracked"))),
    db.select({ value: count() }).from(cosSources).where(eq(cosSources.projectId, project.id)),
    db
      .select({ value: count() })
      .from(cosAngles)
      .where(and(eq(cosAngles.projectId, project.id), notInArray(cosAngles.status, ["rejected", "archived"]))),
    db
      .select({ value: count() })
      .from(cosHooks)
      .where(and(eq(cosHooks.projectId, project.id), notInArray(cosHooks.status, ["rejected", "archived"]))),
    db.select({ value: count() }).from(cosScripts).where(and(eq(cosScripts.projectId, project.id), ne(cosScripts.status, "archived"))),
    db.select({ value: count() }).from(cosBriefs).where(and(eq(cosBriefs.projectId, project.id), ne(cosBriefs.status, "archived"))),
    db.select({ value: count() }).from(cosVideoPlans).where(and(eq(cosVideoPlans.projectId, project.id), ne(cosVideoPlans.status, "archived"))),
  ]);

  const archived = project.status === "archived";

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[28px] font-semibold leading-9 sm:text-[32px] sm:leading-10">{project.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {[project.brandName, project.industry, project.platforms.join(", ")].filter(Boolean).join(" · ") || "No details yet"}
            {archived ? (
              <span className="ml-2 rounded-[4px] border border-line-strong px-1.5 py-px text-[11px] font-semibold text-muted">
                Archived
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={duplicateProject}>
            <input type="hidden" name="id" value={project.id} />
            <button type="submit" className={button.secondary}>
              Duplicate
            </button>
          </form>
          <form action={setProjectArchived}>
            <input type="hidden" name="id" value={project.id} />
            <input type="hidden" name="archived" value={archived ? "false" : "true"} />
            <button type="submit" className={button.secondary}>
              {archived ? "Restore" : "Archive"}
            </button>
          </form>
          <ConfirmForm
            action={deleteProject}
            message={`Delete "${project.name}" and everything in it — products, knowledge base, research, competitors, ads and analyses? This cannot be undone.`}
          >
            <input type="hidden" name="id" value={project.id} />
            <button type="submit" className={button.danger}>
              Delete
            </button>
          </ConfirmForm>
        </div>
      </div>

      <div className="grid gap-1">
        <CosTabs
          label="Research"
          heading="Research"
          items={[
            { href: base, label: "Details", exact: true },
            { href: `${base}/products`, label: "Products", badge: products.value || null },
            { href: `${base}/knowledge`, label: "Knowledge", badge: knowledge.value || null },
            { href: `${base}/customers`, label: "Voice of Customer", badge: insights.value || null },
            { href: `${base}/audiences`, label: "Audiences", badge: segments.value || null },
            { href: `${base}/awareness`, label: "Awareness" },
            { href: `${base}/competitors`, label: "Competitors", badge: competitors.value || null },
            { href: `${base}/sources`, label: "Sources", badge: sources.value || null },
          ]}
        />
        <CosTabs
          label="Create"
          heading="Create"
          items={[
            { href: `${base}/angles`, label: "Angles", badge: angles.value || null },
            { href: `${base}/hooks`, label: "Hooks", badge: hooks.value || null },
            { href: `${base}/scripts`, label: "Scripts and copy", badge: scripts.value || null },
            { href: `${base}/briefs`, label: "Briefs", badge: briefs.value || null },
            { href: `${base}/video`, label: "AI video", badge: videoPlans.value || null },
            { href: `${base}/ads`, label: "Ad Lab", badge: ads.value || null },
          ]}
        />
      </div>

      <div className="min-w-0">{children}</div>
    </div>
  );
}
