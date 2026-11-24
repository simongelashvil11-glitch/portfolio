import { desc, inArray } from "drizzle-orm";

import { Card, EmptyState, PageHeading } from "@/components/admin/ui";
import { db } from "@/db";
import { signals, visits } from "@/db/schema";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

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

type Visit = typeof visits.$inferSelect;

type Story = {
  session: string;
  ip: string | null;
  /** Identity guessed from a visit near in time; only used when no IP was recorded. */
  guess?: Visit;
  events: { at: Date; type: string; text: string; path: string | null }[];
};

/** Network on one line, browser/OS/device/place on the other, from a visit row. */
function identity(v: Visit | undefined) {
  return {
    who: v?.network ?? "Unknown network",
    meta: [v?.browser, v?.os, v?.device, [v?.city, v?.country].filter(Boolean).join(", ")]
      .filter(Boolean)
      .join(" · "),
  };
}

export default async function SignalsPage() {
  await requireSession();

  // Latest 300 signals, grouped by IP address, then into chronological stories per session.
  const rows = await db
    .select()
    .from(signals)
    .orderBy(desc(signals.createdAt))
    .limit(300);

  const ips = [...new Set(rows.map((r) => r.ip).filter(Boolean))] as string[];

  // The latest visit from each IP gives that address its network/geo/device identity.
  const ipVisits = ips.length
    ? await db.select().from(visits).where(inArray(visits.ip, ips)).orderBy(desc(visits.createdAt))
    : [];
  const visitByIp = new Map<string, Visit>();
  for (const v of ipVisits) if (v.ip && !visitByIp.has(v.ip)) visitByIp.set(v.ip, v);

  // Older signals were stored without an IP: fall back to the visit closest in time.
  const needsGuess = rows.some((r) => !r.ip);
  const recentVisits = needsGuess
    ? await db.select().from(visits).orderBy(desc(visits.createdAt)).limit(500)
    : [];

  const stories = new Map<string, Story>();
  for (const s of rows) {
    const sid = s.sessionId ?? `anon-${s.id}`;
    let story = stories.get(sid);
    if (!story) {
      story = { session: sid, ip: null, events: [] };
      stories.set(sid, story);
    }
    // Rows arrive newest first, so the last IP seen is the session's earliest one.
    if (s.ip) story.ip = s.ip;
    story.events.push({
      at: s.createdAt,
      type: s.signalType,
      text: describe(s.signalType, s.signalKey, s.signalValue),
      path: s.path,
    });
  }

  for (const story of stories.values()) {
    if (story.ip) continue;
    const first = story.events.at(-1)!.at.getTime();
    story.guess = recentVisits.find(
      (v) => Math.abs(new Date(v.createdAt).getTime() - first) < 10 * 60 * 1000,
    );
  }

  const groups = new Map<string, { ip: string | null; stories: Story[] }>();
  for (const story of stories.values()) {
    const key = story.ip ?? "";
    if (!groups.has(key)) groups.set(key, { ip: story.ip, stories: [] });
    groups.get(key)!.stories.push(story);
  }

  const latest = (story: Story) => story.events[0].at.getTime();
  const groupList = [...groups.values()]
    .map((g) => ({ ...g, stories: g.stories.sort((a, b) => latest(b) - latest(a)) }))
    // Newest activity first; signals with no IP recorded go last.
    .sort((a, b) =>
      !a.ip !== !b.ip ? (a.ip ? -1 : 1) : latest(b.stories[0]) - latest(a.stories[0]),
    );

  return (
    <>
      <PageHeading
        title="Signals"
        description="Visitors grouped by IP address: who they were (matched from visit logs) and what each session did, in order."
      />

      {groupList.length === 0 ? (
        <EmptyState>No signals yet — browse the public site to generate some.</EmptyState>
      ) : (
        <ul className="grid gap-4">
          {groupList.map((group) => {
            const id = group.ip ? identity(visitByIp.get(group.ip)) : null;
            return (
              <li key={group.ip ?? "no-ip"}>
                <Card>
                  {/* Group header: the IP and who owns it */}
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3">
                    <div>
                      <p className="font-mono font-medium">{group.ip ?? "IP not recorded"}</p>
                      {id ? <p className="text-sm">{id.who}</p> : null}
                    </div>
                    <div className="text-right font-mono text-xs text-faint">
                      {id ? <p>{id.meta || "details unknown"}</p> : null}
                      <p>
                        {group.stories.length} session{group.stories.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>

                  <ul className="mt-3 grid gap-4">
                    {group.stories.map((story) => {
                      const guess = story.ip ? null : identity(story.guess);
                      return (
                        <li key={story.session}>
                          {guess ? (
                            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                              <p className="text-sm font-medium">{guess.who}</p>
                              <p className="font-mono text-xs text-faint">
                                {guess.meta || "details unknown"}
                              </p>
                            </div>
                          ) : null}

                          {/* Timeline: WHAT, oldest → newest */}
                          <ol className="grid gap-2 border-l border-line pl-3">
                            {[...story.events].reverse().map((e, i) => {
                              const badge = TYPE_BADGES[e.type];
                              return (
                                <li key={i} className="flex flex-wrap items-center gap-2 text-sm">
                                  <span className="w-28 shrink-0 font-mono text-xs text-faint">
                                    {new Date(e.at).toLocaleString("en-GB", {
                                      timeZone: "Asia/Tbilisi",
                                      day: "2-digit",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                  {badge ? (
                                    <span
                                      className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${badge.cls}`}
                                    >
                                      {badge.label}
                                    </span>
                                  ) : null}
                                  <span className={e.type === "email_gate" ? "font-semibold" : ""}>
                                    {e.text}
                                  </span>
                                  <span className="ml-auto font-mono text-xs text-faint">
                                    {e.path ?? ""}
                                  </span>
                                </li>
                              );
                            })}
                          </ol>
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
