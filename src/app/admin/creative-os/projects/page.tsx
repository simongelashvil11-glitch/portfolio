import { count, desc, eq, sql } from "drizzle-orm";
import Link from "next/link";

import { Pill } from "@/components/admin/stats";
import { button, Card, EmptyState, PageHeading } from "@/components/admin/ui";
import { Add } from "@/components/fluent-icons";
import { db } from "@/db";
import { cosAds, cosProducts, cosProjects } from "@/db/creative-os";
import { when } from "@/lib/admin-time";

export const dynamic = "force-dynamic";
export const metadata = { title: "Projects" };

export default async function ProjectsPage({ searchParams }: PageProps<"/admin/creative-os/projects">) {
  const showArchived = (await searchParams).status === "archived";
  const status = showArchived ? "archived" : "active";

  const projects = await db
    .select({
      project: cosProjects,
      products: sql<number>`(select count(*)::int from ${cosProducts} where ${cosProducts.projectId} = ${cosProjects.id})`,
      ads: sql<number>`(select count(*)::int from ${cosAds} where ${cosAds.projectId} = ${cosProjects.id})`,
    })
    .from(cosProjects)
    .where(eq(cosProjects.status, status))
    .orderBy(desc(cosProjects.updatedAt));
  const [archived] = await db.select({ value: count() }).from(cosProjects).where(eq(cosProjects.status, "archived"));

  return (
    <>
      <PageHeading
        title="Projects"
        description="One per brand or client. Each keeps its own products, knowledge, ads and research, never mixed with another's."
        action={
          <Link href="/admin/creative-os/projects/new" className={button.primary}>
            <Add />
            New project
          </Link>
        }
      />

      <div className="mb-5 flex gap-1.5">
        <Pill href="/admin/creative-os/projects" active={!showArchived}>
          Active
        </Pill>
        <Pill href="/admin/creative-os/projects?status=archived" active={showArchived}>
          Archived <span className="tnum text-xs opacity-70">{archived.value}</span>
        </Pill>
      </div>

      {projects.length === 0 ? (
        <EmptyState>{showArchived ? "No archived projects." : "No projects yet. Create one for each brand or client you work on."}</EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {projects.map(({ project, products, ads }) => (
            <li key={project.id}>
              <Link href={`/admin/creative-os/p/${project.id}`} className="block h-full">
                <Card className="card-interactive h-full">
                  <p className="text-base font-semibold leading-[22px]">{project.name}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    {[project.brandName, project.industry].filter(Boolean).join(" · ") || "No details yet"}
                  </p>
                  <p className="mt-3 text-xs text-faint">
                    {products} {products === 1 ? "product" : "products"} · {ads} {ads === 1 ? "ad" : "ads"} · updated{" "}
                    {when(project.updatedAt)}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
