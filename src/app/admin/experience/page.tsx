import { Add } from "@/components/fluent-icons";
import Link from "next/link";

import { deleteExperience } from "@/actions/admin";
import { DeleteForm } from "@/components/admin/delete-form";
import { Card, EmptyState, PageHeading } from "@/components/admin/ui";
import { Mark } from "@/components/mark";
import { requireSession } from "@/lib/auth";
import { getExperiences } from "@/lib/queries";
import { formatPeriod } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Career" };

export default async function AdminExperiencePage() {
  await requireSession();
  const items = await getExperiences({ all: true });

  return (
    <>
      <PageHeading
        title="Career"
        description="The roles listed on the about page. Click one to change its logo, dates or copy."
        action={
          <Link
            href="/admin/experience/new"
            className="btn btn-primary"
          >
            <Add />
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
              <Card className="group flex items-start gap-4">
                <Mark src={item.logoUrl} label={item.company} fallback="work" className="mt-0.5" />
                <Link href={`/admin/experience/${item.id}`} className="min-w-0 flex-1">
                  <p className="tnum text-xs text-faint">
                    {formatPeriod(item.startDate)} &ndash; {formatPeriod(item.endDate)}
                    {!item.published ? (
                      <span className="ml-2 rounded-[4px] border border-line-strong px-1.5 py-px text-[11px] font-semibold text-muted">Draft</span>
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
