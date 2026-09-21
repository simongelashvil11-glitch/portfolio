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
that line with the homepage marquee; they now say different things, so the
banner carries its own.

---

## Two appearances

The sidebar has a light and a dark palette. Both live as CSS variables in
`globals.css`, named by the job each value does (`--rail-ink`, `--rail-line`,
`--rail-active`) rather than by colour, so the markup knows no colours at all.
Dark is the default and lives in `:root`; light is the override under
`[data-rail="light"]`.

**The default belongs in `:root`, not in the script.** `:root` is what renders
before any script runs and what the server sends. Put the default only in the
script and every visitor without a stored choice gets one appearance painted and
corrected to the other.

**The appearance script is a plain `<script>`, not `next/script`.** This matters
and is easy to get wrong: `next/script` with `strategy="beforeInteractive"` never
puts an *inline* script into the server HTML. Next injects it from the client
runtime, so it runs *after the page has painted* — which is the flash it exists
to prevent. Rendered as a plain element in the root layout it sits first inside
`<body>` and runs while the rest is still parsing. `<html>` carries
`suppressHydrationWarning` because that script writes to it before React sees it.

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

`public/portrait.png` is the cutout, still used by `/about` and the dark visual
résumé, which is the one job it is right for: a figure with no background.

The dark-backdrop original is kept beside the tool as
`tools/portrait-source-dark.png`, because a tool whose only input has been thrown
away is a tool nobody can run. It reproduces the committed cutout exactly:

```
python tools/portrait-matte.py tools/portrait-source-dark.png public/portrait.png
```

---

## Small things that will bite

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
