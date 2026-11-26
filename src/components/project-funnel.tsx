import type { CSSProperties } from "react";

import { Reveal } from "@/components/reveal";
import { ChartMark, Window } from "@/components/window";
import type { ProjectStat } from "@/db/schema";

import "./project-funnel.css";

/*
 * A project's results drawn as a funnel, from the widest figure (reach) down
 * to the narrowest (purchases), e.g. 72.99M impressions → 492,834 clicks →
 * … → 12,717 purchases. Built from the figures already entered for the
 * project: the first group of at least three plain counts (no currency, no
 * percentages). Projects without one show nothing.
 *
 * The steps are separate results reported by the ad platform, not one
 * audience narrowing — conversations are not a subset of clicks — so no
 * rates are drawn between them. (A column of shares of the top figure was
 * tried and taken out at the owner's request: next to 72.99M impressions,
 * every later step read as a tiny percentage.) Widths are on a log scale, or
 * everything after the first bar would be a sliver; the footnote says so and
 * every figure is printed exactly.
 */

type Step = { label: string; display: string; value: number };

const MULTIPLIER: Record<string, number> = { "": 1, K: 1e3, M: 1e6, B: 1e9 };

/** "72.99M" → 72990000, "492,834" → 492834; null for money, rates and anything else. */
function count(value: string): number | null {
  const match = /^(\d[\d,]*(?:\.\d+)?)\s*([KMB]?)$/i.exec(value.trim());
  if (!match) return null;
  const number = Number(match[1].replaceAll(",", "")) * MULTIPLIER[match[2].toUpperCase()];
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function funnelSteps(stats: ProjectStat[]): Step[] | null {
  const groups = new Map<string, ProjectStat[]>();
  for (const stat of stats.filter((item) => !item.featured)) {
    groups.set(stat.group.trim(), [...(groups.get(stat.group.trim()) ?? []), stat]);
  }
  for (const group of groups.values()) {
    const steps = group.map((stat) => ({ label: stat.label, display: stat.value, value: count(stat.value) }));
    if (steps.length >= 3 && steps.every((step) => step.value !== null)) {
      return (steps as Step[]).sort((a, b) => b.value - a.value);
    }
  }
  return null;
}

export function ProjectFunnel({ stats, note }: { stats: ProjectStat[]; note: string | null }) {
  const steps = funnelSteps(stats);
  if (!steps) return null;

  const top = steps[0];
  const logMax = Math.log10(top.value);
  const logMin = Math.log10(steps[steps.length - 1].value);
  const width = (value: number) =>
    logMax === logMin ? 100 : 16 + 84 * ((Math.log10(value) - logMin) / (logMax - logMin));
  const unit = top.label.toLowerCase();

  return (
    <Window id="project-funnel-title" title="From reach to result" icon={<ChartMark />} aside={note}>
      <Reveal>
        <ol className="grid gap-2" aria-label={`From ${unit} down to ${steps[steps.length - 1].label.toLowerCase()}`}>
          {steps.map((step, index) => (
            <li
              key={step.label}
              className="grid grid-cols-[minmax(0,1fr)] items-center gap-x-6 gap-y-1.5 md:grid-cols-[13rem_minmax(0,1fr)]"
            >
              <div className="min-w-0">
                <p className="truncate text-xs leading-4 text-muted">{step.label}</p>
                <p className="tnum text-lg font-semibold leading-6">{step.display}</p>
              </div>
              <div className="flex h-9 items-center justify-center">
                <div
                  className="funnel-bar h-full rounded-[6px]"
                  style={{ width: `${width(step.value)}%`, "--i": index } as CSSProperties}
                  aria-hidden
                />
              </div>
            </li>
          ))}
        </ol>
      </Reveal>
      <p className="mt-4 border-t border-line pt-3 text-xs text-faint">
        Each step is a separate result reported by the platform. Bar widths are on a log scale so the smaller steps
        stay visible; the figures are exact.
      </p>
    </Window>
  );
}
