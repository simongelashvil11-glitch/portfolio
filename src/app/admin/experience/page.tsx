import { Plus } from "lucide-react";
import Link from "next/link";

import { deleteExperience } from "@/actions/admin";
import { DeleteForm } from "@/components/admin/delete-form";
import { Card, EmptyState, PageHeading } from "@/components/admin/ui";
import { requireSession } from "@/lib/auth";
import { getExperiences } from "@/lib/queries";
import { formatPeriod } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Experience" };

export default async function AdminExperiencePage() {
  await requireSession();
  const items = await getExperiences({ all: true });

  return (
    <>
      <PageHeading
        title="Experience"
        description="Roles listed on the home page, ordered by the sort field."
        action={
          <Link
            href="/admin/experience/new"
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-85"
          >
            <Plus className="size-4" />
            Add role
          </Link>
        }
      />

      {items.length === 0 ? (
        <EmptyState>No roles yet. Add your first one.</EmptyState>
      ) : (
        <ul className="grid gap-3">
          {items.map((item) => (
            <li key={item.id}>
              <Card className="flex items-start justify-between gap-4">
                <Link href={`/admin/experience/${item.id}`} className="min-w-0 flex-1 group">
                  <p className="tnum font-mono text-xs text-faint">
                    {formatPeriod(item.startDate)} &ndash; {formatPeriod(item.endDate)}
                    {!item.published ? (
                      <span className="ml-2 uppercase tracking-widest text-accent">Draft</span>
                    ) : null}
                  </p>
                  <h2 className="mt-1 text-sm font-medium transition-colors group-hover:text-accent">
                    {item.role} · <span className="text-muted">{item.company}</span>
                  </h2>
                  {item.description ? (
                    <p className="mt-1 line-clamp-1 text-sm text-muted">{item.description}</p>
                  ) : null}
                </Link>
                <DeleteForm action={deleteExperience} id={item.id} />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
