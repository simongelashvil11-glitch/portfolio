"use client";

import {
  Briefcase,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  PenLine,
  User,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/profile", label: "Profile", icon: User },
  { href: "/admin/experience", label: "Experience", icon: Briefcase },
  { href: "/admin/projects", label: "Projects", icon: FolderKanban },
  { href: "/admin/skills", label: "Skills", icon: Wrench },
  { href: "/admin/posts", label: "Writing", icon: PenLine },
  { href: "/admin/messages", label: "Messages", icon: Inbox },
];

export function AdminNav({ unread }: { unread: number }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
      {ITEMS.map((item) => {
        // "/admin" would otherwise match every child route.
        const active =
          item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
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
    </nav>
  );
}
