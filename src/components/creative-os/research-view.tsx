import Link from "next/link";
import type { ReactNode } from "react";

import type { CosResearchRun, StoredFinding } from "@/db/creative-os";
import { when } from "@/lib/admin-time";
import { count, usd } from "@/lib/creative-os/format";
import { EVIDENCE_STYLE, type EvidenceType } from "@/lib/creative-os/research-labels";
import { cn } from "@/lib/utils";

/*
 * How research results are shown: every finding with its evidence type, and
 * every source with whether the research actually saw it. A source the
 * call never returned is flagged, never shown as if it were checked.
 */

const plural = (value: number, one: string, many: string) => `${count(value)} ${value === 1 ? one : many}`;

export function EvidenceBadge({ type }: { type: string }) {
  const style = EVIDENCE_STYLE[type as EvidenceType] ?? EVIDENCE_STYLE.unknown;
  return (
    <span
      title={style.hint}
      className={cn("inline-block w-fit whitespace-nowrap rounded-[4px] border px-1.5 py-px text-[11px] font-semibold leading-4", style.className)}
    >
      {style.label}
    </span>
  );
}

function domain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.slice(0, 40);
  }
}

export function SourceLinks({ sources }: { sources: { url: string; seen: boolean }[] }) {
  if (sources.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap gap-x-2 gap-y-0.5 text-xs">
      {sources.map((source) => (
        <a
          key={source.url}
          href={source.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          title={source.seen ? source.url : `${source.url} — this address was not returned by the research; check it before relying on it.`}
          className={source.seen ? "text-accent hover:underline" : "text-danger underline decoration-dotted"}
        >
          {domain(source.url)}
          {source.seen ? "" : " (unverified)"}
        </a>
      ))}
    </span>
  );
}

export function FindingList({ findings, empty = "Nothing found." }: { findings: StoredFinding[] | undefined; empty?: string }) {
  if (!findings || findings.length === 0) return <p className="text-sm text-faint">{empty}</p>;
  return (
    <ul className="grid gap-2">
      {findings.map((finding, index) => (
        <li key={index} className="grid gap-1 text-sm leading-5">
          <span>{finding.text}</span>
          <span className="flex flex-wrap items-center gap-2">
            <EvidenceBadge type={finding.evidenceType} />
            <SourceLinks sources={finding.sources} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** A titled block of findings, as a card. */
export function FindingSection({ title, findings }: { title: string; findings: StoredFinding[] | undefined }) {
  return (
    <section className="card grid content-start gap-3 p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <FindingList findings={findings} />
    </section>
  );
}

export function Limitations({ items, title = "Limitations" }: { items: string[] | undefined; title?: string }) {
  if (!items || items.length === 0) return null;
  return (
    <section className="rounded-[8px] border border-[#f9d5a7] bg-[#fff9f2] p-4">
      <h3 className="mb-1.5 text-sm font-semibold">{title}</h3>
      <ul className="grid list-disc gap-1 pl-5 text-sm text-muted">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

/** When a result was made, with what, for how much, and links to earlier runs. */
export function RunMeta({
  createdAt,
  model,
  cost,
  runs,
  currentId,
  hrefFor,
  children,
}: {
  createdAt: Date;
  model: string;
  cost: number | null | undefined;
  runs?: { id: number }[];
  currentId?: number;
  hrefFor?: (id: number) => string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-faint">
      <span>
        {when(createdAt)} · {model} · cost {usd(cost ?? null)}
      </span>
      {runs && runs.length > 1 && hrefFor ? (
        <span className="flex flex-wrap gap-2">
          Earlier runs:
          {runs.map((run, index) => (
            <Link
              key={run.id}
              href={hrefFor(run.id)}
              aria-current={run.id === currentId ? "page" : undefined}
              className={run.id === currentId ? "font-semibold text-foreground" : "text-accent hover:underline"}
            >
              {runs.length - index}
            </Link>
          ))}
        </span>
      ) : null}
      {children}
    </div>
  );
}

/** What a run reported about its own searching: queries, pages read, failures, limitations. */
export function RunNotes({ run }: { run: CosResearchRun | null | undefined }) {
  if (!run) return null;
  const counts = run.sourceCounts;
  return (
    <details className="rounded-[8px] border border-line px-4 py-3 text-sm">
      <summary className="cursor-pointer select-none font-semibold">
        How this was researched
        {counts ? (
          <span className="ml-2 font-normal text-muted">
            {plural(counts.read, "page read", "pages read")} · {plural(counts.searched, "search result", "search results")} ·{" "}
            {count(counts.failed)} could not be read
          </span>
        ) : null}
      </summary>
      <div className="mt-3 grid gap-3">
        {run.summary ? <p className="text-muted">{run.summary}</p> : null}
        {run.queries.length ? (
          <div>
            <p className="text-xs font-semibold text-faint">Searches</p>
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {run.queries.map((query, index) => (
                <li key={index} className="rounded-[4px] bg-surface px-2 py-0.5 text-xs">
                  {query}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {run.limitations.length ? (
          <div>
            <p className="text-xs font-semibold text-faint">Limitations it reported</p>
            <ul className="mt-1 grid list-disc gap-0.5 pl-5 text-muted">
              {run.limitations.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </details>
  );
}

export function TagList({ items }: { items: string[] }) {
  if (items.length === 0) return <span className="text-faint">—</span>;
  return (
    <ul className="grid list-disc gap-0.5 pl-4">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}
