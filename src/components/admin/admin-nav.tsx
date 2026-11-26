"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Briefcase,
  DataTrending,
  DocumentText,
  Folder,
  Grid,
  MailInbox,
  News,
  Person,
  Pulse,
  Wrench,
  type FluentIcon,
} from "@/components/fluent-icons";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: FluentIcon };

/**
 * Grouped by where the content actually appears on the site, and labelled
 * with what a visitor sees rather than what the table is called — so
 * "Tech stack" rather than "Skills". A flat list of nine gave no clue which
 * page any of them fed.
 */
const GROUPS: { heading: string | null; items: NavItem[] }[] = [
  {
    heading: null,
    items: [{ href: "/admin", label: "Overview", icon: Grid }],
  },
  {
    heading: "Home page",
    items: [
      { href: "/admin/profile", label: "Profile", icon: Person },
      { href: "/admin/projects", label: "Selected work", icon: Folder },
    ],
  },
  {
    heading: "About page",
    items: [
      { href: "/admin/about", label: "Page copy", icon: DocumentText },
      { href: "/admin/updates", label: "Personal updates", icon: News },
      { href: "/admin/skills", label: "Tech stack", icon: Wrench },
      { href: "/admin/experience", label: "Career", icon: Briefcase },
    ],
  },
  {
    heading: "Insights",
    items: [
      { href: "/admin/signals", label: "Signals", icon: Pulse },
      { href: "/admin/visitors", label: "Visitors", icon: DataTrending },
    ],
  },
  {
    heading: null,
    items: [{ href: "/admin/messages", label: "Messages", icon: MailInbox }],
  },
];

/** Row metrics shared with the site's own drawer, after Fluent's NavItem. */
export const NAV_ROW =
  "relative flex min-h-10 w-full items-center gap-2.5 rounded-[4px] px-2.5 py-2 text-left text-sm transition-colors duration-100";

/**
 * The admin's navigation, drawn exactly like the public site's drawer: the
 * selected row gets a filled icon, a semibold label, a white fill and the
 * lavender indicator bar on its leading edge.
 */
export function AdminNav({ unread, onNavigate }: { unread: number; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin" className="grid gap-5">
      {GROUPS.map((group, groupIndex) => (
        <div key={group.heading ?? `group-${groupIndex}`}>
          {group.heading ? <h2 className="px-2.5 pb-1 text-xs font-semibold text-faint">{group.heading}</h2> : null}

          <ul className="grid gap-0.5">
            {group.items.map((item) => {
              // "/admin" would otherwise match every child route.
              const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      NAV_ROW,
                      active
                        ? "bg-white/80 font-semibold text-foreground shadow-fluent-2"
                        : "text-muted hover:bg-white/60 hover:text-foreground",
                    )}
                  >
                    {active ? (
                      <span
                        className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-lavender"
                        aria-hidden
                      />
                    ) : null}
                    <Icon filled={active} className={cn("size-5 shrink-0", active && "text-lavender")} />
                    {item.label}
                    {item.href === "/admin/messages" && unread > 0 ? (
                      <span
                        className="tnum ml-auto rounded-full bg-accent px-1.5 text-[11px] font-semibold leading-[18px] text-white"
                        aria-label={`${unread} unread`}
                      >
                        {unread}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
