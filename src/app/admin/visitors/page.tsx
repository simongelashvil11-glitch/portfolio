import { and, count, countDistinct, desc, gte, inArray, isNotNull, max, sql, type SQL } from "drizzle-orm";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { clearVisits } from "@/actions/admin";
import { ConfirmForm } from "@/components/admin/confirm-form";
import { Card, EmptyState, PageHeading } from "@/components/admin/ui";
import { db } from "@/db";
import { visits, type Visit } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Visitors" };

const RANGES = [
  { key: "24h", label: "24 hours", days: 1 },
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
  { key: "all", label: "All time", days: null },
] as const;

/** Times are shown in Tbilisi, where the site's owner reads them. */
const TIME_ZONE = "Asia/Tbilisi";

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

function countryName(code: string | null): string {
  if (!code) return "Unknown";
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}

function when(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function clock(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" }).format(date);
}

function place(row: Pick<Visit, "city" | "country">): string {
  return [row.city, countryName(row.country)].filter(Boolean).join(", ");
}

/** How many addresses the per-visitor panel lists, most recently seen first. */
const VISITOR_LIMIT = 50;

/** A gap longer than this between two views from one address starts a new visit. */
const VISIT_GAP_MS = 30 * 60 * 1000;

type Trail = {
  ip: string;
  /** Page views split into visits, each in the order they happened. */
  sessions: Visit[][];
  views: number;
  pages: string[];
  latest: Visit;
  first: Visit;
};

/** Groups one address's views (oldest first) into visits separated by a long pause. */
function trail(ip: string, rows: Visit[]): Trail {
  const sessions: Visit[][] = [];
  for (const row of rows) {
    const current = sessions[sessions.length - 1];
    const previous = current?.[current.length - 1];
    if (previous && row.createdAt.getTime() - previous.createdAt.getTime() <= VISIT_GAP_MS) current.push(row);
    else sessions.push([row]);
  }
  return {
    ip,
    sessions,
    views: rows.length,
    pages: [...new Set(rows.map((row) => row.path))],
    latest: rows[rows.length - 1],
    first: rows[0],
  };
}

/**
 * A calendar day in Tbilisi, as "YYYY-MM-DD", for grouping views by day.
 * The zone is written into the SQL rather than bound: as a parameter it
 * becomes $1 in the select and $2 in the group-by, and Postgres then sees
 * two different expressions and refuses the query.
 */
const DAY = sql<string>`to_char(${visits.createdAt} at time zone 'UTC' at time zone ${sql.raw(`'${TIME_ZONE}'`)}, 'YYYY-MM-DD')`;

export default async function VisitorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSession();

  const requested = (await searchParams).range;
  const range = RANGES.find((item) => item.key === requested) ?? RANGES[2];
  /*
   * The cutoff is worked out by the database, so the page never reads the
   * clock while rendering. The column holds UTC without a zone, so "now" is
   * taken in UTC to compare like with like.
   */
  const since = range.days
    ? sql`(now() at time zone 'UTC') - make_interval(days => ${range.days})`
    : null;

  const inRange: SQL | undefined = since ? gte(visits.createdAt, since) : undefined;

  const [[totals], countries, pages, sources, devices, cities, daily, recent, people] = await Promise.all([
    db
      .select({
        views: count(),
        visitors: countDistinct(visits.ip),
        countries: countDistinct(visits.country),
      })
      .from(visits)
      .where(inRange),
    db
      .select({ country: visits.country, views: count(), visitors: countDistinct(visits.ip) })
      .from(visits)
      .where(inRange)
      .groupBy(visits.country)
      .orderBy(desc(count())),
    db
      .select({ path: visits.path, views: count() })
      .from(visits)
      .where(inRange)
      .groupBy(visits.path)
      .orderBy(desc(count()))
      .limit(10),
    db
      .select({ referrer: visits.referrer, views: count() })
      .from(visits)
      .where(and(inRange, isNotNull(visits.referrer)))
      .groupBy(visits.referrer)
      .orderBy(desc(count()))
      .limit(10),
    db
      .select({ device: visits.device, views: count() })
      .from(visits)
      .where(inRange)
      .groupBy(visits.device)
      .orderBy(desc(count())),
    db
      .select({ city: visits.city, country: visits.country, views: count() })
      .from(visits)
      .where(and(inRange, isNotNull(visits.city)))
      .groupBy(visits.city, visits.country)
      .orderBy(desc(count()))
      .limit(10),
    since && range.days && range.days > 1
      ? db.select({ day: DAY, views: count() }).from(visits).where(inRange).groupBy(DAY).orderBy(DAY)
      : Promise.resolve([] as { day: string; views: number }[]),
    db.select().from(visits).where(inRange).orderBy(desc(visits.createdAt)).limit(100),
    db
      .select({ ip: visits.ip })
      .from(visits)
      .where(and(inRange, isNotNull(visits.ip)))
      .groupBy(visits.ip)
      .orderBy(desc(max(visits.createdAt)))
      .limit(VISITOR_LIMIT),
  ]);

  // Every view in range from the listed addresses; newest first so the cap
  // drops old history rather than recent activity, then turned back around.
  const ips = people.map((row) => row.ip).filter((ip): ip is string => ip !== null);
  const trailRows = ips.length
    ? (
        await db
          .select()
          .from(visits)
          .where(and(inRange, inArray(visits.ip, ips)))
          .orderBy(desc(visits.createdAt))
          .limit(5000)
      ).reverse()
    : [];
  const byIp = new Map<string, Visit[]>();
  for (const row of trailRows) {
    if (!row.ip) continue;
    byIp.set(row.ip, [...(byIp.get(row.ip) ?? []), row]);
  }
  const trails = ips.filter((ip) => byIp.has(ip)).map((ip) => trail(ip, byIp.get(ip)!));

  const topPage = pages[0]?.path ?? "—";

  return (
    <>
      <PageHeading
        title="Visitors"
        description="Page views on the public site. Your own visits while signed in are not counted."
      />

      {/* ---------- Range ---------- */}
      <nav aria-label="Time range" className="mb-6 flex flex-wrap gap-1.5">
        {RANGES.map((item) => (
          <Link
            key={item.key}
            href={`/admin/visitors?range=${item.key}`}
            aria-current={item.key === range.key ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition-colors",
              item.key === range.key
                ? "border-accent bg-accent-soft font-medium text-accent-hover"
                : "border-line text-muted hover:border-accent hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {totals.views === 0 ? (
        <EmptyState>
          No visits recorded {range.days ? `in the last ${range.label}` : "yet"}. Views are recorded on the live site
          only, and not while you are signed in.
        </EmptyState>
      ) : (
        /*
          Every grid here uses minmax(0, 1fr) tracks: a plain grid item will
          not shrink below its content, and the visit log's table is wider
          than a phone — it stretched every panel past the screen instead of
          scrolling inside its own card.
        */
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
          {/* ---------- Headline figures ---------- */}
          <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 lg:grid-cols-[repeat(4,minmax(0,1fr))]">
            <Stat label="Page views" value={totals.views.toLocaleString("en-US")} />
            <Stat label="Unique visitors" value={totals.visitors.toLocaleString("en-US")} hint="by IP address" />
            <Stat label="Countries" value={totals.countries.toLocaleString("en-US")} />
            <Stat label="Top page" value={topPage} small />
          </div>

          {daily.length > 1 ? <DailyBars days={daily} /> : null}

          <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[repeat(2,minmax(0,1fr))]">
            <Panel title="Countries">
              <MeterList
                rows={countries.map((row) => ({
                  key: row.country ?? "unknown",
                  label: (
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="w-7 shrink-0 font-mono text-xs text-faint">{row.country ?? "—"}</span>
                      <span className="truncate">{countryName(row.country)}</span>
                    </span>
                  ),
                  value: row.views,
                  note: `${row.visitors} ${row.visitors === 1 ? "visitor" : "visitors"}`,
                }))}
              />
            </Panel>

            <Panel title="Cities">
              {cities.length === 0 ? (
                <p className="text-sm text-faint">No city data yet.</p>
              ) : (
                <MeterList
                  rows={cities.map((row) => ({
                    key: `${row.city}-${row.country}`,
                    label: (
                      <span className="truncate">
                        {row.city}
                        <span className="text-faint">, {countryName(row.country)}</span>
                      </span>
                    ),
                    value: row.views,
                  }))}
                />
              )}
            </Panel>

            <Panel title="Pages">
              <MeterList
                rows={pages.map((row) => ({
                  key: row.path,
                  label: <span className="truncate font-mono text-xs">{row.path}</span>,
                  value: row.views,
                }))}
              />
            </Panel>

            <Panel title="Came from">
              {sources.length === 0 ? (
                <p className="text-sm text-faint">Every visit so far was direct (typed in, a bookmark, or an app).</p>
              ) : (
                <MeterList
                  rows={sources.map((row) => ({
                    key: row.referrer ?? "",
                    label: <span className="truncate">{row.referrer}</span>,
                    value: row.views,
                  }))}
                />
              )}
              {devices.length > 0 ? (
                <p className="mt-4 border-t border-line pt-3 text-xs text-faint">
                  Devices:{" "}
                  {devices
                    .map((row) => `${row.device ?? "unknown"} ${Math.round((row.views / totals.views) * 100)}%`)
                    .join(" · ")}
                </p>
              ) : null}
            </Panel>
          </div>

          {/* ---------- One row per address ---------- */}
          {trails.length > 0 ? (
            <Panel
              title={`Visitors by IP${trails.length === VISITOR_LIMIT ? ` (latest ${VISITOR_LIMIT})` : ""}`}
            >
              <p className="-mt-2 mb-3 text-xs text-faint">
                Select an address to see each visit in order. Views more than 30 minutes apart count as separate visits.
              </p>
              <div className="-mx-5 border-t border-line">
                {trails.map((item) => (
                  <VisitorRow key={item.ip} item={item} />
                ))}
              </div>
            </Panel>
          ) : null}

          {/* ---------- The log ---------- */}
          <Panel title={`Recent visits${recent.length === 100 ? " (latest 100)" : ""}`}>
            <div className="-mx-5 overflow-x-auto">
              <table className="w-full min-w-[46rem] text-left text-sm">
                <thead className="text-xs text-faint">
                  <tr className="border-b border-line">
                    <th className="px-5 py-2 font-medium">When</th>
                    <th className="px-2 py-2 font-medium">Where</th>
                    <th className="px-2 py-2 font-medium">IP</th>
                    <th className="px-2 py-2 font-medium">Page</th>
                    <th className="px-2 py-2 font-medium">Device</th>
                    <th className="px-5 py-2 font-medium">From</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((row) => (
                    <tr key={row.id} className="border-b border-line last:border-0">
                      <td className="tnum whitespace-nowrap px-5 py-2 text-muted">{when(row.createdAt)}</td>
                      <td className="whitespace-nowrap px-2 py-2">
                        {[row.city, countryName(row.country)].filter(Boolean).join(", ")}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 font-mono text-xs text-muted">{row.ip ?? "—"}</td>
                      <td className="max-w-[14rem] truncate px-2 py-2 font-mono text-xs">{row.path}</td>
                      <td className="whitespace-nowrap px-2 py-2 text-muted">
                        {[row.device, row.browser, row.os].filter(Boolean).join(" · ")}
                      </td>
                      <td className="max-w-[10rem] truncate px-5 py-2 text-muted">{row.referrer ?? "direct"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}

      {/* ---------- Housekeeping ---------- */}
      <section className="mt-10 border-t border-line pt-6">
        <h2 className="font-mono text-xs uppercase tracking-widest text-faint">Stored data</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          IP addresses count as personal data in most countries, so it is good practice not to keep them longer than
          you need. Clearing removes the visits for good.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <ClearButton olderThanDays={90} label="Delete visits older than 90 days" />
          <ClearButton olderThanDays={0} label="Delete all visits" />
        </div>
      </section>
    </>
  );
}

function Stat({ label, value, hint, small }: { label: string; value: string; hint?: string; small?: boolean }) {
  return (
    <Card>
      <p className={cn("tnum truncate", small ? "font-mono text-base leading-9" : "font-display text-3xl")}>{value}</p>
      <p className="mt-1 font-mono text-xs uppercase tracking-widest text-faint">{label}</p>
      {hint ? <p className="mt-0.5 text-xs text-faint">{hint}</p> : null}
    </Card>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-faint">{title}</h2>
      {children}
    </Card>
  );
}

/**
 * A name, a bar and a figure per row, the bars sharing one scale so rows
 * compare at a glance. The figure is always printed, so the bar is never
 * the only way to read the number.
 */
function MeterList({
  rows,
}: {
  rows: { key: string; label: React.ReactNode; value: number; note?: string }[];
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

/** Views per day across the range, one bar each; the day and count show on hover. */
function DailyBars({ days }: { days: { day: string; views: number }[] }) {
  const max = Math.max(1, ...days.map((day) => day.views));
  const label = (day: string) =>
    new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));

  return (
    <Panel title="Views per day">
      <div className="flex h-28 items-end gap-[2px]">
        {days.map((day) => (
          <div key={day.day} className="group relative flex h-full flex-1 items-end">
            <div
              className="w-full rounded-t-[3px] bg-accent/80 transition-colors group-hover:bg-accent"
              style={{ height: `${Math.max(3, (day.views / max) * 100)}%` }}
            />
            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-background px-2 py-1 text-xs shadow-sm group-hover:block">
              {label(day.day)}: <span className="tnum font-medium">{day.views}</span>
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-faint">
        <span>{label(days[0].day)}</span>
        <span>peak {max.toLocaleString("en-US")} a day</span>
        <span>{label(days[days.length - 1].day)}</span>
      </div>
    </Panel>
  );
}

/**
 * One address: a summary line (where, how often, what they looked at) that
 * opens into every view, grouped into visits. Plain <details>, so it needs no
 * client script.
 */
function VisitorRow({ item }: { item: Trail }) {
  const visitsCount = item.sessions.length;
  const device = [item.latest.device, item.latest.browser, item.latest.os].filter(Boolean).join(" · ");

  return (
    <details className="group border-b border-line last:border-0">
      <summary className="flex cursor-pointer list-none items-start gap-2 px-5 py-3 transition-colors hover:bg-accent-soft/40 [&::-webkit-details-marker]:hidden">
        <ChevronRight
          aria-hidden
          className="mt-0.5 size-4 shrink-0 text-faint transition-transform group-open:rotate-90"
        />
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <span className="font-mono text-xs">{item.ip}</span>
            <span className="text-sm">{place(item.latest) || "Unknown location"}</span>
            <span className="text-xs text-muted">
              {visitsCount} {visitsCount === 1 ? "visit" : "visits"} · {item.views}{" "}
              {item.views === 1 ? "page view" : "page views"}
            </span>
            <span className="tnum text-xs text-faint sm:ml-auto">last {when(item.latest.createdAt)}</span>
          </span>
          <span className="truncate text-xs text-faint">
            Viewed <span className="font-mono">{item.pages.join("  ·  ")}</span>
          </span>
        </span>
      </summary>

      <div className="grid gap-4 bg-accent-soft/20 px-5 pb-4 pl-11 pt-1">
        <p className="text-xs text-muted">
          First seen {when(item.first.createdAt)}
          {device ? ` · ${device}` : ""}
        </p>
        <ol className="grid gap-3">
          {item.sessions.map((session, index) => (
            <li key={session[0].id}>
              <p className="text-xs font-medium">
                Visit {index + 1}
                <span className="font-normal text-faint">
                  {" "}
                  · {when(session[0].createdAt)} · {place(session[0]) || "unknown location"} ·{" "}
                  {session[0].referrer ? `from ${session[0].referrer}` : "came directly"}
                </span>
              </p>
              <ul className="mt-1 grid gap-0.5 border-l border-line pl-3">
                {session.map((view) => (
                  <li key={view.id} className="flex min-w-0 gap-3 text-sm">
                    <span className="tnum shrink-0 text-xs leading-5 text-faint">{clock(view.createdAt)}</span>
                    <span className="truncate font-mono text-xs leading-5">{view.path}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </details>
  );
}

function ClearButton({ olderThanDays, label }: { olderThanDays: number; label: string }) {
  return (
    <ConfirmForm
      action={clearVisits}
      message={
        olderThanDays > 0
          ? `Delete every visit older than ${olderThanDays} days? This cannot be undone.`
          : "Delete every recorded visit? This cannot be undone."
      }
    >
      <input type="hidden" name="olderThanDays" value={olderThanDays} />
      <button
        type="submit"
        className="rounded-full border border-line px-4 py-2 text-sm text-muted transition-colors hover:border-danger hover:text-danger"
      >
        {label}
      </button>
    </ConfirmForm>
  );
}
