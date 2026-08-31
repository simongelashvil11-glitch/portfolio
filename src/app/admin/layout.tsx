import { count, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";

import { logoutAction } from "@/actions/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s — Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await getSession();

  // The login page renders inside this layout too, so shell only when signed in.
  if (!session) return <>{children}</>;

  const [unread] = await db
    .select({ value: count() })
    .from(messages)
    .where(eq(messages.read, false));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-8 md:flex-row md:py-12">
      <aside className="md:w-52 md:shrink-0">
        <div className="mb-6 flex items-center justify-between md:mb-8 md:block">
          <Link href="/" className="font-display text-xl tracking-tight hover:text-accent">
            Portfolio
          </Link>
          <p className="mt-1 hidden truncate font-mono text-xs text-faint md:block">
            {session.email}
          </p>
        </div>

        <AdminNav unread={unread?.value ?? 0} />

        <form action={logoutAction} className="mt-6 hidden md:block">
          <button
            type="submit"
            className="px-3 font-mono text-xs uppercase tracking-widest text-faint transition-colors hover:text-foreground"
          >
            Sign out
          </button>
        </form>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
