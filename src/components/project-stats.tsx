import Link from "next/link";

import { ChevronRight } from "@/components/fluent-icons";
import { ChartMark, Window } from "@/components/window";
import type { ProjectCampaign, ProjectStat } from "@/db/schema";

/**
 * A project's figures, as a window: the shell's gradient across the top
 * carrying the title, the source and the headline figure, then the rest as
 * Fluent-style tiles on white, grouped as they were entered, and last the
 * standout campaigns as cards.
 *
 * Nothing is formatted here. Each value is printed as written in the admin,
 * so "$88,265" and "72.99M" read exactly the way the source reported them.
 *
 * With `peek`, it is the homepage's preview of the same window: the project's
 * name in the title bar, the headline and the first group only, and a Read
 * more link through to the case study for the rest.
 */
export function ProjectStats({
  title,
  note,
  stats,
  campaignsTitle,
  campaigns,
  peek,
}: {
  title: string | null;
  note: string | null;
  stats: ProjectStat[];
  campaignsTitle: string | null;
  campaigns: ProjectCampaign[];
  peek?: { project: string; href: string };
}) {
  if (stats.length === 0 && campaigns.length === 0) return null;

  const headline = stats.filter((stat) => stat.featured);
  const allGroups = groupInOrder(stats.filter((stat) => !stat.featured));
  const groups = peek ? allGroups.slice(0, 1) : allGroups;
  const shownCampaigns = peek ? [] : campaigns;
  const heading = peek ? `${peek.project} · ${title?.trim() || "Results"}` : title?.trim() || "Results";

  const readMore = peek ? (
    <Link href={peek.href} className="btn btn-secondary shrink-0">
      Read more
      <ChevronRight />
    </Link>
  ) : null;

  const band =
    headline.length > 0 || readMore ? (
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 px-4 pb-6 pt-3 sm:px-6">
        <dl className="flex flex-wrap gap-x-12 gap-y-5">
          {headline.map((stat, i) => (
            <div key={i} className="relative pl-3.5">
              {/* The nav's selected-item bar, so the headline reads as the one chosen. */}
              <span className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-lavender" aria-hidden />
              <dt className="text-sm text-muted">{stat.label}</dt>
              <dd className="tnum mt-0.5 text-[40px] font-semibold leading-[48px] sm:text-[48px] sm:leading-[56px]">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
        {readMore}
      </div>
    ) : null;

  const hasBody = groups.length > 0 || shownCampaigns.length > 0;

  return (
    <Window id="project-stats-title" title={heading} icon={<ChartMark />} aside={note} band={band}>
      {/* ---------- The rest, grouped, then the campaigns ---------- */}
      {hasBody ? (
        <div className="grid gap-6">
          {groups.map((group, index) => (
            <div key={group.name || `ungrouped-${index}`}>
              {group.name ? <h3 className="pb-2 text-xs font-semibold text-faint">{group.name}</h3> : null}
              <dl className={`grid gap-2 ${columns(group.stats.length)}`}>
                {group.stats.map((stat, i, all) => (
                  <div
                    key={i}
                    className={`flex flex-col justify-between gap-1 rounded-[6px] bg-surface px-3.5 py-3 ${
                      // Phones show two columns, so an odd count would end on
                      // a lone half-width tile; the last one takes the row.
                      all.length > 1 && all.length % 2 === 1 && i === all.length - 1
                        ? "col-span-2 sm:col-span-1"
                        : ""
                    }`}
                  >
                    <dt className="text-xs leading-4 text-muted">{stat.label}</dt>
                    <dd className="tnum text-xl font-semibold leading-7 sm:text-2xl sm:leading-8">{stat.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}

          {shownCampaigns.length > 0 ? (
            <div>
              <h3 className="pb-2 text-xs font-semibold text-faint">{campaignsTitle?.trim() || "Best campaigns"}</h3>
              {/*
                Each card spans three rows of a shared grid (subgrid), so the
                big figures and the detail rows line up across the cards
                even when one campaign name wraps further than the others.
              */}
              <ul className={`grid gap-x-3 gap-y-3 ${shownCampaigns.length >= 3 ? "md:grid-cols-3" : "sm:grid-cols-2"}`}>
                {shownCampaigns.map((campaign, i) => (
                  <CampaignCard key={i} campaign={campaign} />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </Window>
  );
}

function CampaignCard({ campaign }: { campaign: ProjectCampaign }) {
  const [lead, ...rest] = campaign.figures;

  return (
    <li className="row-span-3 grid grid-rows-subgrid gap-y-3 rounded-[6px] border border-line p-4">
      <div>
        {campaign.tag ? (
          <p className="flex items-center gap-1.5 text-xs font-semibold text-faint">
            <span className="size-1.5 shrink-0 rounded-full bg-lavender" aria-hidden />
            {campaign.tag}
          </p>
        ) : null}
        <p className="mt-1 text-sm font-semibold leading-5 text-pretty">{campaign.name}</p>
      </div>

      {lead ? (
        <div className="self-end">
          <p className="text-xs leading-4 text-muted">{lead.label}</p>
          <p className="tnum text-[28px] font-semibold leading-9">{lead.value}</p>
        </div>
      ) : (
        <div />
      )}

      {rest.length > 0 ? (
        <dl className="self-start divide-y divide-line border-t border-line">
          {rest.map((figure, i) => (
            <div key={i} className="flex items-baseline justify-between gap-3 py-1.5 last:pb-0">
              <dt className="text-xs text-muted">{figure.label}</dt>
              <dd className="tnum text-sm font-semibold">{figure.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <div />
      )}
    </li>
  );
}

/** Groups in the order they first appear, each keeping its figures' order. */
function groupInOrder(stats: ProjectStat[]) {
  const groups = new Map<string, ProjectStat[]>();
  for (const stat of stats) {
    const name = stat.group.trim();
    groups.set(name, [...(groups.get(name) ?? []), stat]);
  }
  return [...groups].map(([name, items]) => ({ name, stats: items }));
}

/**
 * Columns chosen per count so a row never ends on a lone tile where it can
 * be helped: five sit in one row on a wide screen, six as two rows of three.
 */
function columns(count: number) {
  switch (count) {
    case 1:
      return "grid-cols-1 sm:grid-cols-2";
    case 2:
      return "grid-cols-2";
    case 3:
      return "grid-cols-2 sm:grid-cols-3";
    case 4:
      return "grid-cols-2 sm:grid-cols-4";
    case 5:
      return "grid-cols-2 sm:grid-cols-3 xl:grid-cols-5";
    case 6:
      return "grid-cols-2 sm:grid-cols-3";
    default:
      return "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4";
  }
}
