import { count, eq } from "drizzle-orm";
import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-shell";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { getProfile } from "@/lib/queries";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s — Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await getSession();

  // The login page renders inside this layout too, so shell only when signed in.
  if (!session) return <>{children}</>;

  const [[unread], profile] = await Promise.all([
    db.select({ value: count() }).from(messages).where(eq(messages.read, false)),
    getProfile(),
  ]);

  return (
    <AdminShell
      name={profile?.name ?? "Simon Gelashvili"}
      email={session.email}
      portraitUrl={profile?.portraitUrl?.trim() || null}
      unread={unread?.value ?? 0}
    >
      {children}
    </AdminShell>
  );
}
