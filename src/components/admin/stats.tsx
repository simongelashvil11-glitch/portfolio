import Link from "next/link";
import type { ReactNode } from "react";

import { Card } from "@/components/admin/ui";
import { dayLabel } from "@/lib/admin-time";
import { cn } from "@/lib/utils";
import { RANGES, type Range } from "@/lib/visit-ranges";

/* The figures, panels and bars the Visitors and Signals pages are built from. */

export function Stat({
  label,
  value,
  hint,
  small,
}: {
  label: string;
  value: string;
  hint?: string;
  small?: boolean;
}) {
  return (
    <Card>
      <p className={cn("tnum truncate font-semibold", small ? "font-mono text-base leading-9" : "text-[28px] leading-9")}>{value}</p>
      <p className="mt-0.5 text-sm text-muted">{label}</p>
      {hint ? <p className="mt-0.5 text-xs text-faint">{hint}</p> : null}
    </Card>
  );
}

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold leading-[22px]">{title}</h2>
        {action}
      </div>
      {children}
    </Card>
  );
}

/**
 * A name, a bar and a figure per row, the bars sharing one scale so rows
 * compare at a glance. The figure is always printed, so the bar is never
 * the only way to read the number.
 */
export function MeterList({
  rows,
}: {
  rows: { key: string; label: ReactNode; value: number; note?: string }[];
}) {
  const max = Math.max(1, ...rows.map((row) => row.value));

  return (
    <ul className="grid gap-2.5">
      {rows.map((row) => (
        <li key={row.key} className="grid gap-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0">{row.label}</span>
            <span className="tnum shrink-0">
              {row.value.toLocaleString("en-US")}
              {row.note ? <span className="ml-1.5 text-xs text-faint">{row.note}</span> : null}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-line/60">
            <div className="h-full rounded-full bg-accent" style={{ width: `${(row.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** One bar per day across the range; the day and figure show on hover. */
export function DailyBars({
  title,
  days,
  unit,
}: {
  title: string;
  days: { day: string; value: number }[];
  /** Singular, e.g. "view" or "person". */
  unit: [string, string];
}) {
  const max = Math.max(1, ...days.map((day) => day.value));
  const total = days.reduce((sum, day) => sum + day.value, 0);
  const name = (count: number) => (count === 1 ? unit[0] : unit[1]);

  return (
    <Panel title={title}>
      <div className="flex h-28 items-end gap-[2px]" role="img" aria-label={`${title}: ${total} in total, peak ${max}`}>
        {days.map((day) => (
          <div key={day.day} className="group relative flex h-full flex-1 items-end">
            <div
              className={cn(
                "w-full rounded-t-[4px] transition-colors",
                day.value > 0 ? "bg-accent/80 group-hover:bg-accent" : "bg-line/70",
              )}
              style={{ height: day.value > 0 ? `${Math.max(4, (day.value / max) * 100)}%` : "2px" }}
            />
            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-background px-2 py-1 text-xs shadow-sm group-hover:block">
              {dayLabel(day.day)}: <span className="tnum font-medium">{day.value}</span> {name(day.value)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-faint">
        <span>{dayLabel(days[0].day)}</span>
        <span>
          peak {max.toLocaleString("en-US")} {name(max)} a day
        </span>
        <span>{dayLabel(days[days.length - 1].day)}</span>
      </div>
    </Panel>
  );
}

/** The time-range pills. `href` builds each pill's link, so a page can keep its other filters. */
export function RangeNav({
  current,
  href,
  children,
}: {
  current: Range;
  href: (key: Range["key"]) => string;
  children?: ReactNode;
}) {
  return (
    <nav aria-label="Time range" className="mb-6 flex flex-wrap items-center gap-1.5">
      {RANGES.map((item) => (
        <Pill key={item.key} href={href(item.key)} active={item.key === current.key}>
          {item.label}
        </Pill>
      ))}
      {children}
    </nav>
  );
}

export function Pill({
  href,
  active,
  children,
  className,
}: {
  href: string;
  active?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex min-h-8 items-center gap-1.5 rounded-[4px] border px-3 py-1 text-sm transition-colors",
        active
          ? "border-accent bg-accent-soft font-medium text-accent-hover"
          : "border-line-strong bg-background text-foreground hover:bg-surface",
        className,
      )}
    >
      {children}
    </Link>
  );
}
