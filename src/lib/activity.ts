import "server-only";

import type { Message, Signal, Visit } from "@/db/schema";

import { dayKey, duration, plural } from "./admin-time";
import { ENGAGE_VALUE, PAGE_VIEW_ID, type ClickKind } from "./signal-types";

/*
 * Turns the raw logs — page views (`visits`), engagement signals (`signals`)
 * and contact-form messages — into people: one per IP address, each with
 * their visits in order, everything they did on one timeline, what of it
 * deserves attention, and how interested they look. The admin's Signals page
 * is a view of what this returns; it does no interpretation of its own.
 *
 * Page views and signals are joined by address and time rather than by an
 * id, because page views carry no session id. A gap of more than 30 minutes
 * starts a new visit, the same rule the Visitors page uses.
 */

const VISIT_GAP_MS = 30 * 60 * 1000;

// ---------------------------------------------------------------- parsing

export type Device = {
  platform: string | null;
  screenClass: string | null;
  connection: string | null;
  timeZone: string | null;
  input: string | null;
};

/** "Windows|scr=xl|net=4g|tz=Asia/Tbilisi|input=mouse" → its fields; "?" reads as unknown. */
export function parseDevice(value: string | null): Device | null {
  if (!value) return null;
  const [platform, ...pairs] = value.split("|");
  const fields = new Map(
    pairs.map((pair) => {
      const at = pair.indexOf("=");
      return [pair.slice(0, at), pair.slice(at + 1)] as const;
    }),
  );
  const known = (raw: string | undefined) => (raw && raw !== "?" ? raw : null);
  return {
    platform: known(platform)?.replace("mobile-other", "Mobile").replace("desktop-other", "Desktop") ?? null,
    screenClass: known(fields.get("scr")),
    connection: known(fields.get("net")),
    timeZone: known(fields.get("tz")),
    input: known(fields.get("input")),
  };
}

/** "72%/184s" → { scroll: 72, seconds: 184 } */
export function parseEngage(value: string | null): { scroll: number; seconds: number } | null {
  const match = value ? ENGAGE_VALUE.exec(value) : null;
  return match ? { scroll: Math.min(100, Number(match[1])), seconds: Number(match[2]) } : null;
}

const SITE_NAMES: [string, string][] = [
  ["linkedin.com", "LinkedIn"],
  ["facebook.com", "Facebook"],
  ["fb.com", "Facebook"],
  ["instagram.com", "Instagram"],
  ["x.com", "X"],
  ["twitter.com", "X"],
  ["github.com", "GitHub"],
  ["behance.net", "Behance"],
  ["dribbble.com", "Dribbble"],
  ["youtube.com", "YouTube"],
  ["youtu.be", "YouTube"],
  ["tiktok.com", "TikTok"],
  ["t.me", "Telegram"],
  ["medium.com", "Medium"],
  ["threads.net", "Threads"],
];

/** "linkedin.com/in/someone" → "LinkedIn"; anything else → its host. */
function siteName(target: string): string {
  const host = target.split("/")[0].toLowerCase();
  return SITE_NAMES.find(([domain]) => host === domain || host.endsWith(`.${domain}`))?.[1] ?? host;
}

/** "/visual-resume.pdf" → "visual-resume.pdf" */
function fileName(target: string): string {
  return decodeURIComponent(target.split("/").filter(Boolean).pop() ?? target);
}

// ---------------------------------------------------------------- shapes

export type Identity = {
  country: string | null;
  region: string | null;
  city: string | null;
  network: string | null;
  asn: number | null;
  cloud: boolean | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  /** Window size from page views, e.g. "1440x900". */
  screen: string | null;
  lang: string | null;
} & Device;

export type EventKind = "view" | "read" | "click" | "copy" | "print" | "email" | "message";

export type ActivityEvent = {
  id: string;
  at: Date;
  kind: EventKind;
  path: string | null;
  /** Short tag: "Page", "WhatsApp", "Copied"… */
  label: string;
  /** What happened, as a sentence without a subject: "Opened WhatsApp". */
  text: string;
  /** Contact, download, print, copied contact details, an email or a message. */
  important: boolean;
  /** How the page was read: on a view once its report arrived, or on a lone read. */
  read?: { seconds: number; scroll: number };
  /** On a view: where the visitor came from, for the first page of a visit. */
  referrer?: string | null;
  campaign?: string | null;
  /** On an email event: the address left. */
  email?: string;
  /** On a message event: the message it matched, when one did. */
  message?: Pick<Message, "id" | "name" | "email"> | null;
  click?: { kind: ClickKind; target: string };
};

export type Session = {
  id: string;
  start: Date;
  end: Date;
  /** Oldest first. */
  events: ActivityEvent[];
  views: number;
  seconds: number;
  referrer: string | null;
  campaign: string | null;
};

export type Tier = "hot" | "warm" | "browsing";

export type Person = {
  /** The IP, or "none" for signals saved before addresses were recorded. */
  key: string;
  ip: string | null;
  identity: Identity;
  /** Newest first. */
  sessions: Session[];
  first: Date;
  last: Date;
  views: number;
  pages: string[];
  /** Seconds of reading across every page. */
  seconds: number;
  deepestScroll: number;
  /** Events worth attention, newest first. */
  important: ActivityEvent[];
  emails: string[];
  names: string[];
  score: number;
  tier: Tier;
  /** Why the score is what it is, strongest first, in plain words. */
  reasons: string[];
  /** Why this looks like a machine rather than a person, or null. */
  automated: string | null;
};

// ---------------------------------------------------------------- building

const IDENTITY_FIELDS = [
  "country", "region", "city", "network", "asn", "cloud", "device", "browser", "os", "screen", "lang",
] as const;

/** Field by field, the newest source that knows it wins. */
function mergeIdentity(rows: (Partial<Record<(typeof IDENTITY_FIELDS)[number], unknown>> & { createdAt: Date })[], device: Device | null): Identity {
  const newest = [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const out: Record<string, unknown> = {};
  for (const field of IDENTITY_FIELDS) {
    out[field] = newest.find((row) => row[field] !== null && row[field] !== undefined)?.[field] ?? null;
  }
  return {
    ...(out as Omit<Identity, keyof Device>),
    platform: device?.platform ?? null,
    screenClass: device?.screenClass ?? null,
    connection: device?.connection ?? null,
    timeZone: device?.timeZone ?? null,
    input: device?.input ?? null,
  };
}

/**
 * True for a reading report from the first tracker (key "scroll_seconds"),
 * before page-view ids. It counted wall-clock time from the page opening —
 * including time spent on later pages — and fired in duplicate bursts, so
 * its figures are not reading time and are left out.
 */
export function isLegacyRead(row: Signal): boolean {
  return row.signalType === "engage" && !(row.signalKey && PAGE_VIEW_ID.test(row.signalKey));
}

/**
 * Engagement reports are re-sent each time a tab is hidden, so one page view
 * can have several. The latest (longest) report per page view is the one
 * that counts.
 */
function latestReads(rows: Signal[]): Signal[] {
  const byView = new Map<string, Signal>();
  for (const row of rows) {
    if (isLegacyRead(row)) continue;
    const key = `${row.sessionId}|${row.signalKey}`;
    const held = byView.get(key);
    if (!held || (parseEngage(row.signalValue)?.seconds ?? 0) >= (parseEngage(held.signalValue)?.seconds ?? 0)) {
      byView.set(key, row);
    }
  }
  return [...byView.values()];
}

function viewEvent(visit: Visit): ActivityEvent {
  const campaign = [visit.utmSource, visit.utmMedium, visit.utmCampaign].filter(Boolean).join(" / ") || null;
  return {
    id: `v${visit.id}`,
    at: visit.createdAt,
    kind: "view",
    path: visit.path,
    label: "Page",
    text: `Opened ${visit.path}`,
    important: false,
    referrer: visit.referrer,
    campaign,
  };
}

/** One signal as a timeline event, or null for the ones that only describe the device. */
function signalEvent(row: Signal, messages: Message[], used: Set<number>): ActivityEvent | null {
  const base = { id: `s${row.id}`, at: row.createdAt, path: row.path };
  switch (row.signalType) {
    case "engage": {
      const read = parseEngage(row.signalValue);
      if (!read) return null;
      return {
        ...base,
        kind: "read",
        label: "Read",
        text: `Read ${row.path ?? "a page"} for ${duration(read.seconds)}, ${read.scroll}% of the way down`,
        important: false,
        read,
      };
    }
    case "click": {
      const kind = row.signalKey as ClickKind;
      const target = row.signalValue ?? "";
      const described: Record<ClickKind, [string, string, boolean]> = {
        email: ["Email", "Clicked your email address", true],
        phone: ["Phone", "Clicked your phone number", true],
        whatsapp: ["WhatsApp", "Opened a WhatsApp chat with you", true],
        download: ["Download", `Downloaded ${fileName(target)}`, true],
        social: [siteName(target), `Opened your ${siteName(target)}`, false],
        outbound: ["Link", `Followed a link to ${target}`, false],
      };
      const [label, text, important] = described[kind] ?? ["Link", `Followed a link to ${target}`, false];
      return { ...base, kind: "click", label, text, important, click: { kind, target } };
    }
    case "copy_counter": {
      const copied =
        row.signalValue === "email-like"
          ? "an email address"
          : row.signalValue === "phone-like"
            ? "a phone number"
            : "some text";
      return {
        ...base,
        kind: "copy",
        label: "Copied",
        text: `Copied ${copied}`,
        important: row.signalValue === "email-like" || row.signalValue === "phone-like",
      };
    }
    case "print":
      return { ...base, kind: "print", label: "Printed", text: `Printed ${row.signalValue ?? row.path ?? "a page"}`, important: true };
    case "email_gate":
      return {
        ...base,
        kind: "email",
        label: "Email left",
        text: "Left their email for your rate sheet",
        important: true,
        email: row.signalValue ?? undefined,
      };
    case "message": {
      // The contact form's own row, sent within a few minutes of the signal.
      const near = messages
        .filter((message) => !used.has(message.id))
        .map((message) => ({ message, gap: Math.abs(message.createdAt.getTime() - row.createdAt.getTime()) }))
        .filter((entry) => entry.gap < 5 * 60 * 1000)
        .sort((a, b) => a.gap - b.gap)[0]?.message;
      if (near) used.add(near.id);
      return {
        ...base,
        kind: "message",
        label: "Message",
        text: near ? `Sent you a message as ${near.name}` : "Sent you a message",
        important: true,
        message: near ? { id: near.id, name: near.name, email: near.email } : null,
      };
    }
    default:
      return null;
  }
}

/** One signal in plain words, as the timeline words it — for the CSV export. */
export function describeSignal(row: Signal): string {
  if (row.signalType === "device_coarse") {
    const device = parseDevice(row.signalValue);
    return device
      ? `Device: ${[device.platform, device.screenClass && `${device.screenClass} screen`, device.connection, device.timeZone, device.input].filter(Boolean).join(", ")}`
      : "Device snapshot";
  }
  const event = signalEvent(row, [], new Set());
  if (!event) return row.signalType;
  return event.email ? `${event.text}: ${event.email}` : event.text;
}

/** Puts each read on the page view it measured, when that view was recorded. */
function attachReads(events: ActivityEvent[]): ActivityEvent[] {
  const out: ActivityEvent[] = [];
  const lastView = new Map<string, ActivityEvent>();
  for (const event of events) {
    if (event.kind === "view" && event.path) lastView.set(event.path, event);
    if (event.kind === "read" && event.path && event.read) {
      const view = lastView.get(event.path);
      // A read is reported on leaving, so its view came before it — by at
      // least the visible time, and within a visit's reach of it.
      const earliest = event.at.getTime() - event.read.seconds * 1000 - VISIT_GAP_MS;
      if (view && view.at.getTime() >= earliest && view.at.getTime() <= event.at.getTime() + 5000) {
        if (!view.read || event.read.seconds > view.read.seconds) view.read = event.read;
        continue;
      }
    }
    out.push(event);
  }
  return out;
}

function splitSessions(events: ActivityEvent[]): Session[] {
  const groups: ActivityEvent[][] = [];
  for (const event of events) {
    const current = groups[groups.length - 1];
    const previous = current?.[current.length - 1];
    if (previous && event.at.getTime() - previous.at.getTime() <= VISIT_GAP_MS) current.push(event);
    else groups.push([event]);
  }
  return groups.map((group) => {
    const firstView = group.find((event) => event.kind === "view");
    return {
      id: group[0].id,
      start: group[0].at,
      end: group[group.length - 1].at,
      events: group,
      views: group.filter((event) => event.kind === "view").length,
      seconds: group.reduce((sum, event) => sum + (event.read?.seconds ?? 0), 0),
      referrer: firstView?.referrer ?? null,
      campaign: firstView?.campaign ?? null,
    };
  });
}

/**
 * How interested someone looks, from what they did. The weights favour what
 * leads somewhere — getting in touch, taking the résumé, coming back — over
 * time spent, which an open tab inflates.
 */
function interest(person: Omit<Person, "score" | "tier" | "reasons" | "automated">) {
  let score = 0;
  const reasons: string[] = [];
  const events = person.sessions.flatMap((session) => session.events);
  const has = (test: (event: ActivityEvent) => boolean) => events.filter(test);

  const messages = has((event) => event.kind === "message");
  if (messages.length) {
    score += 30;
    reasons.push("sent you a message");
  }
  if (person.emails.length) {
    score += 20;
    reasons.push("left their email");
  }
  const contacts = new Set(
    has((event) => event.kind === "click" && ["email", "phone", "whatsapp"].includes(event.click!.kind)).map(
      (event) => event.label,
    ),
  );
  if (contacts.size) {
    score += 12 * contacts.size;
    reasons.push(`clicked ${[...contacts].join(" and ")}`);
  }
  const downloads = has((event) => event.click?.kind === "download");
  if (downloads.length) {
    score += 10;
    reasons.push(downloads.length === 1 ? downloads[0].text.toLowerCase() : `downloaded ${downloads.length} files`);
  }
  const copiedContact = has((event) => event.kind === "copy" && event.important);
  if (copiedContact.length) {
    score += 8;
    reasons.push(copiedContact[0].text.toLowerCase());
  }
  if (has((event) => event.kind === "print").length) {
    score += 6;
    reasons.push("printed a page");
  }
  if (person.sessions.length > 1) {
    score += Math.min(16, (person.sessions.length - 1) * 4);
    reasons.push(`came back ${plural(person.sessions.length - 1, "time")}`);
  }
  if (person.seconds >= 20) {
    score += Math.min(20, Math.floor(person.seconds / 20));
    reasons.push(`read for ${duration(person.seconds)}`);
  }
  const finished = new Set(
    events.filter((event) => event.read && event.read.scroll >= 90 && event.read.seconds >= 10).map((e) => e.path),
  );
  if (finished.size) {
    score += Math.min(8, finished.size * 2);
    reasons.push(`read ${finished.size === 1 ? "a page" : `${finished.size} pages`} to the end`);
  }
  const social = new Set(has((event) => event.click?.kind === "social").map((event) => event.label));
  if (social.size) {
    score += 3 * social.size;
    reasons.push(`opened your ${[...social].join(" and ")}`);
  }
  if (person.pages.length > 1) {
    score += Math.min(10, person.pages.length);
    reasons.push(`looked at ${person.pages.length} pages`);
  }

  const tier: Tier = score >= 25 ? "hot" : score >= 10 ? "warm" : "browsing";
  return { score, tier, reasons };
}

/** A reason to think the address is a server, script or preview bot rather than someone reading. */
function automation(person: Omit<Person, "score" | "tier" | "reasons" | "automated">): string | null {
  const events = person.sessions.flatMap((session) => session.events);
  // Previews and crawlers fetch a page and leave; moving through several
  // pages (someone on a VPN such as Cloudflare WARP) is a reader's habit.
  const humanly =
    (person.views >= 3 && person.pages.length >= 2) ||
    events.some(
      (event) =>
        (event.read && event.read.seconds >= 5 && event.read.scroll > 0) ||
        ["click", "copy", "print", "email", "message"].includes(event.kind),
    );
  if (humanly) return null;
  const tz = person.identity.timeZone;
  if (tz && /^(UTC|Etc\/)/.test(tz)) return "Its clock is set to UTC, as servers' are, and it did nothing a reader does";
  if (person.identity.cloud) return "It came from a hosting network and did nothing a reader does";
  return null;
}

export function buildPeople({
  visits,
  signals,
  messages,
}: {
  visits: Visit[];
  signals: Signal[];
  messages: Message[];
}): Person[] {
  const reads = latestReads(signals.filter((row) => row.signalType === "engage"));
  const others = signals.filter((row) => row.signalType !== "engage");
  const usedMessages = new Set<number>();

  type Bucket = { ip: string | null; events: ActivityEvent[]; rows: (Visit | Signal)[]; device: Signal | null };
  const buckets = new Map<string, Bucket>();
  const bucket = (ip: string | null) => {
    const key = ip ?? "none";
    let found = buckets.get(key);
    if (!found) {
      found = { ip, events: [], rows: [], device: null };
      buckets.set(key, found);
    }
    return found;
  };

  for (const visit of visits) {
    const target = bucket(visit.ip);
    target.events.push(viewEvent(visit));
    target.rows.push(visit);
  }
  const chronological = [...reads, ...others].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  for (const row of chronological) {
    const target = bucket(row.ip);
    target.rows.push(row);
    if (row.signalType === "device_coarse") {
      if (!target.device || row.createdAt > target.device.createdAt) target.device = row;
      continue;
    }
    const event = signalEvent(row, messages, usedMessages);
    if (event) target.events.push(event);
  }

  const people: Person[] = [];
  for (const [key, { ip, events, rows, device }] of buckets) {
    const ordered = attachReads(events.sort((a, b) => a.at.getTime() - b.at.getTime()));
    if (ordered.length === 0) continue; // only a device snapshot: nothing to tell
    const sessions = splitSessions(ordered).reverse();
    const all = sessions.flatMap((session) => session.events);
    const base = {
      key,
      ip,
      identity: mergeIdentity(rows, parseDevice(device?.signalValue ?? null)),
      sessions,
      first: ordered[0].at,
      last: ordered[ordered.length - 1].at,
      views: all.filter((event) => event.kind === "view").length,
      pages: [...new Set(all.map((event) => event.path).filter((path): path is string => !!path))],
      seconds: all.reduce((sum, event) => sum + (event.read?.seconds ?? 0), 0),
      deepestScroll: Math.max(0, ...all.map((event) => event.read?.scroll ?? 0)),
      important: all.filter((event) => event.important).reverse(),
      emails: [...new Set(all.map((event) => event.email ?? event.message?.email).filter((e): e is string => !!e))],
      names: [...new Set(all.map((event) => event.message?.name).filter((n): n is string => !!n))],
    };
    // The no-address bucket mixes many visitors, so it gets no score of its own.
    people.push(
      ip
        ? { ...base, ...interest(base), automated: automation(base) }
        : { ...base, score: 0, tier: "browsing", reasons: [], automated: null },
    );
  }

  // Newest activity first; signals with no address at all go last.
  return people.sort((a, b) =>
    !a.ip !== !b.ip ? (a.ip ? -1 : 1) : b.last.getTime() - a.last.getTime(),
  );
}

// ---------------------------------------------------------------- summaries

export type PageStat = {
  path: string;
  views: number;
  people: number;
  reads: number;
  medianSeconds: number;
  averageScroll: number;
  /** Reads that reached 90% of the page or more. */
  finished: number;
  actions: number;
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function pageStats(people: Person[]): PageStat[] {
  const stats = new Map<string, { views: number; people: Set<string>; reads: { seconds: number; scroll: number }[]; actions: number }>();
  for (const person of people) {
    for (const event of person.sessions.flatMap((session) => session.events)) {
      if (!event.path) continue;
      const entry = stats.get(event.path) ?? { views: 0, people: new Set(), reads: [], actions: 0 };
      if (event.kind === "view") entry.views += 1;
      if (event.read) entry.reads.push(event.read);
      if (event.important) entry.actions += 1;
      entry.people.add(person.key);
      stats.set(event.path, entry);
    }
  }
  return [...stats]
    .map(([path, entry]) => ({
      path,
      views: entry.views,
      people: entry.people.size,
      reads: entry.reads.length,
      medianSeconds: median(entry.reads.map((read) => read.seconds)),
      averageScroll: entry.reads.length
        ? Math.round(entry.reads.reduce((sum, read) => sum + read.scroll, 0) / entry.reads.length)
        : 0,
      finished: entry.reads.filter((read) => read.scroll >= 90).length,
      actions: entry.actions,
    }))
    .sort((a, b) => b.people - a.people || b.views - a.views || b.reads - a.reads);
}

export function totals(people: Person[]) {
  const events = people.flatMap((person) => person.sessions.flatMap((session) => session.events));
  const reads = events.filter((event) => event.read).map((event) => event.read!);
  return {
    people: people.length,
    visits: people.reduce((sum, person) => sum + person.sessions.length, 0),
    returning: people.filter((person) => person.sessions.length > 1).length,
    views: events.filter((event) => event.kind === "view").length,
    reads: reads.length,
    medianRead: median(reads.map((read) => read.seconds)),
    averageScroll: reads.length ? Math.round(reads.reduce((sum, read) => sum + read.scroll, 0) / reads.length) : 0,
    actions: events.filter((event) => event.important).length,
    leads: people.filter((person) => person.emails.length > 0).length,
    hot: people.filter((person) => person.tier === "hot").length,
  };
}

/** People active on each Tbilisi day, for the days given (oldest first). */
export function dailyPeople(people: Person[], days: string[]): { day: string; people: number }[] {
  const byDay = new Map<string, Set<string>>(days.map((day) => [day, new Set()]));
  for (const person of people) {
    for (const event of person.sessions.flatMap((session) => session.events)) {
      byDay.get(dayKey(event.at))?.add(person.key);
    }
  }
  return days.map((day) => ({ day, people: byDay.get(day)!.size }));
}

/** Followed links, grouped by where they went, most-followed first. */
export function topClicks(people: Person[]) {
  const counts = new Map<string, { label: string; kind: ClickKind; clicks: number; people: Set<string> }>();
  for (const person of people) {
    for (const event of person.sessions.flatMap((session) => session.events)) {
      if (!event.click) continue;
      const label =
        event.click.kind === "download"
          ? fileName(event.click.target)
          : event.click.kind === "outbound"
            ? event.click.target
            : event.label;
      const key = `${event.click.kind}|${label}`;
      const entry = counts.get(key) ?? { label, kind: event.click.kind, clicks: 0, people: new Set() };
      entry.clicks += 1;
      entry.people.add(person.key);
      counts.set(key, entry);
    }
  }
  return [...counts.values()]
    .map((entry) => ({ ...entry, people: entry.people.size }))
    .sort((a, b) => b.people - a.people || b.clicks - a.clicks);
}

/** How many people share each value of a field, most common first. */
export function tally(people: Person[], pick: (person: Person) => string | null) {
  const counts = new Map<string, number>();
  for (const person of people) {
    const value = pick(person);
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count);
}
