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
 * audience narrowing — conversations are not a subset of clicks — so each
 * step is given as a share of the top one ("0.68% of impressions"), which is
 * true whatever their relation, never as a step-to-step conversion rate.
 * Widths are on a log scale, or everything after the first bar would be a
 * sliver; the footnote says so and every figure is printed exactly.
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

/** 0.68 → "0.68%", 0.0174 → "0.017%", 22.6 → "22.6%" */
function percent(share: number): string {
  if (share >= 10) return `${share.toFixed(0)}%`;
  if (share >= 1) return `${share.toFixed(1)}%`;
  return `${Number(share.toPrecision(2))}%`;
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
          {steps.map((step, index) => {
            const share = (step.value / top.value) * 100;
            return (
              <li
                key={step.label}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 md:grid-cols-[13rem_minmax(0,1fr)_9.5rem]"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs leading-4 text-muted">{step.label}</p>
                  <p className="tnum text-lg font-semibold leading-6">{step.display}</p>
                </div>
                <div className="order-last col-span-2 flex h-9 items-center justify-center md:order-none md:col-span-1">
                  <div
                    className="funnel-bar h-full rounded-[6px]"
                    style={{ width: `${width(step.value)}%`, "--i": index } as CSSProperties}
                    aria-hidden
                  />
                </div>
                <p className="tnum text-right text-xs leading-4 text-muted">
                  {index === 0 ? (
                    "Everyone reached"
                  ) : (
                    <>
                      <span className="font-semibold text-foreground">{percent(share)}</span> of {unit}
                      {share < 1 ? (
                        <span className="block text-faint">1 in {Math.round(top.value / step.value).toLocaleString("en-US")}</span>
                      ) : null}
                    </>
                  )}
                </p>
              </li>
            );
          })}
        </ol>
      </Reveal>
      <p className="mt-4 border-t border-line pt-3 text-xs text-faint">
        Each step is a separate result reported by the platform, shown as a share of {unit}. Bar widths are on a
        log scale so the smaller steps stay visible; the figures are exact.
      </p>
    </Window>
  );
}
