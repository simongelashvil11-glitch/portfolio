import type { Metadata } from "next";

import { CosTabs } from "@/components/creative-os/tabs";
import { requireSession } from "@/lib/auth";

export const metadata: Metadata = { title: { default: "CreativeOS", template: "%s — CreativeOS" } };

/*
 * CreativeOS's frame inside the admin. Opening it, moving between its pages
 * or reading saved work never calls the Claude API; only the Authorize
 * buttons do (see lib/creative-os/operations.ts).
 */
export default async function CreativeOsLayout({ children }: LayoutProps<"/admin/creative-os">) {
  await requireSession();
  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent-hover">CreativeOS</p>
        <CosTabs
          label="CreativeOS"
          items={[
            { href: "/admin/creative-os", label: "Overview", exact: true },
            { href: "/admin/creative-os/projects", label: "Projects", also: ["/admin/creative-os/p"] },
            { href: "/admin/creative-os/assignments", label: "Assignments" },
            { href: "/admin/creative-os/history", label: "Research history" },
            { href: "/admin/creative-os/usage", label: "API usage" },
            { href: "/admin/creative-os/settings", label: "Settings" },
            { href: "/admin/creative-os/guide", label: "Guide" },
          ]}
        />
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
