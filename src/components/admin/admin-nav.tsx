"use client";

import {
  Briefcase,
  FileText,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  Newspaper,
  User,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon };

/**
 * Grouped by where the content actually appears on the site, and labelled
 * with what a visitor sees rather than what the table is called — so
 * "Tech stack" rather than "Skills". A flat list of nine gave no clue which
 * page any of them fed.
 */
const GROUPS: { heading: string | null; items: NavItem[] }[] = [
  {
    heading: null,
    items: [{ href: "/admin", label: "Overview", icon: LayoutDashboard }],
  },
  {
    heading: "Home page",
    items: [
      { href: "/admin/profile", label: "Profile", icon: User },
      { href: "/admin/projects", label: "Selected work", icon: FolderKanban },
    ],
  },
  {
    heading: "About page",
    items: [
      { href: "/admin/about", label: "Page copy", icon: FileText },
      { href: "/admin/updates", label: "Personal updates", icon: Newspaper },
      { href: "/admin/skills", label: "Tech stack", icon: Wrench },
      { href: "/admin/experience", label: "Career", icon: Briefcase },
    ],
  },
  {
    heading: null,
    items: [{ href: "/admin/messages", label: "Messages", icon: Inbox }],
  },
];

export function AdminNav({ unread }: { unread: number }) {
  const pathname = usePathname();

  return (
    // `contents` collapses the groups on small screens so every item flows
    // into one scrollable row; from md up they become real blocks again.
    <nav className="flex gap-1 overflow-x-auto md:flex-col md:gap-5 md:overflow-visible">
      {GROUPS.map((group, groupIndex) => (
        <div key={group.heading ?? `group-${groupIndex}`} className="contents md:block">
          {group.heading ? (
            <h2 className="mb-1.5 hidden px-3 text-xs font-medium text-faint md:block">
              {group.heading}
            </h2>
          ) : null}

          <div className="contents md:grid md:gap-0.5">
            {group.items.map((item) => {
              // "/admin" would otherwise match every child route.
              const active =
                item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-surface font-medium text-foreground"
                      : "text-muted hover:bg-surface hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {item.label}
                  {item.href === "/admin/messages" && unread > 0 ? (
                    <span className="tnum ml-auto rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium text-background">
                      {unread}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
