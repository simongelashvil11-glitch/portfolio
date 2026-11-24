import { desc, eq, inArray } from "drizzle-orm";

import { Card, EmptyState, PageHeading } from "@/components/admin/ui";
import { db } from "@/db";
import { signals, visits } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

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

export default async function SignalsPage() {
  await requireSession();

  // Latest 300 signals, grouped into chronological stories per session.
  const rows = await db
    .select()
    .from(signals)
    .orderBy(desc(signals.createdAt))
    .limit(300);

  const sessionIds = [...new Set(rows.map((r) => r.sessionId).filter(Boolean))] as string[];

  // Match each session to the closest recorded visit (same visitor, near time)
  // to borrow the visit's network/geo/device identity.
  const visitRows = sessionIds.length
    ? await db.select().from(visits).orderBy(desc(visits.createdAt)).limit(500)
    : [];

  const stories = new Map<
    string,
    {
      session: string;
      who: string;
      meta: string;
      events: { at: Date; type: string; text: string; path: string | null }[];
    }
  >();

  for (const s of rows) {
    const sid = s.sessionId ?? `anon-${s.id}`;
    if (!stories.has(sid)) {
      // Find a visit within ±10 minutes of this session's first signal.
      const first = rows.filter((r) => r.sessionId === s.sessionId).at(-1);
      const near = first
        ? visitRows.find(
            (v) =>
              Math.abs(
                new Date(v.createdAt).getTime() - new Date(first.createdAt).getTime(),
              ) < 10 * 60 * 1000,
          )
        : undefined;
      stories.set(sid, {
        session: sid,
        who: near?.network ?? "Unknown network",
        meta: [
          near?.browser,
          near?.os,
          near?.device,
          [near?.city, near?.country].filter(Boolean).join(", "),
        ]
          .filter(Boolean)
          .join(" · "),
        events: [],
      });
    }
    stories.get(sid)!.events.push({
      at: s.createdAt,
      type: s.signalType,
      text: describe(s.signalType, s.signalKey, s.signalValue),
      path: s.path,
    });
  }

  const storyList = [...stories.values()].sort(
    (a, b) => b.events[0].at.getTime() - a.events[0].at.getTime(),
  );

  return (
    <>
      <PageHeading
        title="Signals"
        description="Visitor stories: who they were (matched from visit logs) and what they did, in order."
      />

      {storyList.length === 0 ? (
        <EmptyState>No signals yet — browse the public site to generate some.</EmptyState>
      ) : (
        <ul className="grid gap-3">
          {storyList.map((story) => (
            <li key={story.session}>
              <Card>
                {/* Story header: WHO */}
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3">
                  <p className="font-medium">{story.who}</p>
                  <p className="font-mono text-xs text-faint">{story.meta || "details unknown"}</p>
                </div>

                {/* Timeline: WHAT, oldest → newest */}
                <ol className="mt-3 grid gap-2">
                  {[...story.events].reverse().map((e, i) => {
                    const badge = TYPE_BADGES[e.type];
                    return (
                      <li key={i} className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="w-16 shrink-0 font-mono text-xs text-faint">
                          {new Date(e.at).toLocaleTimeString("en-GB", {
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
                        <span className="ml-auto font-mono text-xs text-faint">{e.path ?? ""}</span>
                      </li>
                    );
                  })}
                </ol>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}