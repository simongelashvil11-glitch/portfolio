"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * A row of tabs after Fluent's TabList: the selected tab is semibold with the
 * brand-coloured underline. It scrolls sideways on a phone rather than
 * wrapping into a second row.
 */
export function CosTabs({
  items,
  label,
  heading,
}: {
  items: { href: string; label: string; exact?: boolean; badge?: string | number | null; also?: string[] }[];
  label: string;
  /** A small label at the start of the row, when a page has more than one row of tabs. */
  heading?: string;
}) {
  const pathname = usePathname();
  const under = (prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);
  return (
    <nav aria-label={label} className="-mx-1 overflow-x-auto">
      <ul className="flex min-w-max items-center gap-1 border-b border-line px-1">
        {heading ? (
          <li aria-hidden className="w-[4.5rem] shrink-0 px-1 text-[11px] font-semibold uppercase tracking-wide text-faint">
            {heading}
          </li>
        ) : null}
        {items.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : under(item.href) || (item.also ?? []).some(under);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-1.5 px-2.5 py-2.5 text-sm transition-colors",
                  active ? "font-semibold text-foreground" : "text-muted hover:text-foreground",
                )}
              >
                {item.label}
                {item.badge ? (
                  <span className="tnum rounded-full bg-surface px-1.5 text-[11px] font-semibold leading-[18px] text-muted">
                    {item.badge}
                  </span>
                ) : null}
                {active ? <span aria-hidden className="absolute inset-x-2.5 -bottom-px h-[3px] rounded-full bg-accent" /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
