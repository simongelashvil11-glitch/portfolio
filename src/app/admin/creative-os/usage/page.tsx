import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import Link from "next/link";

import { MeterList, Panel, Stat } from "@/components/admin/stats";
import { EmptyState, PageHeading } from "@/components/admin/ui";
import { db } from "@/db";
import { cosAiOperations, cosProjects } from "@/db/creative-os";
import { count, usd } from "@/lib/creative-os/format";
import { OPERATION_KIND_LABEL } from "@/lib/creative-os/labels";
import { getSettings } from "@/lib/creative-os/pricing";

export const dynamic = "force-dynamic";
export const metadata = { title: "API usage" };

/** Operations whose cost counts (see lib/creative-os/budget.ts). */
const COUNTED = ["running", "completed", "failed", "cancelled", "refused"];
const spend = sql<number>`coalesce(sum(coalesce(${cosAiOperations.costUsd}, ${cosAiOperations.estimateHighUsd})), 0)::float`;
const monthStart = sql`date_trunc('month', now() at time zone 'UTC') at time zone 'UTC'`;

export default async function UsagePage() {
  const counted = inArray(cosAiOperations.status, COUNTED);
  const [settings, [today], [month], [lifetime], [tokens], byProject, byKind, byModel] = await Promise.all([
    getSettings(),
    db.select({ value: spend }).from(cosAiOperations).where(and(counted, gte(cosAiOperations.authorizedAt, sql`date_trunc('day', now())`))),
    db.select({ value: spend, operations: sql<number>`count(*)::int` }).from(cosAiOperations).where(and(counted, gte(cosAiOperations.authorizedAt, monthStart))),
    db.select({ value: spend, operations: sql<number>`count(*)::int` }).from(cosAiOperations).where(counted),
    db
      .select({
        input: sql<number>`coalesce(sum(${cosAiOperations.inputTokens}), 0)::int`,
        output: sql<number>`coalesce(sum(${cosAiOperations.outputTokens}), 0)::int`,
        cacheRead: sql<number>`coalesce(sum(${cosAiOperations.cacheReadTokens}), 0)::int`,
        searches: sql<number>`coalesce(sum(${cosAiOperations.webSearchRequests}), 0)::int`,
        unknown: sql<number>`count(*) filter (where ${cosAiOperations.costUsd} is null)::int`,
      })
      .from(cosAiOperations)
      .where(counted),
    db
      .select({ name: sql<string>`coalesce(${cosProjects.name}, 'No project')`, value: spend })
      .from(cosAiOperations)
      .leftJoin(cosProjects, eq(cosProjects.id, cosAiOperations.projectId))
      .where(counted)
      .groupBy(cosProjects.name)
      .orderBy(desc(spend)),
    db.select({ name: cosAiOperations.kind, value: spend }).from(cosAiOperations).where(counted).groupBy(cosAiOperations.kind).orderBy(desc(spend)),
    db.select({ name: cosAiOperations.model, value: spend }).from(cosAiOperations).where(counted).groupBy(cosAiOperations.model).orderBy(desc(spend)),
  ]);

  const cents = (value: number) => Math.round(value * 10000);
  const meter = (rows: { name: string; value: number }[], label?: (name: string) => string) =>
    rows.map((row) => ({
      key: row.name,
      label: <span className="truncate">{label ? label(row.name) : row.name}</span>,
      value: cents(Number(row.value)),
      note: usd(Number(row.value)),
    }));

  return (
    <>
      <PageHeading
        title="API usage"
        description="What CreativeOS's paid operations cost, from the usage Claude reports and your price table. These are estimates: Anthropic's invoice is the authority."
      />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
        <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 lg:grid-cols-[repeat(4,minmax(0,1fr))]">
          <Stat label="Today" value={usd(Number(today.value))} />
          <Stat
            label="This month"
            value={usd(Number(month.value))}
            hint={settings.monthlyLimitUsd !== null ? `of a ${usd(settings.monthlyLimitUsd)} limit · ${month.operations} operations` : "no monthly limit set"}
          />
          <Stat label="All time" value={usd(Number(lifetime.value))} hint={`${lifetime.operations} operations`} />
          <Stat label="Per-operation limit" value={settings.perOperationLimitUsd !== null ? usd(settings.perOperationLimitUsd) : "Not set"} />
        </div>

        {settings.monthlyLimitUsd === null || settings.perOperationLimitUsd === null ? (
          <p className="rounded-[4px] border border-[#f9d5a7] bg-[#fff9f2] px-3 py-2 text-sm">
            No paid operation can run until both limits are set. <Link href="/admin/creative-os/settings" className="font-semibold text-accent hover:underline">Set them in Settings</Link>.
          </p>
        ) : null}

        {lifetime.operations === 0 ? (
          <EmptyState>No paid operations yet.</EmptyState>
        ) : (
          <>
            <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[repeat(3,minmax(0,1fr))]">
              <Panel title="By project">
                <MeterList rows={meter(byProject)} />
              </Panel>
              <Panel title="By module">
                <MeterList rows={meter(byKind, (name) => OPERATION_KIND_LABEL[name] ?? name)} />
              </Panel>
              <Panel title="By model">
                <MeterList rows={meter(byModel)} />
              </Panel>
            </div>
            <Panel title="Tokens, all time">
              <p className="text-sm text-muted">
                {count(tokens.input)} input · {count(tokens.output)} output (thinking included) · {count(tokens.cacheRead)} read from cache ·{" "}
                {count(tokens.searches)} web searches.
                {tokens.unknown > 0
                  ? ` ${tokens.unknown} ${tokens.unknown === 1 ? "operation has" : "operations have"} no reported usage (cancelled or interrupted) and ${tokens.unknown === 1 ? "is" : "are"} counted at the worst case.`
                  : ""}
              </p>
              <p className="mt-2 text-xs text-faint">
                Bars compare cost. Each operation&apos;s own figures are in <Link href="/admin/creative-os/history" className="text-accent hover:underline">Research history</Link>.
              </p>
            </Panel>
          </>
        )}
      </div>
    </>
  );
}
