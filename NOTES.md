# Notes

Things that are not obvious from reading the code, and a few that cost real time
to find out. `README.md` covers setup, scripts and deployment; this covers why
the site is built the way it is.

---

## Everything is a row

No public copy is hard-coded. Pages read from Postgres and are edited at
`/admin`. If you are about to type a sentence into a component, it probably
belongs in a table instead.

`getProfile` is wrapped in React's `cache`, so the shell, the page and the
document title share one query per request rather than three.

The one deliberate exception is the LinkedIn banner's eyebrow line, in
`src/components/linkedin-cover.tsx`. It used to read `profile.ticker` and share
that line with the homepage topic tags; they now say different things, so the
banner carries its own.

---

## Fluent 2, light

The site follows Microsoft's Fluent 2 web kit in its light theme. Every colour,
corner, shadow and type size in `globals.css` is a Fluent token, copied from
`@fluentui/tokens` with the token name beside it — not eyeballed — so check
there before nudging a value. The existing names (`text-muted`, `border-line`)
were kept and now point at Fluent's greys, so pages did not need rewriting to
change palette.

- **No Fluent runtime.** `@fluentui/react-components` is not installed. Buttons,
  fields, cards and tags are small CSS classes (`.btn`, `.field`, `.card`,
  `.tag`) in `globals.css`, and the icons in `components/fluent-icons.tsx` are
  generated from `@fluentui/svg-icons` (MIT) — only the ones in use, as plain SVG.
- **Selected nav items** use the filled icon, a semibold label and the brand
  indicator bar, as Fluent's NavItem does.
- **One appearance.** There is no light/dark switch and nothing runs before
  paint.
- **Segoe UI** is Fluent's face and is used from the visitor's system; it is not
  served, since its licence does not allow that. Other platforms fall back to
  their own UI face.

---
## Navigation and scrolling

Three things interact here, and all three are needed.

1. **In-page jumps bypass the router.** The router manages scroll on navigation
   too — it looks for the first page element and scrolls to that. With the anchor
   scrolling as well, the view snapped back toward where it started. Section links
   now scroll directly and cancel the navigation, updating the hash through the
   native History API (which this version of Next integrates with the router).

2. **There is no global `scroll-behavior: smooth`.** It applies to *every*
   programmatic scroll, including the router's jump to the top on a route change,
   which then animates — so following a link looked like the page sliding home
   before the destination appeared. Smooth is asked for at the one call site that
   wants it.

3. **The scroll spy stands down while a jump is travelling.** It is measured from
   scroll position rather than accumulated from IntersectionObserver events, so
   without this it keeps measuring the whole way: choosing Work from the top reads
   "not past the first section yet" and puts the highlight back on Home before
   catching up. Released on `scrollend`, with a timer behind it — `scrollend` is
   not in every browser, and a jump with nowhere left to travel never fires one.

**Scroll reveals are visible by default.** `components/reveal.tsx` renders
content plainly; once the page runs, it hides only blocks still below the
window (before the next paint) and fades them in on arrival. The served HTML
is therefore complete — link previews, crawlers, printing and a phone still
loading its scripts see every block. It used to start every block at
`opacity: 0` and depend on the script to show it, which left whole pages
blank to anything that did not run it or never scrolled.

**Page transitions** use the browser's View Transitions API through React's
`<ViewTransition>` (`components/page-transition.tsx`, motion in `globals.css`).
The site layout wraps each page in a boundary keyed by the path, so pages
crossfade; `default="none"` keeps other updates (the contact form, a video
opening) from animating the page. A project's picture morphs from its card
into the top of its page, only on the way in (the card link's
`transitionTypes`): homepage cards below the window wait hidden in their
scroll `Reveal`s, so a morph back would land on a hidden card. For the same
reason the project page's picture is not in a `Reveal`. The "Next project"
link at the end of a case study morphs the same way. Browser back/forward and the
in-page jumps above start no transition, and scroll lands exactly where it did
before. The morph only pairs when the project page is prefetched, so test it
on a production build (`next build && next start`), not the dev server.

The mobile drawer locks body scroll while open and releases it in an effect,
which runs *after* the click handler. A jump chosen inside the drawer would
scroll a page that cannot move, so the lock is released in the same tick as the
click.

---

## The document pages

`/resume`, `/visual-resume`, `/visual-resume-light`, `/linkedin-cover` and
`/linkedin-cover-light` are pages, not files. They read the same rows the site
does, so they cannot drift from it. The PDFs and PNGs in `public/` are exports.

**Export them from the live site, never from a dev server.** They read `siteUrl`
for the address they print, and that resolves to `localhost:3000` in development.
Printing locally puts "localhost:3000" on your résumé.

```bash
# from the deployed site, not localhost
chrome --headless=new --no-pdf-header-footer \
  --print-to-pdf=public/visual-resume.pdf \
  --virtual-time-budget=15000 https://www.simongelashvili.com/visual-resume
```

Or open the page and use the browser's own print dialogue — the print CSS is
already there.

Each of these pages sets `viewport.width` to a number, with `initialScale`
explicitly cleared. They are a fixed A4 width, so a phone lays them out at full
size and opens showing a corner. Declaring a width the sheet fits inside makes
the browser scale the whole thing to the screen. **Clearing `initialScale`
matters** — Next fills in `initial-scale: 1` otherwise, which pins the zoom at
1:1 and leaves the sheet needing to be scrolled anyway.

All of them are unlisted: `robots: { index: false }`, and the sitemap is an
explicit list that never included them.

---

## Why the plain résumé looks plain

`/resume` is built to survive an applicant tracking system, and every dull choice
in it is deliberate. Verified by extracting the finished PDF the way a parser
would, not by assuming.

- **One column.** Parsers commonly read straight across a page, so a two-column
  layout interleaves the columns into nonsense. This is the single biggest thing
  that breaks a parsed résumé.
- **A locally installed face, not the site's web font.** Chrome cannot embed a web
  font into a PDF as a font program and falls back to Type 3 glyph outlines, which
  carry no reliable text layer.
- **No letter-spacing on the headings.** Chrome splits a tracked word into separate
  text runs and an extractor rejoins them with a space: "EXPERIENCE" came out as
  "E XPERIENCE", which is exactly the string a parser looks for.
- **Bullets are written into the text**, not left to `list-style`. A CSS marker
  never reaches the text layer — extraction returned no bullet characters at all.

`/visual-resume` and `/visual-resume-light` are the designed counterparts and are
not ATS-safe. That is fine; they are for people.

---

## The portrait

The original photo was shot on a near-black backdrop that matched the subject's
black t-shirt. **No matte can reliably separate two things that are the same
value**, and every attempt cost something real: stair-stepped hair, specks around
the silhouette, holes in the shirt, a bite out of a forearm.

`tools/portrait-matte.py` is the tool that finally worked, and it is kept because
the reasoning is worth more than the output. It separates the two questions the
job actually asks:

- *Which side is a pixel on?* Connectivity — a flood fill from the border. The
  tolerance must be **tight**; loosen it and the fill walks through the outline
  where shirt and backdrop meet in value and eats holes out of the clothing.
- *How much of it is covered?* Distance from the backdrop value, but only within a
  few pixels of the boundary, and on the **absolute** difference — the shirt is
  darker than the backdrop and the skin lighter, and both are equally
  not-backdrop.

It then fills enclosed holes and un-composites the edge colours so no trace of the
backdrop survives in them.

**The real lesson is upstream of all that.** The light résumé now uses
`public/portrait-source.jpg`, shot on a pale ground, with no cutout at all — its
own backdrop disappears into the card. A photograph on a contrasting background
needs no matte, and a cutout is the wrong tool on a dark page anyway, where a
black shirt vanishes.

**The current portrait follows that lesson.** It was shot on white
(`tools/portrait-source-white.png`, the original as delivered) and is used
everywhere as a photograph, not a cutout: `public/portrait-2026-11.png` (what
the profile's portrait field points at — the site's cards and avatar) and
`public/portrait-2026-11.jpg` (both visual résumés) are the same crop of it,
centred on the subject at full height, with no other edits. The site's photo
cards are white so the photo's own ground disappears into them. The names are
dated on purpose; see "Replacing an image under the same name" below.

Do not run the matte tool on the white original. Its enclosed-hole fill keeps
the white seen between the arm and the body, and the edges leave a pale rim on
dark grounds — nothing about it was built for a light backdrop, and nothing on
the site needs a cutout any more.

The dark-backdrop original is kept beside the tool as
`tools/portrait-source-dark.png`, because a tool whose only input has been
thrown away is a tool nobody can run. It still reproduces the old cutout,
`public/portrait.png`, exactly. That file and `public/portrait-source.jpg` are
the previous pictures, kept but no longer shown.

```
python tools/portrait-matte.py tools/portrait-source-dark.png public/portrait.png
```

---

## The statistics window

Each project can carry a list of figures (`projects.stats`, with a title and a
source line beside it), edited as rows in the project form and shown on the
case study as a window: the shell's gradient across the top with the headline
figure, the rest as tiles on white. An empty list hides it.

- **Values are text, not numbers.** "$88,265", "72.99M" and "0.68%" are printed
  exactly as typed. Formatting from numbers would have to guess currency
  symbols, compact units and decimal places, and would get one of them wrong.
- **Groups come from the rows.** Figures sharing a group name sit together
  under it, in the order entered; there is no separate groups table to keep in
  step. A "Headline" figure leaves its group and is set large in the header.
- **Best campaigns** (`projects.campaigns`) are cards under the figures: a
  label line, the campaign name, then figures, the first set large. The cards
  share a subgrid, so the big numbers line up across a row however far each
  campaign name wraps.
- A project with figures or campaigns but no case-study text still gets its own
  page, so the homepage card links there rather than out.

---

## Motion and light

Five pieces, each in its own commit so any one can be reverted alone
(`git revert <commit>`; each was checked to revert cleanly and still build).
Their styles live beside their components, not in `globals.css`, for exactly
that reason.

- **Count-up figures** (`components/count-up.tsx` + `.css`): result figures
  count up to the exact form they were typed in. The HTML carries the final
  value; an inline script in `app/layout.tsx` adds `.js` to `<html>` before
  paint so CSS can hide the figure until it starts counting — with a 2.5s
  failsafe that shows it anyway. That script is the one thing on the site that
  runs before paint.
- **Results funnel** (`components/project-funnel.tsx` + `.css`): drawn from
  the first group of three or more plain counts. Steps are shares of the top
  figure, never step-to-step rates — the platform's results are not one
  narrowing audience. Log-scale widths, stated in the footnote.
- **Cursor light** (`components/cursor-light.tsx`, styles in `globals.css`
  under `.card-interactive`): Fluent's Reveal highlight. Its ring sits above
  the work cards' video button (z-index 20) or the picture hides it.
- **Hover previews** (`components/video.tsx` + `video-preview.css`): a
  project's `preview_url` clip, else its YouTube stills `hq1`–`hq3`.
- **Showreel** (`components/showreel.tsx`): `profile.showreel_url`, a clip on
  the site or a YouTube link; hidden while empty.

`projects.preview_url` and `profile.showreel_url` were added to the database
by hand (`alter table … add column … varchar(300)`), like `signals`. Clips
must be files on this site: the CSP's `media-src 'self'` blocks video from
anywhere else, and the admin refuses other URLs for that reason. If either
feature is reverted, revert the code first and only then drop its column.

---

## CreativeOS (`/admin/creative-os`)

A private creative-strategy workspace inside the admin. Phase 1: projects and
products, assignments, a per-project knowledge base, the Ad Deconstruction
Lab, research history, API usage and spending limits. Phase 2: research (see
below). Later phases (swipe file, angles, hooks, copy studio, briefs, testing,
performance) build on the same tables and the same paid-operation path.

**Its own database schema.** Everything is in the Postgres schema
`creative_os`, defined in `src/db/creative-os.ts`, with its own migrations in
`drizzle-creative-os/` and its own history table
(`creative_os.__migrations`). It never touches the portfolio's tables, and the
portfolio's drifted migration history never touches it. To change it:

```bash
npx drizzle-kit generate --config drizzle.creative-os.config.ts --name <change>
node --env-file=.env.local scripts/migrate-creative-os.mjs
```

drizzle-kit's own `migrate` cannot reach Neon here (it needs a WebSocket
driver the project doesn't ship); the script uses drizzle's HTTP migrator
instead. Keep migrations additive — local scripts write to the live database.

**Paid operations go through one function.** `lib/creative-os/operations.ts`
is the only code that calls the Claude API, and only from
`/admin/creative-os/api/*` routes the owner triggers from the Authorize
dialog. Opening pages, editing, searching, exporting never call it. The rules:

- No default model: the dialog makes the owner choose one every time.
- The estimate is local (text counted at 3 characters a token; worst case =
  the whole output allowance) — no API call, not even token counting, before
  authorization.
- Both limits in Settings must be set or nothing runs. Each call's worst case
  must fit the per-operation limit and, with everything else this month
  (unknown costs counted at their worst case), the monthly one. The row is
  recorded as running before the call and the month is re-checked with it
  included, so two calls started together can't both slip under.
- The browser's idempotency key is unique in the table: a resent request
  never calls Claude twice. `maxRetries: 0` — a retry is a new authorization.
- Errors the API answers with are recorded at $0 (not billed); a cancelled or
  lost call keeps its worst case counted, because it may have been billed.
- Costs are from the editable price table (seeded with Anthropic's prices of
  2026-11-26), not the invoice. The real hard cap is the spending limit on the
  Anthropic account.

**The Ad Deconstruction Lab** sends only the ad's saved words, screenshots and
notes (no web access), with a strict output schema. Every segment must quote
the ad; the server looks for each quote in the source and stores where it
was found, so only real quotes are highlighted and the rest are marked "not
found word for word". It can't hear or watch video — transcripts are pasted.

**Research (Phase 2)** — product research, Voice of Customer, audience
segments, awareness and sophistication, Find my rivals, competitor profiles
and market patterns. Each is a module in `lib/creative-os/research/` (what it
loads, what it sends, the answer's schema, how it is stored); `research/index.ts`
drives them all through one route (`/api/research`) and one cost preview
(`previewResearch`), so all get the same budget path as the Ad Lab.

- **Web research is one call with capped tools.** The basic
  `web_search_20250305` and `web_fetch_20250910` tools, `max_uses` set from the
  depth chosen (Quick 2+2, Standard 3+3, Deep 4+4 — at most 8 uses, under the
  API's 10-step loop) and each page read capped at 6,000 tokens. The answer
  comes back as the input of a strict `record_findings` tool. The "dynamic
  filtering" tool versions are avoided on purpose: they hide results inside
  code execution, and the checks below need to see them.
- **The answer is checked against what the call actually saw.** Every search
  result and page read is pulled from the response (`research/web.ts`) and
  stored in `creative_os.sources` with its access status. A cited address the
  call never returned is stored but shown "unverified"; a customer quote is
  "found" only if its words are in the text of the page it is attributed to
  (quote marks, dashes, case and spacing normalised).
- **The worst case counts the loop.** Each tool use makes Claude re-read the
  whole conversation, billed as input, so the estimate is
  `(n+1)·base + r·n(n+1)/2` with `r` = 12,000 tokens a result, plus the full
  output allowance and every search's fee. Sonnet 5.5 at Standard is about
  $0.80 worst case, $0.15 likely. PDFs are not capped by the fetch limit; the
  prompt tells Claude not to read them.
- Modules without the web (audiences, awareness, market patterns) use
  structured outputs, as the Ad Lab does, and work from research already saved.

**Ad Library capture (Phase 3 start).** Claude can't read the Meta Ad
Library (it needs a browser; Meta's API leaves out US commercial ads), so the
Chrome extension in `extension/creative-os-capture/` saves ads from the page
the owner is viewing, only on a button press. It finds cards by their visible
"Library ID" text (class names are generated), reads the rest by text, and
falls back to the card's whole text. It posts to `/api/creative-os/capture`,
outside `/admin` because it has no session cookie: it sends a connection code
made in Settings, stored only as a SHA-256 in `creative_os.settings`.
Re-saving the same Library ID in a project updates the ad without blanking
anything the new capture missed. When Meta changes the page, update
`content.js` (`window.__cosParse(el)` shows what a card would save) and
reload the extension at chrome://extensions.

**Knowledge base**: text from pastes, imported pages (the server's own fetch,
with every redirect hop checked against private addresses) and uploads
(PDF/Word/text, extracted locally with `unpdf`/`mammoth`; the file itself is
not kept), split into passages with a Postgres full-text index.

**Security**: every route checks the session itself and refuses writes whose
Origin isn't this site; uploads are size-capped and image types are checked
by their bytes. `ANTHROPIC_API_KEY` is a server-only environment variable
(set in Vercel; absent locally, so local runs can't spend).

---

## Visitor tracking

`/admin/visitors` reads the `visits` table, one row per public page view.
`components/visit-beacon.tsx` (mounted in the root layout) posts the path and
referrer to `/api/visit`; the route adds country, region, city and IP from the
headers Vercel puts on every request, so there is no third-party service.

Not recorded: anything outside production (local dev shares the live database,
so it would log the owner's own testing), a request with a valid admin session,
bots and headless browsers, and `/admin` or `/api` paths. To test the route
locally, run `next build && next start` and post to it with fake
`x-vercel-ip-*` headers — then delete the rows, since they land in the live
table.

The beacon also sends UTM tags from the URL, the window size and the browser
language. The route adds the **network** (carrier, ISP, company or cloud host,
plus its AS number) from `data/dbip-asn-lite.mmdb` — DB-IP's free "IP to ASN
Lite", CC BY 4.0, read by `lib/network.ts`. It is a file on the server, so IPs
are never sent anywhere. `cloud` marks hosting providers (AWS, Google Cloud,
Cloudflare WARP, VPN hosts…): those visits are servers or relays, not someone's
own line. To refresh the data, download the month's `dbip-asn-lite-YYYY-MM.mmdb.gz`
from db-ip.com, unzip it over the file and deploy. `next.config.ts` lists the
file in `outputFileTracingIncludes`, or Vercel would leave it out.

`/admin/visitors/export?range=…` downloads the range as CSV.

Deliberately not done, so the footer notice stays true and no consent banner is
needed: cookies or local IDs for visitors, browser fingerprinting, and sending
IPs to lookup services such as ip-api.com.

IP addresses are personal data under GDPR and Georgia's data-protection law.
The page has buttons to delete visits older than 90 days, or all of them.

### Signals

`/admin/signals` joins page views (`visits`) with engagement signals
(`signals`, sent by `components/engagement-signals.tsx`) into one timeline
per visitor. `lib/signal-types.ts` lists what each signal stores; the
interpretation — visits, reading, interest score, "likely automated" — is all
in `lib/activity.ts`, and the page only displays it.

- **Reading time** is the time the tab was on screen, one report per page
  view, keyed by a page-view id. It is re-sent each time the tab is hidden and
  the latest report wins. Reports keyed `scroll_seconds` are from the first
  tracker, which counted time on later pages too and fired in bursts; they
  are left out of every figure.
- **Joined by address and time**, not by id: page views carry no session id.
  More than 30 minutes apart is a new visit, as on the Visitors page.
- **The same skips as visits** (`isUntracked` in `lib/request-identity.ts`):
  nothing from development, bots or the signed-in owner. Test in a private
  window on the live site.
- **The contact form** sends a `message` signal on success (never the text);
  the page matches it to the `messages` row sent within five minutes, which
  puts a name to an address.

---

## Small things that will bite

- **Replacing an image under the same name serves the old one.** The image
  optimizer caches each resized copy per format, in `.next/dev/cache/images` in
  development — and browsers ask for WebP/AVIF, so a quick PNG check looks fine
  while visitors still get the old picture. Locally, delete that folder.
  In production Vercel caches the same way, so ship a changed image under a
  new file name and point the profile at it.
- **Chrome will not open a window narrower than about 500px.** Screenshots taken
  below that are a 500px layout cropped narrow, which looks exactly like a
  horizontal-overflow bug and is not one. Phone widths cannot be reproduced this
  way.
- **The `posts` table is unused but must stay in `schema.ts`.** Removing it
  generates a `DROP TABLE` migration.
- **Order matters when dropping a column**: deploy the code that stops reading it
  first, then drop it. Doing it the other way round leaves the live build querying
  a column that is gone.
- `next build` and `next dev` share `.next`, so building while the dev server runs
  will stop the dev server.
