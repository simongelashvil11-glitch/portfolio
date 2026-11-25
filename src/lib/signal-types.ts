/*
 * The vocabulary of engagement signals, shared by the browser tracker
 * (components/engagement-signals.tsx), the route that stores them
 * (app/api/signal) and the admin page that reads them (lib/activity.ts).
 * No server-only imports here: this file ships to the browser.
 *
 * What each one stores — kinds and counts, never anything a visitor typed
 * or copied, apart from an email address they chose to leave:
 *
 *   engage        key: page-view id   value: "<max scroll>%/<visible seconds>s"
 *   device_coarse key: "snapshot"     value: "Windows|scr=xl|net=4g|tz=Asia/Tbilisi|input=mouse"
 *   copy_counter  key: "kind"         value: "email-like" | "phone-like" | "text"
 *   print         key: "page"         value: the printed path
 *   click         key: a ClickKind    value: where the link pointed (host, path or file)
 *   email_gate    key: "rate_sheet_email" value: the address left in the exit card
 *   message       key: "contact_form" value: null — the message itself is in `messages`
 */

export const SIGNAL_TYPES = [
  "engage",
  "device_coarse",
  "copy_counter",
  "print",
  "click",
  "email_gate",
  "message",
] as const;

export type SignalType = (typeof SIGNAL_TYPES)[number];

/** What a followed link was. Links between the site's own pages are page views, not clicks. */
export const CLICK_KINDS = ["email", "phone", "whatsapp", "download", "social", "outbound"] as const;

export type ClickKind = (typeof CLICK_KINDS)[number];

export const COPY_KINDS = ["email-like", "phone-like", "text"] as const;

/** One page-view id per engage signal: short, random, letters and digits. */
export const PAGE_VIEW_ID = /^[a-z0-9]{6,16}$/;

/** "<scroll>%/<seconds>s", e.g. "72%/184s". */
export const ENGAGE_VALUE = /^(\d{1,3})%\/(\d{1,5})s$/;

/** Hosts that count as a social profile rather than an ordinary outside link. */
export const SOCIAL_HOSTS = [
  "linkedin.com",
  "facebook.com",
  "fb.com",
  "instagram.com",
  "x.com",
  "twitter.com",
  "github.com",
  "behance.net",
  "dribbble.com",
  "youtube.com",
  "youtu.be",
  "tiktok.com",
  "t.me",
  "telegram.me",
  "medium.com",
  "threads.net",
];

/** True for a host or any of its subdomains in the list. */
export function hostIn(host: string, list: readonly string[]): boolean {
  const bare = host.toLowerCase().replace(/^www\./, "");
  return list.some((entry) => bare === entry || bare.endsWith(`.${entry}`));
}
