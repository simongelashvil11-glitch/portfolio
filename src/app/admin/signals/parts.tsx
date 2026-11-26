import { WhatsAppIcon } from "@/components/brand-icons";
import {
  ArrowDownload,
  BookOpen,
  Call,
  Chat,
  ChevronRight,
  Copy,
  Eye,
  Mail,
  Open,
  Print,
  Share,
  type FluentIcon,
} from "@/components/fluent-icons";
import Link from "next/link";
import { createElement } from "react";

import { CloudTag, countryName, place } from "@/components/admin/network";
import type { ActivityEvent, Person, Session, Tier } from "@/lib/activity";
import { clock, duration, plural, when } from "@/lib/admin-time";
import type { ClickKind } from "@/lib/signal-types";
import { cn } from "@/lib/utils";

/* The pieces of the Signals page: a person's row, their timeline, and the tags in both. */

const KIND_ICONS: Record<Exclude<ActivityEvent["kind"], "click">, FluentIcon> = {
  view: Eye,
  read: BookOpen,
  copy: Copy,
  print: Print,
  email: Mail,
  message: Chat,
};

const CLICK_ICONS: Record<ClickKind, FluentIcon> = {
  email: Mail,
  phone: Call,
  whatsapp: WhatsAppIcon,
  download: ArrowDownload,
  social: Share,
  outbound: Open,
};

function EventIcon({ event }: { event: ActivityEvent }) {
  const props = { "aria-hidden": true, className: "size-3" } as const;
  return createElement(
    event.kind === "click" ? CLICK_ICONS[event.click?.kind ?? "outbound"] : KIND_ICONS[event.kind],
    props,
  );
}

/** An event's tag: its icon and a word, so the kind never rests on colour alone. */
export function EventTag({ event }: { event: ActivityEvent }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] leading-4",
        event.important ? "bg-accent-soft font-medium text-accent-hover" : "bg-surface text-muted",
      )}
    >
      <EventIcon event={event} />
      {event.label}
    </span>
  );
}

const TIER_TEXT: Record<Tier, string> = { hot: "Very interested", warm: "Interested", browsing: "Browsing" };

export function TierTag({ tier, score }: { tier: Tier; score: number }) {
  if (tier === "browsing") return null;
  return (
    <span
      title={`Interest score ${score}: contact, downloads and return visits weigh most, time on page least`}
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium leading-4",
        tier === "hot" ? "bg-accent text-white" : "bg-accent-soft text-accent-hover",
      )}
    >
      {TIER_TEXT[tier]}
    </span>
  );
}

export function AutomatedTag({ why }: { why: string }) {
  return (
    <span
      title={why}
      className="shrink-0 rounded-full border border-dashed border-line-strong px-1.5 text-[10px] uppercase leading-4 tracking-wide text-faint"
    >
      likely automated
    </span>
  );
}

/** How a page was read: time and depth, with depth as a short bar beside its figure. */
export function ReadMeter({ read }: { read: { seconds: number; scroll: number } }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted" title={`Visible for ${duration(read.seconds)}; scrolled ${read.scroll}% of the page`}>
      <span className="tnum">{duration(read.seconds)}</span>
      <span aria-hidden className="h-1 w-12 overflow-hidden rounded-full bg-line/70">
        <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.max(4, read.scroll)}%` }} />
      </span>
      <span className="tnum w-9">{read.scroll}%</span>
    </span>
  );
}

/** Where a person is and whose line they are on, in one short phrase. */
export function whoLine(person: Person): string {
  const id = person.identity;
  return [place(id) || (person.ip ? "Unknown location" : null), id.network].filter(Boolean).join(" · ");
}

export function personHref(person: Person, range: string): string {
  return `/admin/signals?range=${range}&show=all&ip=${encodeURIComponent(person.key)}`;
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-faint">{label}</dt>
      <dd className="truncate text-sm">{children}</dd>
    </div>
  );
}

/** The person's details as a grid of short facts; empty ones are left out. */
function Facts({ person }: { person: Person }) {
  const id = person.identity;
  const facts: [string, React.ReactNode][] = [];
  const add = (label: string, value: React.ReactNode | null | undefined | false) => {
    if (value) facts.push([label, value]);
  };

  add("Location", [id.city, id.region && id.region !== id.city ? id.region : null, id.country ? countryName(id.country) : null].filter(Boolean).join(", "));
  add(
    "Network",
    id.network ? (
      <span className="inline-flex items-center gap-1.5">
        {id.network}
        {id.asn ? <span className="text-faint">AS{id.asn}</span> : null}
        {id.cloud ? <CloudTag /> : null}
      </span>
    ) : null,
  );
  add("Device", [id.platform ?? id.os, id.browser, id.device].filter(Boolean).join(" · "));
  add("Window", [id.screen, id.screenClass ? `${id.screenClass} screen` : null].filter(Boolean).join(" · "));
  add("Language", id.lang);
  add("Clock", id.timeZone);
  add("Connection", [id.connection, id.input].filter(Boolean).join(" · "));
  add("First seen", when(person.first));
  add("Name", person.names.join(", "));
  add(
    "Email",
    person.emails.length ? (
      <span className="inline-flex flex-wrap gap-x-2">
        {person.emails.map((email) => (
          <a key={email} href={`mailto:${email}`} className="text-accent hover:underline">
            {email}
          </a>
        ))}
      </span>
    ) : null,
  );

  return (
    <dl className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-x-6 gap-y-2 sm:grid-cols-[repeat(3,minmax(0,1fr))] lg:grid-cols-[repeat(5,minmax(0,1fr))]">
      {facts.map(([label, value]) => (
        <Fact key={label} label={label}>
          {value}
        </Fact>
      ))}
    </dl>
  );
}

/** One line of a timeline. */
export function EventLine({ event }: { event: ActivityEvent }) {
  return (
    <li className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-start gap-2 py-1 text-sm sm:grid-cols-[2.75rem_minmax(0,1fr)_auto]">
      <span className="tnum pt-px text-xs leading-5 text-faint">{clock(event.at)}</span>
      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <EventTag event={event} />
        {event.kind === "view" ? (
          <span className="truncate font-mono text-xs leading-5">{event.path}</span>
        ) : (
          <span className={cn("leading-5", event.important && "font-medium")}>{event.text}</span>
        )}
        {event.email ? (
          <a href={`mailto:${event.email}?subject=${encodeURIComponent("Your rate sheet")}`} className="text-accent hover:underline">
            {event.email}
          </a>
        ) : null}
        {event.message ? (
          <Link href="/admin/messages" className="text-accent hover:underline">
            read it
          </Link>
        ) : null}
        {event.kind === "view" && event.referrer ? (
          <span className="text-xs text-faint">from {event.referrer}</span>
        ) : null}
        {event.kind === "view" && event.campaign ? (
          <span className="text-xs text-faint">link tagged {event.campaign}</span>
        ) : null}
      </span>
      <span className="col-start-2 flex items-center gap-3 sm:col-start-auto sm:justify-end">
        {event.read ? <ReadMeter read={event.read} /> : null}
        {event.kind !== "view" && event.kind !== "read" && event.path ? (
          <span className="font-mono text-xs text-faint">{event.path}</span>
        ) : null}
      </span>
    </li>
  );
}

function SessionBlock({ session, number }: { session: Session; number: number }) {
  const minutes = Math.round((session.end.getTime() - session.start.getTime()) / 60000);
  return (
    <li>
      <p className="text-xs font-medium">
        Visit {number}
        <span className="font-normal text-faint">
          {" · "}
          {[
            when(session.start),
            minutes >= 1 ? `${minutes} min` : null,
            session.referrer ? `came from ${session.referrer}` : session.views ? "came directly" : null,
            session.campaign ? `link tagged ${session.campaign}` : null,
            session.seconds ? `read ${duration(session.seconds)}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </p>
      <ol className="mt-1 border-l border-line pl-3">
        {session.events.map((event) => (
          <EventLine key={event.id} event={event} />
        ))}
      </ol>
    </li>
  );
}

/**
 * One person: a summary (who, how interested, what stood out) that opens
 * into their details and every visit's timeline. Plain <details>, so it
 * needs no client script — the same shape as the visitors page.
 */
export function PersonRow({ person, range, open }: { person: Person; range: string; open?: boolean }) {
  const id = person.identity;
  return (
    <details id={`p-${person.key}`} open={open} className="group border-b border-line last:border-0">
      <summary className="flex cursor-pointer list-none items-start gap-2 px-5 py-3 transition-colors hover:bg-accent-soft/40 [&::-webkit-details-marker]:hidden">
        <ChevronRight
          aria-hidden
          className="mt-0.5 size-4 shrink-0 text-faint transition-transform group-open:rotate-90"
        />
        <span className="grid min-w-0 flex-1 gap-1">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <TierTag tier={person.tier} score={person.score} />
            {person.names[0] ? <span className="text-sm font-semibold">{person.names[0]}</span> : null}
            <span className="font-mono text-xs">{person.ip ?? "Address not recorded"}</span>
            {person.ip ? <span className="text-sm">{place(id) || "Unknown location"}</span> : null}
            {id.network ? (
              <span className="flex min-w-0 items-center gap-1.5 text-sm text-muted">
                {id.network}
                {id.cloud ? <CloudTag /> : null}
              </span>
            ) : null}
            {person.automated ? <AutomatedTag why={person.automated} /> : null}
            <span className="tnum text-xs text-faint sm:ml-auto">last {when(person.last)}</span>
          </span>
          <span className="flex flex-wrap gap-x-3 text-xs text-muted">
            <span>{plural(person.sessions.length, "visit")}</span>
            <span>{plural(person.views, "page view")}</span>
            {person.seconds ? <span>read {duration(person.seconds)}</span> : null}
            {[id.platform ?? id.os, id.browser].filter(Boolean).length ? (
              <span className="text-faint">{[id.platform ?? id.os, id.browser].filter(Boolean).join(" · ")}</span>
            ) : null}
          </span>
          {person.reasons.length ? (
            <span className="text-xs text-foreground first-letter:uppercase">{person.reasons.slice(0, 4).join(" · ")}</span>
          ) : person.pages.length ? (
            <span className="truncate text-xs text-faint">
              On <span className="font-mono">{person.pages.join("  ·  ")}</span>
            </span>
          ) : null}
        </span>
      </summary>

      <div className="grid gap-5 bg-accent-soft/20 px-5 pb-5 pl-11 pt-2">
        <Facts person={person} />
        {person.automated ? <p className="text-xs text-faint">{person.automated}.</p> : null}
        <ol className="grid gap-4">
          {person.sessions.map((session, index) => (
            <SessionBlock key={session.id} session={session} number={person.sessions.length - index} />
          ))}
        </ol>
        {!open ? (
          <Link href={personHref(person, range)} className="justify-self-start text-xs text-accent hover:underline">
            Open this visitor on their own
          </Link>
        ) : null}
      </div>
    </details>
  );
}
