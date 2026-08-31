import { desc } from "drizzle-orm";

import { deleteMessage, toggleMessageRead } from "@/actions/admin";
import { DeleteForm } from "@/components/admin/delete-form";
import { Card, EmptyState, PageHeading } from "@/components/admin/ui";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Messages" };

export default async function AdminMessagesPage() {
  await requireSession();
  const items = await db.select().from(messages).orderBy(desc(messages.createdAt));

  return (
    <>
      <PageHeading title="Messages" description="Submissions from the contact form." />

      {items.length === 0 ? (
        <EmptyState>No messages yet.</EmptyState>
      ) : (
        <ul className="grid gap-3">
          {items.map((item) => (
            <li key={item.id}>
              <Card className={item.read ? "opacity-70" : undefined}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="text-sm font-medium">
                    {item.name}
                    <a
                      href={`mailto:${item.email}`}
                      className="link-underline ml-2 font-normal text-muted"
                    >
                      {item.email}
                    </a>
                  </p>
                  <time className="font-mono text-xs text-faint">
                    {formatDate(item.createdAt)}
                  </time>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                  {item.body}
                </p>

                <div className="mt-4 flex items-center gap-3 border-t border-line pt-3">
                  <form action={toggleMessageRead}>
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="read" value={item.read ? "false" : "true"} />
                    <button
                      type="submit"
                      className="font-mono text-xs uppercase tracking-widest text-muted transition-colors hover:text-foreground"
                    >
                      {item.read ? "Mark unread" : "Mark read"}
                    </button>
                  </form>
                  <div className="ml-auto">
                    <DeleteForm
                      action={deleteMessage}
                      id={item.id}
                      confirmMessage={`Delete the message from ${item.name}?`}
                      compact
                    />
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
