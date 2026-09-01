import { Plus } from "lucide-react";
import Link from "next/link";

import { deleteUpdate } from "@/actions/admin";
import { DeleteForm } from "@/components/admin/delete-form";
import { Card, EmptyState, PageHeading } from "@/components/admin/ui";
import { Mark } from "@/components/mark";
import { requireSession } from "@/lib/auth";
import { getUpdates } from "@/lib/queries";
import { formatPeriod } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Personal updates" };

export default async function AdminUpdatesPage() {
  await requireSession();
  const items = await getUpdates({ all: true });

  return (
    <>
      <PageHeading
        title="Personal updates"
        description="The updates listed on the about page. Click one to change its logo, link or date."
        action={
          <Link
            href="/admin/updates/new"
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-85"
          >
            <Plus className="size-4" />
            Add update
          </Link>
        }
      />

      {items.length === 0 ? (
        <EmptyState>No updates yet. Add your first one.</EmptyState>
      ) : (
        <ul className="grid gap-3">
          {items.map((item) => (
            <li key={item.id}>
              <Card className="group flex items-start gap-4">
                <Mark src={item.logoUrl} label={item.title} className="mt-0.5" />
                <Link href={`/admin/updates/${item.id}`} className="min-w-0 flex-1">
                  <p className="text-xs text-faint">
                    {formatPeriod(item.date)}
                    {!item.published ? (
                      <span className="ml-2 uppercase tracking-widest text-accent">Draft</span>
                    ) : null}
                  </p>
                  <h2 className="mt-1 text-sm font-medium transition-colors group-hover:text-accent">
                    {item.title}
                  </h2>
                  {item.description ? (
                    <p className="mt-1 line-clamp-1 text-sm text-muted">{item.description}</p>
                  ) : null}
                </Link>
                <DeleteForm action={deleteUpdate} id={item.id} />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
