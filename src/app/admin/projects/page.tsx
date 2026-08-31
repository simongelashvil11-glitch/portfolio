import { Plus } from "lucide-react";
import Link from "next/link";

import { deleteProject } from "@/actions/admin";
import { DeleteForm } from "@/components/admin/delete-form";
import { Card, EmptyState, PageHeading } from "@/components/admin/ui";
import { requireSession } from "@/lib/auth";
import { getProjects } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Projects" };

export default async function AdminProjectsPage() {
  await requireSession();
  const items = await getProjects({ all: true });

  return (
    <>
      <PageHeading
        title="Projects"
        description="Selected work shown on the home page."
        action={
          <Link
            href="/admin/projects/new"
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-85"
          >
            <Plus className="size-4" />
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
              <Card className="flex items-start justify-between gap-4">
                <Link href={`/admin/projects/${item.id}`} className="group min-w-0 flex-1">
                  <p className="font-mono text-xs text-faint">
                    {item.year ?? "—"}
                    {item.featured ? (
                      <span className="ml-2 uppercase tracking-widest text-accent">Featured</span>
                    ) : null}
                    {!item.published ? (
                      <span className="ml-2 uppercase tracking-widest text-accent">Draft</span>
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
