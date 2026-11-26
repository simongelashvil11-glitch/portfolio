import { Add } from "@/components/fluent-icons";
import Link from "next/link";

import { deletePost } from "@/actions/admin";
import { DeleteForm } from "@/components/admin/delete-form";
import { Card, EmptyState, PageHeading } from "@/components/admin/ui";
import { requireSession } from "@/lib/auth";
import { getPosts } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Writing" };

export default async function AdminPostsPage() {
  await requireSession();
  const items = await getPosts({ all: true });

  return (
    <>
      <PageHeading
        title="Writing"
        description="Posts published at /writing."
        action={
          <Link
            href="/admin/posts/new"
            className="btn btn-primary"
          >
            <Add />
            New post
          </Link>
        }
      />

      {items.length === 0 ? (
        <EmptyState>Nothing written yet.</EmptyState>
      ) : (
        <ul className="grid gap-3">
          {items.map((item) => (
            <li key={item.id}>
              <Card className="flex items-start justify-between gap-4">
                <Link href={`/admin/posts/${item.id}`} className="group min-w-0 flex-1">
                  <p className="tnum text-xs text-faint">
                    {item.published ? formatDate(item.publishedAt) : "Draft"}
                  </p>
                  <h2 className="mt-1 text-sm font-medium transition-colors group-hover:text-accent">
                    {item.title}
                  </h2>
                  {item.excerpt ? (
                    <p className="mt-1 line-clamp-1 text-sm text-muted">{item.excerpt}</p>
                  ) : null}
                </Link>
                <DeleteForm action={deletePost} id={item.id} />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
