import type { CosAdSegment } from "@/db/creative-os";
import { AWARENESS_LABEL, ELEMENT_STYLE, type Element } from "@/lib/creative-os/elements";
import type { StoredOverview } from "@/lib/creative-os/export";

/* How a saved deconstruction is shown. Server-rendered; nothing here calls Claude. */

const style = (element: string) => ELEMENT_STYLE[element as Element] ?? ELEMENT_STYLE.other;

export function ElementTag({ element, number }: { element: string; number?: number }) {
  const { label, bg, text } = style(element);
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-[4px] px-1.5 py-0.5 text-[11px] font-semibold leading-4"
      style={{ backgroundColor: bg, color: text }}
    >
      {number !== undefined ? <span className="tnum opacity-70">{number}</span> : null}
      {label}
    </span>
  );
}

/**
 * The source text with each located segment highlighted in its element's
 * colour and numbered to match the cards below. Only quotes found word for
 * word are highlighted; overlapping ones after the first are left plain.
 */
export function HighlightedText({ text, segments, numbers }: { text: string; segments: CosAdSegment[]; numbers: Map<number, number> }) {
  const placed = segments
    .filter((segment) => segment.startChar !== null && segment.endChar !== null)
    .sort((a, b) => a.startChar! - b.startChar!);
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const segment of placed) {
    const start = segment.startChar!;
    const end = segment.endChar!;
    if (start < cursor) continue;
    if (start > cursor) parts.push(<span key={`t${cursor}`}>{text.slice(cursor, start)}</span>);
    const { bg, text: ink, label } = style(segment.element);
    parts.push(
      <mark
        key={`m${segment.id}`}
        title={label}
        className="rounded-[3px] px-0.5 [box-decoration-break:clone]"
        style={{ backgroundColor: bg, color: ink }}
      >
        <sup className="tnum mr-0.5 text-[10px] font-semibold">{numbers.get(segment.id)}</sup>
        {text.slice(start, end)}
      </mark>,
    );
    cursor = end;
  }
  if (cursor < text.length) parts.push(<span key={`t${cursor}`}>{text.slice(cursor)}</span>);
  return <p className="whitespace-pre-wrap text-[15px] leading-7">{parts}</p>;
}

export function OverviewFacts({ data }: { data: StoredOverview }) {
  const { overview } = data;
  const rows: [string, string | null][] = [
    ["Opening hook", overview.opening_hook],
    ["Hook type", overview.hook_type],
    ["Pattern interrupt", overview.pattern_interrupt],
    ["Audience (hypothesis)", overview.target_audience_hypothesis],
    ["Awareness stage", `${AWARENESS_LABEL[overview.awareness_stage]} — ${overview.awareness_reasoning}`],
    ["Market sophistication", `${overview.market_sophistication === "unclear" ? "Unclear" : `Level ${overview.market_sophistication}`} — ${overview.sophistication_reasoning}`],
    ["Offer", overview.offer],
    ["Call to action", overview.cta],
    ["Structure", overview.structure_summary],
  ];
  return (
    <dl className="grid gap-3">
      {rows
        .filter(([, value]) => value)
        .map(([label, value]) => (
          <div key={label} className="grid gap-0.5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4">
            <dt className="text-sm font-semibold">{label}</dt>
            <dd className="text-sm text-muted">{value}</dd>
          </div>
        ))}
    </dl>
  );
}

export function BulletList({ items, empty = "None noted." }: { items: string[]; empty?: string }) {
  if (items.length === 0) return <p className="text-sm text-faint">{empty}</p>;
  return (
    <ul className="grid gap-1.5 text-sm text-muted">
      {items.map((item, index) => (
        <li key={index} className="relative pl-4 before:absolute before:left-1 before:top-[0.6em] before:size-1 before:rounded-full before:bg-faint">
          {item}
        </li>
      ))}
    </ul>
  );
}

export function SegmentCard({ segment, number }: { segment: CosAdSegment; number: number }) {
  const rows: [string, string][] = [
    ["Purpose", segment.strategicPurpose],
    ["Principle", segment.psychologicalPrinciple],
    ["Works", segment.strengths],
    ["Weak", segment.weaknesses],
    ["Improve", segment.improvement],
  ];
  return (
    <li className="rounded-[8px] border border-line p-4">
      <div className="flex flex-wrap items-center gap-2">
        <ElementTag element={segment.element} number={number} />
        <span className="text-xs text-faint">from the {segment.source === "copy" ? "ad copy" : "transcript"}</span>
        {segment.startChar === null ? (
          <span className="rounded-[4px] border border-dashed border-line-strong px-1.5 text-[11px] text-muted" title="This quote could not be found word for word in the source text.">
            not found word for word
          </span>
        ) : null}
      </div>
      <blockquote className="mt-2 border-l-[3px] border-line-strong pl-3 text-sm italic">{segment.originalText}</blockquote>
      <dl className="mt-3 grid gap-1.5">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-0.5 text-sm sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:gap-3">
            <dt className="font-semibold">{label}</dt>
            <dd className="text-muted">{value}</dd>
          </div>
        ))}
      </dl>
    </li>
  );
}
