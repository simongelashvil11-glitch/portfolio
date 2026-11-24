import { count, desc, eq } from "drizzle-orm";
import Link from "next/link";

import { Card, EmptyState, PageHeading } from "@/components/admin/ui";
import { db } from "@/db";
import { signals } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  device_coarse: "Device",
  engage: "Engagement",
  copy_counter: "Copy",
  print: "Print",
  email_gate: "Email",
};

type Props = {
  searchParams: Promise<{ type?: string }>;
};

export default async function SignalsPage({ searchParams }: Props) {
  await requireSession();

  const { type: filter } = await searchParams;
  const knownFilter = filter && filter in TYPE_LABELS ? filter : null;

  const [rows, perType] = await Promise.all([
    db
      .select()
      .from(signals)
      .where(knownFilter ? eq(signals.signalType, knownFilter) : undefined)
      .orderBy(desc(signals.createdAt))
      .limit(100),
    db
      .select({ type: signals.signalType, value: count() })
      .from(signals)
      .groupBy(signals.signalType),
  ]);

  const chips = [{ type: "", label: "All", value: rows.length }].concat(
    perType.map((t) => ({
      type: t.type,
      label: TYPE_LABELS[t.type] ?? t.type,
      value: t.value,
    })),
  );

  return (
    <>
      <PageHeading
        title="Signals"
        description="Soft engagement signals from visitors: devices, scroll depth, copy and print counters, and volunteered emails."
      />

      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <Link
            key={chip.type || "all"}
            href={chip.type ? `/admin/signals?type=${chip.type}` : "/admin/signals"}
            className={`rounded-full border px-3 py-1.5 font-mono text-xs uppercase tracking-widest transition-colors ${
              (filter ?? "") === chip.type
                ? "border-accent text-accent"
                : "border-line text-muted hover:border-accent hover:text-accent"
            }`}
          >
            {chip.label}
            <span className="tnum ml-1.5 text-faint">{chip.value}</span>
          </Link>
        ))}
      </div>

      <section className="mt-6">
        {rows.length === 0 ? (
          <EmptyState>No signals yet — browse the public site to generate some.</EmptyState>
        ) : (
          <ul className="grid gap-2">
            {rows.map((s) => (
              <li key={s.id}>
                <Card>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium">
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-accent">
                        {TYPE_LABELS[s.signalType] ?? s.signalType}
                      </span>
                      {s.signalKey ? (
                        <span className="ml-2 font-mono text-xs">{s.signalKey}</span>
                      ) : null}
                      <span className="ml-2">{s.signalValue}</span>
                    </p>
                    <time className="font-mono text-xs text-faint">
                      {formatDate(s.createdAt)}
                    </time>
                  </div>
                  <p className="mt-1.5 truncate font-mono text-xs text-faint">
                    {s.path ?? "—"}
                    {s.sessionId ? ` · session ${s.sessionId.slice(0, 8)}` : ""}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}