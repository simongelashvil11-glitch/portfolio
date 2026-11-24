import { desc, inArray } from "drizzle-orm";
import { ChevronRight } from "lucide-react";

import { CloudTag, place } from "@/components/admin/network";
import { Card, EmptyState, PageHeading } from "@/components/admin/ui";
import { db } from "@/db";
import { signals, visits, type Signal, type Visit } from "@/db/schema";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = { title: "Signals" };

/** Times are shown in Tbilisi, where the site's owner reads them. */
const TIME_ZONE = "Asia/Tbilisi";

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

const TYPE_BADGES: Record<string, { label: string; cls: string }> = {
  device_coarse: { label: "DEVICE", cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  engage: { label: "READ", cls: "bg-green-500/10 text-green-600 dark:text-green-400" },
  copy_counter: { label: "COPIED", cls: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  print: { label: "PRINTED", cls: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  email_gate: { label: "EMAIL!", cls: "bg-red-500/10 text-red-600 dark:text-red-400" },
};

/** Human sentence for each signal, built from its key/value. */
function describe(signalType: string, key: string | null, value: string | null): string {
  switch (signalType) {
    case "device_coarse":
      return (value ?? "").replaceAll("|", " · ").replace(/(\w)=/g, (_m, g) => g + ": ");
    case "engage": {
      const [scroll, secs] = (value ?? "/").split("/");
      const minutes = Math.floor(parseInt(secs ?? "0", 10) / 60);
      const rest = parseInt(secs ?? "0", 10) % 60;
      const dur = minutes > 0 ? `${minutes}m ${rest}s` : `${rest ?? 0}s`;
      return `read ${dur}, scrolled to ${scroll} of the page`;
    }
    case "copy_counter":
      return value === "phone-like"
        ? "copied the phone number"
        : value === "email-like"
          ? "copied an email address"
          : "copied some text";
    case "print":
      return "printed the page";
    case "email_gate":
      return `left email: ${value ?? "—"}`;
    default:
      return `${key ?? signalType}: ${value ?? ""}`;
  }
}

/** Who an address belongs to: the same fields the visitors page shows. */
type Identity = {
  country: string | null;
  city: string | null;
  network: string | null;
  asn: number | null;
  cloud: boolean | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  screen: string | null;
  lang: string | null;
};

const IDENTITY_KEYS = [
  "country", "city", "network", "asn", "cloud", "device", "browser", "os", "screen", "lang",
] as const;

/**
 * Field by field, the first source that knows it wins. Sources come newest
 * first: the address's own signals, then its page views, which also carry
 * window size and language.
 */
function mergeIdentity(sources: Partial<Record<keyof Identity, unknown>>[]): Identity {
  const out = Object.fromEntries(IDENTITY_KEYS.map((key) => [key, null])) as Record<keyof Identity, unknown>;
  for (const key of IDENTITY_KEYS) {
    const hit = sources.find((source) => source[key] !== null && source[key] !== undefined);
    if (hit) out[key] = hit[key];
  }
  return out as Identity;
}

type Story = {
  session: string;
  ip: string | null;
  /** Oldest first. */
  events: { at: Date; type: string; text: string; path: string | null }[];
};

type Group = {
  ip: string | null;
  identity: Identity | null;
  stories: Story[];
  signals: number;
  first: Date;
  last: Date;
  pages: string[];
};

export default async function SignalsPage() {
  await requireSession();

  // Latest 300 signals, grouped by IP address, then into stories per session.
  const rows = await db.select().from(signals).orderBy(desc(signals.createdAt)).limit(300);

  const ips = [...new Set(rows.map((r) => r.ip).filter(Boolean))] as string[];
  const ipVisits = ips.length
    ? await db
        .select()
        .from(visits)
        .where(inArray(visits.ip, ips))
        .orderBy(desc(visits.createdAt))
        .limit(2000)
    : [];

  // Older signals were stored without an IP: borrow one from the page view
  // closest in time, the way this page used to guess.
  const needsGuess = rows.some((r) => !r.ip);
  const recentVisits = needsGuess
    ? await db.select().from(visits).orderBy(desc(visits.createdAt)).limit(500)
    : [];

  const sessionRows = new Map<string, Signal[]>();
  for (const row of rows) {
    const sid = row.sessionId ?? `anon-${row.id}`;
    sessionRows.set(sid, [...(sessionRows.get(sid) ?? []), row]);
  }

  const stories: Story[] = [...sessionRows].map(([sid, list]) => {
    const oldest = [...list].reverse();
    let ip = oldest.find((r) => r.ip)?.ip ?? null;
    if (!ip) {
      const start = oldest[0].createdAt.getTime();
      ip =
        recentVisits.find((v) => v.ip && Math.abs(v.createdAt.getTime() - start) < 10 * 60 * 1000)?.ip ?? null;
    }
    return {
      session: sid,
      ip,
      events: oldest.map((r) => ({
        at: r.createdAt,
        type: r.signalType,
        text: describe(r.signalType, r.signalKey, r.signalValue),
        path: r.path,
      })),
    };
  });

  // Guessed addresses need their page views too, for the identity.
  const guessedIps = [...new Set(stories.map((s) => s.ip).filter((ip): ip is string => !!ip && !ips.includes(ip)))];
  const guessedVisits = guessedIps.length
    ? await db.select().from(visits).where(inArray(visits.ip, guessedIps)).orderBy(desc(visits.createdAt)).limit(1000)
    : [];

  const visitsByIp = new Map<string, Visit[]>();
  for (const v of [...ipVisits, ...guessedVisits]) {
    if (v.ip) visitsByIp.set(v.ip, [...(visitsByIp.get(v.ip) ?? []), v]);
  }
  const signalsByIp = new Map<string, Signal[]>();
  for (const r of rows) {
    if (r.ip) signalsByIp.set(r.ip, [...(signalsByIp.get(r.ip) ?? []), r]);
  }

  const groupMap = new Map<string, Group>();
  for (const story of stories) {
    const key = story.ip ?? "";
    let group = groupMap.get(key);
    if (!group) {
      group = {
        ip: story.ip,
        identity: story.ip
          ? mergeIdentity([...(signalsByIp.get(story.ip) ?? []), ...(visitsByIp.get(story.ip) ?? [])])
          : null,
        stories: [],
        signals: 0,
        first: story.events[0].at,
        last: story.events[story.events.length - 1].at,
        pages: [],
      };
      groupMap.set(key, group);
    }
    group.stories.push(story);
    group.signals += story.events.length;
    if (story.events[0].at < group.first) group.first = story.events[0].at;
    const end = story.events[story.events.length - 1].at;
    if (end > group.last) group.last = end;
    for (const e of story.events) if (e.path && !group.pages.includes(e.path)) group.pages.push(e.path);
  }

  const ended = (story: Story) => story.events[story.events.length - 1].at.getTime();
  const groups = [...groupMap.values()]
    .map((g) => ({ ...g, stories: g.stories.sort((a, b) => ended(b) - ended(a)) }))
    // Newest activity first; signals with no address at all go last.
    .sort((a, b) => (!a.ip !== !b.ip ? (a.ip ? -1 : 1) : b.last.getTime() - a.last.getTime()));

  // Which networks the signalling visitors came from, counted in addresses.
  const networkCounts = new Map<string, { network: string; cloud: boolean; ips: number; signals: number }>();
  for (const g of groups) {
    if (!g.ip || !g.identity?.network) continue;
    const key = `${g.identity.network}-${g.identity.cloud}`;
    const entry = networkCounts.get(key) ?? { network: g.identity.network, cloud: !!g.identity.cloud, ips: 0, signals: 0 };
    entry.ips += 1;
    entry.signals += g.signals;
    networkCounts.set(key, entry);
  }
  const networks = [...networkCounts.values()].sort((a, b) => b.ips - a.ips || b.signals - a.signals).slice(0, 10);
  const maxIps = Math.max(1, ...networks.map((n) => n.ips));

  return (
    <>
      <PageHeading
        title="Signals"
        description="What visitors did on the site, grouped by IP address, with the network, place and device behind each one."
      />

      {groups.length === 0 ? (
        <EmptyState>No signals yet — browse the public site to generate some.</EmptyState>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
          {networks.length > 0 ? (
            <Card>
              <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-faint">Networks</h2>
              <ul className="grid gap-2.5">
                {networks.map((row) => (
                  <li key={`${row.network}-${row.cloud}`} className="grid gap-1">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate">{row.network}</span>
                        {row.cloud ? <CloudTag /> : null}
                      </span>
                      <span className="tnum shrink-0">
                        {row.ips}
                        <span className="ml-1.5 text-xs text-faint">
                          {row.signals} {row.signals === 1 ? "signal" : "signals"}
                        </span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-line/60">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${(row.ips / maxIps) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-4 border-t border-line pt-3 text-xs text-faint">
                Counted in IP addresses: the carrier, ISP, company or cloud host that owns each one. Data:{" "}
                <a href="https://db-ip.com" className="underline hover:text-foreground">
                  IP to ASN Lite by DB-IP
                </a>
                , CC BY 4.0.
              </p>
            </Card>
          ) : null}

          <Card>
            <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-faint">Signals by IP</h2>
            <p className="-mt-2 mb-3 text-xs text-faint">
              Select an address to see each session in order. Older signals saved before IPs were recorded are matched
              to the page view closest in time.
            </p>
            <div className="-mx-5 border-t border-line">
              {groups.map((group) => (
                <IpRow key={group.ip ?? "no-ip"} group={group} />
              ))}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

/**
 * One address: a summary line (where, which network, how much it did) that
 * opens into every session's timeline. Plain <details>, so it needs no
 * client script — the same shape as the visitors page.
 */
function IpRow({ group }: { group: Group }) {
  const id = group.identity;
  const sessions = group.stories.length;
  const device = id ? [id.device, id.browser, id.os].filter(Boolean).join(" · ") : "";
  const hasEmail = group.stories.some((s) => s.events.some((e) => e.type === "email_gate"));

  return (
    <details className="group border-b border-line last:border-0">
      <summary className="flex cursor-pointer list-none items-start gap-2 px-5 py-3 transition-colors hover:bg-accent-soft/40 [&::-webkit-details-marker]:hidden">
        <ChevronRight
          aria-hidden
          className="mt-0.5 size-4 shrink-0 text-faint transition-transform group-open:rotate-90"
        />
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <span className="font-mono text-xs">{group.ip ?? "IP not recorded"}</span>
            {id ? <span className="text-sm">{place(id) || "Unknown location"}</span> : null}
            {id?.network ? (
              <span className="flex min-w-0 items-center gap-1.5 text-sm text-muted">
                {id.network}
                {id.cloud ? <CloudTag /> : null}
              </span>
            ) : null}
            <span className="text-xs text-muted">
              {sessions} {sessions === 1 ? "session" : "sessions"} · {group.signals}{" "}
              {group.signals === 1 ? "signal" : "signals"}
            </span>
            {hasEmail ? (
              <span className="rounded-full bg-red-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-red-600 dark:text-red-400">
                Email!
              </span>
            ) : null}
            <span className="tnum text-xs text-faint sm:ml-auto">last {when(group.last)}</span>
          </span>
          {group.pages.length > 0 ? (
            <span className="truncate text-xs text-faint">
              On <span className="font-mono">{group.pages.join("  ·  ")}</span>
            </span>
          ) : null}
        </span>
      </summary>

      <div className="grid gap-4 bg-accent-soft/20 px-5 pb-4 pl-11 pt-1">
        <p className="text-xs text-muted">
          {[
            `First seen ${when(group.first)}`,
            device,
            id?.screen ? `window ${id.screen}` : null,
            id?.lang ? `language ${id.lang}` : null,
            id?.asn ? `AS${id.asn}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <ol className="grid gap-3">
          {group.stories.map((story, index) => (
            <li key={story.session}>
              <p className="text-xs font-medium">
                Session {group.stories.length - index}
                <span className="font-normal text-faint"> · {when(story.events[0].at)}</span>
              </p>
              <ol className="mt-1 grid gap-1 border-l border-line pl-3">
                {story.events.map((e, i) => {
                  const badge = TYPE_BADGES[e.type];
                  return (
                    <li key={i} className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
                      <span className="tnum shrink-0 text-xs leading-5 text-faint">{clock(e.at)}</span>
                      {badge ? (
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      ) : null}
                      <span className={e.type === "email_gate" ? "font-semibold" : ""}>{e.text}</span>
                      <span className="ml-auto font-mono text-xs text-faint">{e.path ?? ""}</span>
                    </li>
                  );
                })}
              </ol>
            </li>
          ))}
        </ol>
      </div>
    </details>
  );
}
