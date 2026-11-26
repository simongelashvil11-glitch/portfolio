import { Add } from "@/components/fluent-icons";
import Link from "next/link";

import { deleteProject } from "@/actions/admin";
import { DeleteForm } from "@/components/admin/delete-form";
import { Card, EmptyState, PageHeading } from "@/components/admin/ui";
import { Mark } from "@/components/mark";
import { requireSession } from "@/lib/auth";
import { getProjects } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Selected work" };

export default async function AdminProjectsPage() {
  await requireSession();
  const items = await getProjects({ all: true });

  return (
    <>
      <PageHeading
        title="Selected work"
        description="The work list on the home page."
        action={
          <Link
            href="/admin/projects/new"
            className="btn btn-primary"
          >
            <Add />
            Add project
          </Link>
        }
      />

      {items.length === 0 ? (
        <EmptyState>No projects yet. Add your first one.</EmptyState>
      ) : (
        <ul className="grid gap-3">
          {items.map((item) => (
            <li key={item.id}>
              <Card className="group flex items-start gap-4">
                <Mark src={item.logoUrl} label={item.title} fallback="work" className="mt-0.5" />
                <Link href={`/admin/projects/${item.id}`} className="min-w-0 flex-1">
                  <p className="text-xs text-faint">
                    {item.year ?? "—"}
                    {item.featured ? (
                      <span className="ml-2 rounded-[4px] bg-accent-soft px-1.5 py-0.5 text-[11px] font-semibold text-accent-hover">Featured</span>
                    ) : null}
                    {!item.published ? (
                      <span className="ml-2 rounded-[4px] border border-line-strong px-1.5 py-px text-[11px] font-semibold text-muted">Draft</span>
                    ) : null}
                  </p>
                  <h2 className="mt-1 text-sm font-medium transition-colors group-hover:text-accent">
                    {item.title}
                  </h2>
                  <p className="mt-1 line-clamp-1 text-sm text-muted">{item.summary}</p>
                </Link>
                <DeleteForm action={deleteProject} id={item.id} />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
