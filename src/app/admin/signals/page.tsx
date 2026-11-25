import { and, desc, eq, isNull, sql, type SQL } from "drizzle-orm";
import { ArrowLeft, Download, Search } from "lucide-react";
import Link from "next/link";

import { clearSignals } from "@/actions/admin";
import { ConfirmForm } from "@/components/admin/confirm-form";
import { CloudTag, countryName, place } from "@/components/admin/network";
import { DailyBars, MeterList, Panel, Pill, RangeNav, Stat } from "@/components/admin/stats";
import { EmptyState, PageHeading } from "@/components/admin/ui";
import { db } from "@/db";
import { messages, signals, visits } from "@/db/schema";
import {
  buildPeople,
  dailyPeople,
  isLegacyRead,
  pageStats,
  tally,
  topClicks,
  totals,
  type ActivityEvent,
  type Person,
} from "@/lib/activity";
import { dayKey, dayKeysEnding, duration, plural, when } from "@/lib/admin-time";
import { requireSession } from "@/lib/auth";
import { inRange, pickRange } from "@/lib/visit-ranges";

import { EventTag, PersonRow, personHref, whoLine } from "./parts";

export const dynamic = "force-dynamic";

export const metadata = { title: "Signals" };

/** Rows read per table: far more than the site sees in a range, and a ceiling if that changes. */
const ROW_LIMIT = 10_000;
/** People listed at once, after filtering. */
const PEOPLE_LIMIT = 100;

const SHOWS = [
  { key: "people", label: "People" },
  { key: "interested", label: "Interested" },
  { key: "all", label: "Everyone" },
] as const;
type Show = (typeof SHOWS)[number]["key"];

const SORTS = [
  { key: "recent", label: "Latest first" },
  { key: "interest", label: "Most interested first" },
] as const;
type Sort = (typeof SORTS)[number]["key"];

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** True when the search text appears anywhere a person can be recognised by. */
function matches(person: Person, query: string): boolean {
  const id = person.identity;
  const haystack = [
    person.ip,
    id.city,
    id.region,
    id.country,
    id.country ? countryName(id.country) : null,
    id.network,
    id.asn ? `AS${id.asn}` : null,
    id.browser,
    id.os,
    id.platform,
    ...person.emails,
    ...person.names,
    ...person.pages,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

export default async function SignalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSession();

  const params = await searchParams;
  const range = pickRange(one(params.range));
  const show: Show = SHOWS.find((item) => item.key === one(params.show))?.key ?? "people";
  const sort: Sort = SORTS.find((item) => item.key === one(params.sort))?.key ?? "recent";
  const query = (one(params.q) ?? "").trim().slice(0, 100);
  const focus = one(params.ip)?.slice(0, 64) || null;

  // One visitor: only their rows. "none" is the bucket of signals saved before addresses were.
  const visitWhere: (SQL | undefined)[] = [inRange(range)];
  const signalWhere: (SQL | undefined)[] = [inRange(range, signals.createdAt, { zoned: true })];
  if (focus) {
    visitWhere.push(focus === "none" ? isNull(visits.ip) : eq(visits.ip, focus));
    signalWhere.push(focus === "none" ? isNull(signals.ip) : eq(signals.ip, focus));
  }

  const [visitRows, signalRows, messageRows, clockRows] = await Promise.all([
    db
      .select()
      .from(visits)
      .where(and(...visitWhere))
      .orderBy(desc(visits.createdAt))
      .limit(ROW_LIMIT),
    db
      .select()
      .from(signals)
      .where(and(...signalWhere))
      .orderBy(desc(signals.createdAt))
      .limit(ROW_LIMIT),
    db.select().from(messages).where(inRange(range, messages.createdAt)).orderBy(desc(messages.createdAt)),
    // Today, by the database's clock, so nothing reads the time while rendering.
    db.execute<{ now: string }>(sql`select (extract(epoch from now()) * 1000)::bigint::text as now`),
  ]);

  const everyone = buildPeople({ visits: visitRows, signals: signalRows, messages: messageRows });
  // A person: an address that does not look automated. The no-address bucket
  // (signals from before IPs were recorded) is many people at once, so it
  // only appears under Everyone.
  const isPerson = (person: Person) => person.ip !== null && !person.automated;
  const isInterested = (person: Person) =>
    isPerson(person) && (person.tier !== "browsing" || person.important.length > 0);
  const filters: Record<Show, (person: Person) => boolean> = {
    people: isPerson,
    interested: isInterested,
    all: () => true,
  };
  const counts: Record<Show, number> = {
    people: everyone.filter(isPerson).length,
    interested: everyone.filter(isInterested).length,
    all: everyone.length,
  };
  const audience = everyone.filter(filters[show]);
  const hiddenAutomated = everyone.filter((person) => person.automated).length;
  const hiddenUnaddressed = everyone.some((person) => person.ip === null);
  const found = (focus ? everyone : audience)
    .filter((person) => !focus || person.key === focus)
    .filter((person) => !query || matches(person, query));
  const listed = (sort === "interest" ? [...found].sort((a, b) => b.score - a.score || b.last.getTime() - a.last.getTime()) : found).slice(
    0,
    PEOPLE_LIMIT,
  );

  const legacyReads = signalRows.filter(isLegacyRead).length;
  const summary = totals(audience);
  const pages = pageStats(audience);
  const clicks = topClicks(audience);
  const important = audience
    .flatMap((person) => person.important.map((event) => ({ event, person })))
    .sort((a, b) => b.event.at.getTime() - a.event.at.getTime());
  const recent = audience
    .flatMap((person) => person.sessions.flatMap((session) => session.events.map((event) => ({ event, person }))))
    .sort((a, b) => b.event.at.getTime() - a.event.at.getTime())
    .slice(0, 60);

  const today = dayKey(new Date(Number(clockRows.rows[0]?.now ?? 0)));
  const daily = range.days && range.days > 1 ? dailyPeople(audience, dayKeysEnding(today, range.days)) : [];

  const platforms = tally(audience, (person) => person.identity.platform ?? person.identity.os);
  const browsers = tally(audience, (person) => person.identity.browser);
  const screens = tally(audience, (person) => person.identity.screenClass);
  const zones = tally(audience, (person) => person.identity.timeZone);
  const networks = tally(audience, (person) => person.identity.network);
  const cloudNetworks = new Set(audience.filter((p) => p.identity.cloud).map((p) => p.identity.network));

  const link = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams();
    const merged: Record<string, string | null> = { range: range.key, show, sort, q: query || null, ...changes };
    for (const [key, value] of Object.entries(merged)) {
      if (value && !(key === "show" && value === "people") && !(key === "sort" && value === "recent")) next.set(key, value);
    }
    const text = next.toString();
    return `/admin/signals${text ? `?${text}` : ""}`;
  };

  const nothingAtAll = everyone.length === 0 && !focus;

  return (
    <>
      <PageHeading
        title="Signals"
        description="Who came, what they read and what they did — page views, reading time, links followed, copies and messages on one timeline per visitor."
      />

      <RangeNav current={range} href={(key) => link({ range: key })}>
        {signalRows.length > 0 ? (
          <a
            href={`/admin/signals/export?range=${range.key}`}
            download
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm text-muted transition-colors hover:border-accent hover:text-foreground"
          >
            <Download aria-hidden className="size-3.5" />
            Export CSV
          </a>
        ) : null}
      </RangeNav>

      {nothingAtAll ? (
        <EmptyState>
          Nothing recorded {range.days ? `in the last ${range.label}` : "yet"}. Activity is recorded on the live site
          only, and not while you are signed in — open the site in a private window to see your own visit arrive.
        </EmptyState>
      ) : focus ? (
        <FocusView person={listed[0] ?? null} range={range.key} back={link({ ip: null, show: null })} />
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
          {/* ---------- Who to show ---------- */}
          <div className="flex flex-wrap items-center gap-1.5">
            {SHOWS.map((item) => (
              <Pill key={item.key} href={link({ show: item.key })} active={item.key === show}>
                {item.label}
                <span className="tnum text-xs opacity-70">{counts[item.key]}</span>
              </Pill>
            ))}
            {show !== "all" && (hiddenAutomated || hiddenUnaddressed) ? (
              <span className="ml-1 text-xs text-faint">
                Hidden:{" "}
                {[
                  hiddenAutomated ? `${plural(hiddenAutomated, "address", "addresses")} that look automated` : null,
                  hiddenUnaddressed ? "older signals saved without an address" : null,
                ]
                  .filter(Boolean)
                  .join(" and ")}
              </span>
            ) : null}
          </div>

          {/* ---------- Headline figures ---------- */}
          <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))] xl:grid-cols-[repeat(6,minmax(0,1fr))]">
            <Stat label="Visitors" value={summary.people.toLocaleString("en-US")} hint="by IP address" />
            <Stat
              label="Visits"
              value={summary.visits.toLocaleString("en-US")}
              hint={`${plural(summary.returning, "visitor")} came back`}
            />
            <Stat
              label="Median read"
              value={summary.reads ? duration(summary.medianRead) : "—"}
              hint={summary.reads ? `${summary.averageScroll}% down a page, on average` : "no reading reports yet"}
            />
            <Stat label="Key actions" value={summary.actions.toLocaleString("en-US")} hint="contact, downloads, copies" />
            <Stat label="Emails left" value={summary.leads.toLocaleString("en-US")} hint="exit card or message" />
            <Stat label="Very interested" value={summary.hot.toLocaleString("en-US")} hint="visitors scoring high" />
          </div>

          {/* ---------- What deserves a reply ---------- */}
          <Panel title="Worth a look">
            {important.length === 0 ? (
              <p className="text-sm text-muted">
                Nobody in this range got in touch, downloaded a file, copied your details or printed a page. These
                appear here the moment someone does.
              </p>
            ) : (
              <ul className="-mx-5 border-t border-line">
                {important.slice(0, 15).map(({ event, person }) => (
                  <ImportantRow key={event.id} event={event} person={person} range={range.key} />
                ))}
              </ul>
            )}
            {important.length > 15 ? (
              <p className="mt-3 text-xs text-faint">
                Showing the latest 15 of {important.length}. Every one is on its visitor&apos;s timeline below.
              </p>
            ) : null}
          </Panel>

          {daily.length > 1 ? (
            <DailyBars
              title="Visitors per day"
              unit={["visitor", "visitors"]}
              days={daily.map((row) => ({ day: row.day, value: row.people }))}
            />
          ) : null}

          {/* ---------- Pages ---------- */}
          {pages.length > 0 ? (
            <Panel title="How each page is read">
              <div className="-mx-5 overflow-x-auto">
                <table className="w-full min-w-[44rem] text-left text-sm">
                  <thead className="text-xs text-faint">
                    <tr className="border-b border-line">
                      <th className="px-5 py-2 font-medium">Page</th>
                      <th className="px-2 py-2 text-right font-medium">Visitors</th>
                      <th className="px-2 py-2 text-right font-medium">Views</th>
                      <th className="px-2 py-2 text-right font-medium">Median read</th>
                      <th className="px-2 py-2 font-medium">Scrolled, on average</th>
                      <th className="px-2 py-2 text-right font-medium">Read to the end</th>
                      <th className="px-5 py-2 text-right font-medium">Key actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pages.slice(0, 15).map((row) => (
                      <tr key={row.path} className="border-b border-line last:border-0">
                        <td className="max-w-[16rem] truncate px-5 py-2 font-mono text-xs">{row.path}</td>
                        <td className="tnum px-2 py-2 text-right">{row.people}</td>
                        <td className="tnum px-2 py-2 text-right text-muted">{row.views}</td>
                        <td className="tnum px-2 py-2 text-right">{row.reads ? duration(row.medianSeconds) : "—"}</td>
                        <td className="px-2 py-2">
                          {row.reads ? (
                            <span className="flex items-center gap-2">
                              <span aria-hidden className="h-1.5 w-20 overflow-hidden rounded-full bg-line/60">
                                <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.max(3, row.averageScroll)}%` }} />
                              </span>
                              <span className="tnum text-xs text-muted">{row.averageScroll}%</span>
                            </span>
                          ) : (
                            <span className="text-faint">—</span>
                          )}
                        </td>
                        <td className="tnum px-2 py-2 text-right text-muted">
                          {row.reads ? `${Math.round((row.finished / row.reads) * 100)}%` : "—"}
                        </td>
                        <td className="tnum px-5 py-2 text-right">{row.actions || <span className="text-faint">0</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 border-t border-line pt-3 text-xs text-faint">
                Reading time counts only while the tab is on screen. &ldquo;Read to the end&rdquo; is the share of reads
                that got at least 90% of the way down.
                {legacyReads
                  ? ` ${plural(legacyReads, "reading report")} from the first version of the tracker ${legacyReads === 1 ? "is" : "are"} left out: it counted time on later pages too, so its figures were not reading time.`
                  : ""}
              </p>
            </Panel>
          ) : null}

          <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[repeat(2,minmax(0,1fr))]">
            <Panel title="Links followed">
              {clicks.length === 0 ? (
                <p className="text-sm text-muted">
                  No email, phone, WhatsApp, download or outside links followed in this range.
                </p>
              ) : (
                <MeterList
                  rows={clicks.slice(0, 10).map((row) => ({
                    key: `${row.kind}-${row.label}`,
                    label: <span className="truncate">{row.label}</span>,
                    value: row.people,
                    note: plural(row.clicks, "click"),
                  }))}
                />
              )}
              <p className="mt-4 border-t border-line pt-3 text-xs text-faint">Counted in visitors.</p>
            </Panel>

            <Panel title="Networks">
              {networks.length === 0 ? (
                <p className="text-sm text-muted">No network data in this range.</p>
              ) : (
                <MeterList
                  rows={networks.slice(0, 8).map((row) => ({
                    key: row.value,
                    label: (
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate">{row.value}</span>
                        {cloudNetworks.has(row.value) ? <CloudTag /> : null}
                      </span>
                    ),
                    value: row.count,
                  }))}
                />
              )}
              <p className="mt-4 border-t border-line pt-3 text-xs text-faint">
                Counted in visitors: the carrier, ISP, company or cloud host that owns each address. Data:{" "}
                <a href="https://db-ip.com" className="underline hover:text-foreground">
                  IP to ASN Lite by DB-IP
                </a>
                , CC BY 4.0.
              </p>
            </Panel>

            <Panel title="Devices" className="lg:col-span-2">
              <div className="grid grid-cols-[minmax(0,1fr)] gap-6 sm:grid-cols-[repeat(2,minmax(0,1fr))] lg:grid-cols-[repeat(4,minmax(0,1fr))]">
                <TallyBlock title="System" rows={platforms} />
                <TallyBlock title="Browser" rows={browsers} />
                <TallyBlock title="Screen" rows={screens} />
                <TallyBlock title="Clock" rows={zones} />
              </div>
              <p className="mt-4 border-t border-line pt-3 text-xs text-faint">
                Counted in visitors, from the last device each one used. A clock far from the address&apos;s country
                usually means a VPN or a traveller; a clock on UTC is typical of servers.
              </p>
            </Panel>
          </div>

          {/* ---------- Everyone, one row each ---------- */}
          <Panel
            title={`Visitors${found.length > PEOPLE_LIMIT ? ` (showing ${PEOPLE_LIMIT} of ${found.length})` : ` (${found.length})`}`}
            action={<SortLinks sort={sort} link={link} />}
          >
            <form action="/admin/signals" className="mb-4 flex gap-2">
              <input type="hidden" name="range" value={range.key} />
              {show !== "people" ? <input type="hidden" name="show" value={show} /> : null}
              {sort !== "recent" ? <input type="hidden" name="sort" value={sort} /> : null}
              <label className="relative flex-1">
                <span className="sr-only">Search visitors</span>
                <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
                <input
                  type="search"
                  name="q"
                  defaultValue={query}
                  placeholder="IP, city, country, network, email, name or page"
                  className="w-full rounded-lg border border-line bg-background py-2 pl-9 pr-3 text-sm placeholder:text-faint focus:border-accent focus:outline-none"
                />
              </label>
              <button type="submit" className="rounded-lg border border-line px-4 text-sm text-muted transition-colors hover:border-accent hover:text-foreground">
                Search
              </button>
              {query ? (
                <Link href={link({ q: null })} className="self-center text-sm text-accent hover:underline">
                  Clear
                </Link>
              ) : null}
            </form>
            {listed.length === 0 ? (
              <p className="text-sm text-muted">
                {query ? `Nobody matches “${query}”.` : "Nobody to show with this filter."}
              </p>
            ) : (
              <>
                <p className="-mt-1 mb-3 text-xs text-faint">
                  Open a visitor to see every visit in order. Activity more than 30 minutes apart counts as a separate
                  visit.
                </p>
                <div className="-mx-5 border-t border-line">
                  {listed.map((person) => (
                    <PersonRow key={person.key} person={person} range={range.key} />
                  ))}
                </div>
              </>
            )}
          </Panel>

          {/* ---------- Everything, newest first ---------- */}
          <Panel title="Latest activity">
            <div className="-mx-5 overflow-x-auto">
              <table className="w-full min-w-[48rem] text-left text-sm">
                <thead className="text-xs text-faint">
                  <tr className="border-b border-line">
                    <th className="px-5 py-2 font-medium">When</th>
                    <th className="px-2 py-2 font-medium">Who</th>
                    <th className="px-2 py-2 font-medium">What</th>
                    <th className="px-5 py-2 font-medium">Page</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map(({ event, person }) => (
                    <tr key={event.id} className="border-b border-line last:border-0">
                      <td className="tnum whitespace-nowrap px-5 py-2 text-muted">{when(event.at)}</td>
                      <td className="max-w-[16rem] px-2 py-2">
                        <Link href={personHref(person, range.key)} className="block truncate hover:text-accent">
                          <span className="font-mono text-xs">{person.ip ?? "—"}</span>
                          <span className="text-muted"> {place(person.identity)}</span>
                        </Link>
                      </td>
                      <td className="px-2 py-2">
                        <span className="flex min-w-0 items-center gap-2">
                          <EventTag event={event} />
                          <span className="truncate">
                            {event.kind === "view" ? (event.referrer ? `Arrived from ${event.referrer}` : "Opened the page") : event.text}
                            {event.kind === "view" && event.read ? (
                              <span className="text-muted">
                                {" "}
                                · read {duration(event.read.seconds)}, {event.read.scroll}% down
                              </span>
                            ) : null}
                          </span>
                        </span>
                      </td>
                      <td className="max-w-[12rem] truncate px-5 py-2 font-mono text-xs text-muted">{event.path ?? ""}</td>
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
          Signals keep IP addresses and any email a visitor leaves, which count as personal data, so it is good
          practice not to keep them longer than you need. Clearing removes the signals for good; page views stay on the
          Visitors page until you clear them there.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <ClearButton olderThanDays={90} label="Delete signals older than 90 days" />
          <ClearButton olderThanDays={0} label="Delete all signals" />
        </div>
      </section>
    </>
  );
}

function SortLinks({ sort, link }: { sort: Sort; link: (changes: Record<string, string | null>) => string }) {
  return (
    <span className="flex gap-3 text-xs">
      {SORTS.map((item) => (
        <Link
          key={item.key}
          href={link({ sort: item.key })}
          aria-current={item.key === sort ? "true" : undefined}
          className={item.key === sort ? "font-medium text-foreground" : "text-faint hover:text-foreground"}
        >
          {item.label}
        </Link>
      ))}
    </span>
  );
}

/** One thing that deserves attention: what, who, where and when, with a way to answer it. */
function ImportantRow({ event, person, range }: { event: ActivityEvent; person: Person; range: string }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-5 py-2.5 text-sm last:border-0">
      <EventTag event={event} />
      <span className="font-medium">{event.text}</span>
      {event.email ? (
        <a
          href={`mailto:${event.email}?subject=${encodeURIComponent("Your rate sheet")}`}
          className="text-accent hover:underline"
        >
          {event.email}
        </a>
      ) : null}
      {event.message ? (
        <Link href="/admin/messages" className="text-accent hover:underline">
          {event.message.email}
        </Link>
      ) : null}
      {event.path ? <span className="font-mono text-xs text-faint">{event.path}</span> : null}
      <Link href={personHref(person, range)} className="min-w-0 truncate text-xs text-muted hover:text-accent sm:ml-auto">
        {[person.ip, whoLine(person)].filter(Boolean).join(" · ") || "Unknown visitor"}
      </Link>
      <span className="tnum shrink-0 text-xs text-faint">{when(event.at)}</span>
    </li>
  );
}

function TallyBlock({ title, rows }: { title: string; rows: { value: string; count: number }[] }) {
  return (
    <div className="min-w-0">
      <h3 className="mb-2 text-xs font-medium text-muted">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-faint">Not known yet.</p>
      ) : (
        <MeterList
          rows={rows.slice(0, 5).map((row) => ({
            key: row.value,
            label: <span className="truncate">{row.value}</span>,
            value: row.count,
          }))}
        />
      )}
    </div>
  );
}

/** One visitor on their own: everything about them, opened. */
function FocusView({ person, range, back }: { person: Person | null; range: string; back: string }) {
  return (
    <div className="grid gap-4">
      <Link href={back} className="inline-flex items-center gap-1.5 justify-self-start text-sm text-accent hover:underline">
        <ArrowLeft aria-hidden className="size-4" />
        All visitors
      </Link>
      {person ? (
        <Panel title="Visitor">
          <div className="-mx-5 border-t border-line">
            <PersonRow person={person} range={range} open />
          </div>
        </Panel>
      ) : (
        <EmptyState>Nothing from this address in the chosen range. Try a longer range.</EmptyState>
      )}
    </div>
  );
}

function ClearButton({ olderThanDays, label }: { olderThanDays: number; label: string }) {
  return (
    <ConfirmForm
      action={clearSignals}
      message={
        olderThanDays > 0
          ? `Delete every signal older than ${olderThanDays} days? This cannot be undone.`
          : "Delete every recorded signal? This cannot be undone."
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
