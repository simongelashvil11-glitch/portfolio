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
