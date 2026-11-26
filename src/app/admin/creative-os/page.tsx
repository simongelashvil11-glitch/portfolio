import { and, asc, count, countDistinct, desc, eq, gte, inArray, isNotNull, ne, sql } from "drizzle-orm";
import Link from "next/link";

import { Panel, Stat } from "@/components/admin/stats";
import { button, EmptyState, PageHeading } from "@/components/admin/ui";
import { Add } from "@/components/fluent-icons";
import { db } from "@/db";
import {
  cosAdAnalyses,
  cosAds,
  cosAiOperations,
  cosAssignments,
  cosAuditLog,
  cosKnowledgeItems,
  cosProjects,
} from "@/db/creative-os";
import { when } from "@/lib/admin-time";
import { usd } from "@/lib/creative-os/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Overview" };

/** Operations whose cost counts (see lib/creative-os/budget.ts). */
const COUNTED = ["running", "completed", "failed", "cancelled", "refused"];
const spend = sql<number>`coalesce(sum(coalesce(${cosAiOperations.costUsd}, ${cosAiOperations.estimateHighUsd})), 0)`;

const ACTION_LABEL: Record<string, string> = {
  created: "Created",
  updated: "Updated",
  duplicated: "Duplicated",
  archived: "Archived",
  restored: "Restored",
  deleted: "Deleted",
  authorized: "Authorized",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
  refused: "Declined",
  limits_changed: "Changed the limits",
  price_changed: "Changed a price",
};

export default async function CreativeOsOverview() {
  const counted = inArray(cosAiOperations.status, COUNTED);
  const [
    [projects],
    [assignments],
    [knowledge],
    [ads],
    [analysed],
    [today],
    [month],
    [lifetime],
    deadlines,
    activity,
  ] = await Promise.all([
    db.select({ value: count() }).from(cosProjects).where(eq(cosProjects.status, "active")),
    db.select({ value: count() }).from(cosAssignments).where(inArray(cosAssignments.status, ["open", "submitted"])),
    db.select({ value: count() }).from(cosKnowledgeItems),
    db.select({ value: count() }).from(cosAds),
    db.select({ value: countDistinct(cosAdAnalyses.adId) }).from(cosAdAnalyses),
    db.select({ value: spend }).from(cosAiOperations).where(and(counted, gte(cosAiOperations.authorizedAt, sql`date_trunc('day', now())`))),
    db.select({ value: spend }).from(cosAiOperations).where(and(counted, gte(cosAiOperations.authorizedAt, sql`date_trunc('month', now() at time zone 'UTC') at time zone 'UTC'`))),
    db.select({ value: spend }).from(cosAiOperations).where(counted),
    db
      .select()
      .from(cosAssignments)
      .where(and(isNotNull(cosAssignments.deadline), ne(cosAssignments.status, "archived"), ne(cosAssignments.status, "done")))
      .orderBy(asc(cosAssignments.deadline))
      .limit(5),
    db.select().from(cosAuditLog).orderBy(desc(cosAuditLog.at)).limit(10),
  ]);

  const empty = projects.value === 0 && assignments.value === 0 && ads.value === 0;

  return (
    <>
      <PageHeading
        title="Overview"
        description="Your creative-strategy workspace. Everything here is saved: reading it never costs anything."
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/creative-os/guide" className={button.secondary}>
              How it works
            </Link>
            <Link href="/admin/creative-os/projects/new" className={button.primary}>
              <Add />
              New project
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
        <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))] lg:grid-cols-[repeat(6,minmax(0,1fr))]">
          <Stat label="Active projects" value={String(projects.value)} />
          <Stat label="Open assignments" value={String(assignments.value)} />
          <Stat label="Knowledge items" value={String(knowledge.value)} />
          <Stat label="Ads saved" value={String(ads.value)} />
          <Stat label="Ads analysed" value={String(analysed.value)} />
          <Stat label="API spend this month" value={usd(Number(month.value))} hint={`today ${usd(Number(today.value))} · all time ${usd(Number(lifetime.value))}`} />
        </div>

        {empty ? (
          <EmptyState>
            Start with a project for a brand or client: its products, what the client told you, and the ads you want to
            study. Then open the Ad Deconstruction Lab to break an ad down.
          </EmptyState>
        ) : null}

        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[repeat(2,minmax(0,1fr))]">
          <Panel title="Assignment deadlines">
            {deadlines.length === 0 ? (
              <p className="text-sm text-muted">No open assignments with a deadline.</p>
            ) : (
              <ul className="grid gap-2">
                {deadlines.map((item) => (
                  <li key={item.id} className="flex items-baseline justify-between gap-3 text-sm">
                    <Link href={`/admin/creative-os/assignments/${item.id}`} className="min-w-0 truncate hover:text-accent">
                      {item.title} <span className="text-faint">· {item.client}</span>
                    </Link>
                    <span className="tnum shrink-0 text-xs text-muted">{item.deadline}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Recent activity">
            {activity.length === 0 ? (
              <p className="text-sm text-muted">Nothing yet.</p>
            ) : (
              <ul className="grid gap-1.5">
                {activity.map((entry) => (
                  <li key={entry.id} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">
                      {ACTION_LABEL[entry.action] ?? entry.action}{" "}
                      <span className="text-muted">{entry.entity.replace("_", " ")}</span>
                      {entry.entityId ? <span className="text-faint"> #{entry.entityId}</span> : null}
                    </span>
                    <span className="tnum shrink-0 text-xs text-faint">{when(entry.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <Panel title="What is built so far">
          <p className="text-sm text-muted">
            Phase 1: projects and products, assignments, the knowledge base, the Ad Deconstruction Lab, research history,
            API usage and spending limits. Phase 2: product research, Voice of Customer, audience segments, awareness and
            sophistication, competitors (Find my rivals, profiles, the comparison matrix and market patterns) and the
            sources behind them. Next: the swipe file and structure adaptation, angles, hooks, the copywriting studio,
            briefs, the creative director, testing and performance.
          </p>
        </Panel>
      </div>
    </>
  );
}
