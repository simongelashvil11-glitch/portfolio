import Link from "next/link";
import type { ReactNode } from "react";

import { PageHeading } from "@/components/admin/ui";

export const metadata = { title: "Guide" };

/*
 * How CreativeOS works, for the owner: what to fill in, in what order, what
 * each paid step costs, how to read the results and what the errors mean.
 * Static on purpose — nothing here reads data or calls anything.
 */

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="card grid scroll-mt-6 gap-3 p-5 sm:p-6">
      <h2 id={`${id}-title`} className="text-lg font-semibold leading-6">
        {title}
      </h2>
      <div className="grid gap-3 text-sm leading-6 text-foreground [&_li]:leading-6">{children}</div>
    </section>
  );
}

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <thead className="text-xs text-faint">
          <tr className="border-b border-line">
            {head.map((cell) => (
              <th key={cell} className="px-2 py-2 font-medium">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-line align-top last:border-0">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className={cellIndex === 0 ? "px-2 py-2 font-semibold" : "px-2 py-2 text-muted"}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const CONTENTS = [
  ["basics", "How it works in one minute"],
  ["before", "Before your first run"],
  ["order", "The order to work in"],
  ["project-fields", "Filling in a project (and what to do when you don't know)"],
  ["products", "Products and the knowledge base"],
  ["dialog", "The Authorize dialog"],
  ["tools", "What each tool gives you"],
  ["writing", "Writing: angles, hooks, scripts and briefs"],
  ["reading", "Reading the results: labels and checks"],
  ["costs", "What things cost"],
  ["errors", "When something goes wrong"],
  ["extension", "Saving ads from the Meta Ad Library (Chrome extension)"],
  ["transcripts", "Video transcripts"],
  ["not-yet", "What it doesn't do yet"],
] as const;

export default function GuidePage() {
  return (
    <>
      <PageHeading
        title="Guide"
        description="How CreativeOS works, what to fill in, the order to work in, and how to read what comes back. Nothing on this page costs anything."
      />

      <div className="grid max-w-3xl gap-5">
        <nav aria-label="On this page" className="rounded-[8px] border border-line p-4 text-sm">
          <p className="mb-2 font-semibold">On this page</p>
          <ol className="grid list-decimal gap-1 pl-5 sm:grid-cols-2 sm:gap-x-6">
            {CONTENTS.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="text-accent hover:underline">
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <Section id="basics" title="How it works in one minute">
          <ul className="grid list-disc gap-1.5 pl-5">
            <li>
              <strong>A project is one brand or client.</strong> Everything else lives inside it: its products, documents,
              research, competitors and ads.
            </li>
            <li>
              <strong>Free:</strong> creating and editing anything, uploading documents, importing web pages, searching,
              bookmarking, exporting. None of it uses AI.
            </li>
            <li>
              <strong>Paid:</strong> only the blue buttons with the sparkle icon (Research product, Research customers, Find my
              rivals, Analyze ad…). Each opens a dialog that shows the cost first. Nothing is sent to Claude until you press{" "}
              <strong>Authorize</strong>.
            </li>
            <li>
              <strong>Each paid run is one request to Claude.</strong> Some runs may search the web and read a few pages, with
              hard caps you choose. The result is saved, and opening it again is free.
            </li>
            <li>
              <strong>Research builds on research.</strong> Product research and Voice of Customer gather the facts. Audiences,
              Awareness and Market patterns read what is already saved and think about it.
            </li>
          </ul>
        </Section>

        <Section id="before" title="Before your first run">
          <ol className="grid list-decimal gap-1.5 pl-5">
            <li>
              In <Link href="/admin/creative-os/settings" className="text-accent hover:underline">Settings</Link>, set a monthly
              limit and a per-run limit. Nothing paid can run until both are set. $20 a month and $1 per run suit testing.
            </li>
            <li>
              In Settings, switch on the models you want to choose from. Sonnet 5.5 is the sensible default: good and
              affordable. Haiku is cheap for quick tests; Opus and Fable cost 2× and 4× as much.
            </li>
            <li>
              On your Anthropic account (platform.claude.com → Settings → Limits), set a spending limit too. That is the only
              hard cap; CreativeOS&apos;s limits work from its own estimates.
            </li>
          </ol>
        </Section>

        <Section id="order" title="The order to work in">
          <p>Each step feeds the next. A first full pass on Sonnet 5.5 costs roughly $1–2.</p>
          <ol className="grid list-decimal gap-2 pl-5">
            <li>
              <strong>Projects → New project.</strong> Name, brand, website, industry and target countries are enough to start.
              See below for what to do with fields you can&apos;t fill.
            </li>
            <li>
              <strong>Products tab.</strong> Add at least one product with its page URL.
            </li>
            <li>
              <strong>Knowledge tab (optional).</strong> Upload or paste anything the client gave you: brief, product documents,
              reviews, testimonials.
            </li>
            <li>
              <strong>Products → Research product.</strong> Quick depth is enough. Gives you features, benefits, mechanism,
              proof and a feature-to-benefit matrix.
            </li>
            <li>
              <strong>Voice of Customer → Research customers.</strong> Standard depth. Real customer language, with sources.
              Bookmark the lines you&apos;d build ads on. Run it again with a different focus (a product, a competitor) to
              widen the bank.
            </li>
            <li>
              <strong>Competitors → Find my rivals.</strong> Review the suggestions; press Track on the real ones and Dismiss the
              rest.
            </li>
            <li>
              <strong>Open two or three tracked competitors → Research competitor.</strong>
            </li>
            <li>
              <strong>Competitors → Comparison matrix → Find market patterns.</strong> Needs at least two researched
              competitors.
            </li>
            <li>
              <strong>Audiences → Generate segments.</strong> Then star the segment you&apos;re writing for.
            </li>
            <li>
              <strong>Awareness → Analyse awareness.</strong> Best last, because it uses everything above.
            </li>
            <li>
              <strong>Ad Lab</strong>, any time: paste a winning ad&apos;s script or copy and break it down.
            </li>
          </ol>
          <p className="font-semibold">Then write (the Create row of tabs)</p>
          <ol className="grid list-decimal gap-2 pl-5" start={12}>
            <li>
              <strong>Angles → Generate angles.</strong> Approve the two or three you believe in; reject the rest.
            </li>
            <li>
              <strong>Open an approved angle → Generate hooks.</strong> Bookmark the best ones.
            </li>
            <li>
              <strong>Write a script with it</strong> (on the angle or a hook) → fill the short brief → <strong>Write it</strong>.
              Edit freely, then use <strong>Creative director review</strong> before you call it done.
            </li>
            <li>
              <strong>Make a brief</strong> on the finished script, and export it as a Word document for the creator or editor.
            </li>
          </ol>
          <p>
            More on these in <a href="#writing" className="text-accent hover:underline">Writing: angles, hooks, scripts and briefs</a>.
          </p>
        </Section>

        <Section id="project-fields" title="Filling in a project (and what to do when you don't know)">
          <p>
            Only the name is required. On the form, each field has a tag: <strong>Used by research</strong> (sent to Claude
            with research and writing runs, so it shapes results), <strong>Used by writing tools</strong> (sent with angles, hooks,
            scripts, reviews and briefs) or <strong>Private</strong> (never sent). An empty field is never a problem: research simply
            works without it. Don&apos;t guess to fill a gap; a wrong guess misleads the research more than an empty field does.
          </p>
          <Table
            head={["Field", "What it does", "If you don't know it yet"]}
            rows={[
              ["Project name", "A label for you; also tells Claude what the project is.", "Brand + campaign, e.g. “Acme — US launch”."],
              ["Brand name", "Searches use it to find the brand and its reviews.", "Leave empty only if there is no brand name yet."],
              ["Company website", "Product research reads it first; the brand's pages are filed as its own.", "Leave empty."],
              [
                "Industry",
                "The most important field for Find my rivals and Voice of Customer: it tells the search what market to look in.",
                "Describe the category yourself, specifically: “at-home espresso grinders”, not “coffee”.",
              ],
              [
                "Target countries",
                "Research focuses on these markets; the first one sets the Ad Library country on competitor links.",
                "For your US employer: “United States”.",
              ],
              ["Target languages", "Context. Results come back in English.", "“English”, or leave empty."],
              ["Advertising platforms", "Context for the research.", "“Meta”, or leave empty."],
              ["Target audience", "What the client says about their buyers.", "Leave empty. Voice of Customer and Audiences find it from real customers."],
              ["Marketing objectives", "What the ads are for; context for the research.", "Leave empty, or one line such as “first orders from cold traffic”."],
              ["Brand voice", "The writing tools match it. Not sent to research.", "Leave empty until the client shares guidelines; the writing stays plain and natural without it."],
              ["Client instructions", "The writing tools follow it. Not sent to research.", "Leave empty."],
              ["Approved claims", "Claims the client signed off; research treats them as given.", "Leave empty."],
              ["Prohibited claims", "What you must never say; research is told.", "Leave empty, or add the obvious risky words for the category (e.g. “cure”, “guaranteed”)."],
              [
                "Known competitors",
                "Find my rivals looks for others, not these. It doesn't add them to the Competitors tab.",
                "Leave empty; Find my rivals is how you'll find them. If you do know some, add them on the Competitors tab to research them.",
              ],
              ["Internal notes", "Private. Never sent.", "Anything."],
            ]}
          />
        </Section>

        <Section id="products" title="Products and the knowledge base">
          <ul className="grid list-disc gap-1.5 pl-5">
            <li>
              <strong>Product URL</strong> is the most useful thing you can give. Product research reads that page first.
            </li>
            <li>
              <strong>Description</strong>: a few sentences in your words. Needed only if you run product research with the web
              off.
            </li>
            <li>
              <strong>Price and offer</strong>: fill in if you know them; leave empty otherwise. Research may find them.
            </li>
            <li>
              <strong>The knowledge base is optional.</strong> Use it for what the client gives you. The <strong>type</strong>{" "}
              you pick decides which research reads it: product documents, specs, landing pages, brief, approved messaging and
              testimonials go to product research; customer research, testimonials and the brief go to Voice of Customer and
              Audiences; brand guidelines, tone of voice, approved messaging, compliance, past scripts and winning ad examples go
              to the writing tools.
            </li>
            <li>
              Importing a web page or uploading a file is done by this site, not by Claude: free. Some pages block it; paste
              the text instead.
            </li>
          </ul>
        </Section>

        <Section id="dialog" title="The Authorize dialog">
          <p>Every paid button opens it. Choose, press Show the cost, read it, then Authorize or go Back.</p>
          <Table
            head={["Choice", "What it means"]}
            rows={[
              ["Focus", "Voice of Customer only: the whole category, one product, or one competitor's customers."],
              [
                "Web research",
                "How much it may search and read: Quick (2 searches, 2 pages), Standard (3 + 3), Deep (4 + 4). Off (product research only) uses just your material. The caps are enforced by Anthropic, not just requested.",
              ],
              ["Knowledge base", "Include the relevant items (each is listed by name before you authorize) or leave them out."],
              ["Model", "No default: you pick each time. Only models switched on in Settings appear."],
              ["Effort", "How hard the model thinks. Medium is right for most runs; High costs more and is slower."],
              [
                "Likely cost / At most",
                "The likely figure is what a typical run costs. “At most” is the worst case if every search is used and every result is long; it is what the limits are checked against.",
              ],
              ["What will be sent", "Exactly which of your material goes with the request."],
            ]}
          />
          <p>
            While it runs you see a timer and a Cancel button. Cancel stops waiting, but a request already sent may still be
            billed; Research history shows what was recorded. Research with the web usually takes 1–3 minutes.
          </p>
        </Section>

        <Section id="tools" title="What each tool gives you">
          <Table
            head={["Tool", "Where", "What you get", "Uses the web"]}
            rows={[
              [
                "Product research",
                "Products → a product",
                "Summary, 16 sections (features, benefits, USPs, mechanism, reasons to believe, objections, offers, pricing…) and a feature-to-benefit matrix with an ad message per feature.",
                "Optional",
              ],
              [
                "Voice of Customer",
                "Voice of Customer tab",
                "Customer statements sorted into 16 categories (pain points, desires, objections, failed solutions…), each with its source, what it means for ads, and a quote check. Searchable; bookmark the best.",
                "Yes",
              ],
              ["Find my rivals", "Competitors tab", "Suggested competitors with why they compete and where they overlap. You Track or Dismiss each.", "Yes"],
              [
                "Competitor research",
                "Competitors → a competitor",
                "A profile: product range, audience, value propositions, pricing, offers, ad messages, angles, formats, strengths, weaknesses, where you could win. Plus a Meta Ad Library link to see their live ads yourself.",
                "Yes",
              ],
              [
                "Market patterns",
                "Competitors → Comparison matrix",
                "Shared messages, overused angles, market gaps and differentiation opportunities across your tracked competitors.",
                "No",
              ],
              [
                "Audiences",
                "Audiences tab",
                "Segments side by side: situation, problems, desired change, motivations, objections, beliefs, past solutions, triggers, messaging and formats, with the customer quotes behind each. Editable; star your focus.",
                "No",
              ],
              [
                "Awareness",
                "Awareness tab",
                "Where most of the market is (5 stages) and how sophisticated it is (levels 1–5), and for each stage the message, hooks, structure, proof and CTA. Press Adjust to change anything.",
                "No",
              ],
              ["Ad Lab", "Ad Lab tab", "An ad broken into hook, problem, agitation, mechanism, proof, offer, CTA… with a colour-coded transcript.", "No"],
            ]}
          />
          <p>
            Every run is kept. Earlier runs are linked by number beside the date, and running again never deletes the old
            result, except Audiences, which replaces the segments you haven&apos;t edited or starred unless you choose Keep all.
          </p>
        </Section>

        <Section id="writing" title="Writing: angles, hooks, scripts and briefs">
          <p>
            The <strong>Create</strong> row of tabs turns the research into ads. Everything is written from what the project
            already holds: product facts, the segment, the angle, customers&apos; own words (bookmarked ones first), the brand
            voice, client instructions, approved and prohibited claims, the brand documents in the knowledge base, and the
            angles competitors have worn out. It never invents results, testimonials, prices or deadlines.
          </p>
          <Table
            head={["Tool", "What you do", "Good to know"]}
            rows={[
              [
                "Angles",
                "Generate angles, then Approve, Prioritise, Reject or Archive each. Open one to edit any field.",
                "Each cites the customer insights it rests on. Bookmark strong insights in Voice of Customer first: they lead.",
              ],
              [
                "Hooks",
                "Generate hooks for an angle (on the angle's page or the Hooks tab), in English, Georgian or Russian. Bookmark, approve, reject, edit, tag, filter.",
                "Genuinely different openings across 12 types, each with its trigger and the first visual.",
              ],
              [
                "Scripts and copy",
                "New script or copy → a short brief (type, product, segment, angle, hook, framework, length, language, offer, CTA, your instructions). Creating it is free. Then Write it.",
                "13 types: UGC, direct-response, TikTok, founder, demo and VSL scripts; Meta primary text and headlines; static, retargeting, advertorial, landing page, email.",
              ],
              [
                "The editor",
                "Type anywhere. Each section has the words and, for video, what is on screen. Move, add or remove sections.",
                "Saves itself a moment after you stop typing (no AI, no cost). Word count and spoken seconds update as you type. Copy all puts it on your clipboard.",
              ],
              [
                "Versions",
                "Every AI draft, variation and rewrite is a version; Save current text as a version keeps your own. Compare shows any version beside the current text; Use this version brings it back.",
                "Nothing is ever overwritten: restoring first keeps your unsaved text as a version.",
              ],
              [
                "Rewrite a section",
                "Pick one section and say what to change (“shorter, and name the problem in the customer's words”).",
                "Only that section changes, so it still fits the rest. Costs about a cent.",
              ],
              [
                "Creative director review",
                "A strict review of the current text: 19 criteria scored 1–5 with evidence and a fix each, exact phrases that sound generic or robotic, and compliance flags.",
                "It doesn't rewrite anything. Use its notes with Rewrite a section, or edit by hand.",
              ],
              [
                "Make a brief",
                "Turns the script into a production brief for a UGC creator, editor, designer or actor: concept, voiceover, shot list, b-roll, editing, music, assets, compliance, alternative hooks, and a scene-by-scene storyboard.",
                "Export it as a Word document to send. Timings are estimates.",
              ],
              [
                "AI images",
                "On any copy or script, press Make AI image prompts. Pick the tool or let Claude recommend one, where the images go (Meta feed, Stories, link ads, website) and 3 or 5 concepts.",
                "Per concept: a ready-to-paste prompt, the exact text to render (only in tools that spell well) or to add in Canva/Figma, layout, sizes, variations to test, plus website use and Meta image rules. The AI images tab compares the tools: GPT Image for finished ads with products, Ideogram for text-heavy designs, Nano Banana for editing real photos, Midjourney for striking visuals, Firefly for the safest licensing, Flux for photoreal products. Georgian words: add them in a design tool.",
              ],
              [
                "AI video",
                "Write a script of the type “AI-generated video script” (or any video script), then press Make AI video prompts. Pick the tool or let Claude recommend one, and the aspect ratio.",
                "You get the tool and settings, a style and character sheet, a ready-to-paste prompt per shot (Copy prompt), the voiceover plan, editing steps and AI-ad compliance points. The AI video tab compares the tools: an AI presenter (HeyGen, Arcads) for someone talking to camera; a generator (Veo, Runway, Kling, Sora) for scenes and product shots. For Georgian voiceover, add it in editing.",
              ],
            ]}
          />
          <p>
            <strong>Use my Claude subscription instead.</strong> In any of these dialogs (and Audiences, Awareness and Market
            patterns), the link at the end of the orange notice switches to a free route: Copy the prompt, paste it into a new
            claude.ai chat, then paste Claude&apos;s whole answer back and Import. It is checked and saved exactly like an API run,
            at $0. If it says the format is wrong, ask Claude in the same chat to reply again with only the JSON. Research with
            web search (Voice of Customer, Find my rivals, competitor profiles, product research with the web on) stays on the
            API, because the server has to see which pages were really read.
          </p>
          <p>
            Language: scripts are written in the language you choose in the brief (English, Georgian or Russian); briefs are in
            English with the script&apos;s own lines kept as written. Mark finished pieces <strong>Approved</strong>; Archive hides
            the rest without deleting them.
          </p>
        </Section>

        <Section id="reading" title="Reading the results: labels and checks">
          <p>
            <strong>Every finding has an evidence label</strong>, so you always know what you are looking at:
          </p>
          <Table
            head={["Label", "Means"]}
            rows={[
              ["Verified fact", "Stated on a source that was read (often the brand's own page) or in your material."],
              ["Reported claim", "Something a source says; not independently confirmed."],
              ["Customer statement", "What a customer said."],
              ["AI interpretation", "Claude's reading of the evidence."],
              ["Hypothesis / Recommendation", "An idea to test, not a fact."],
              ["Estimate", "An approximation."],
              ["Unknown", "Not available. It says so rather than inventing something."],
            ]}
          />
          <p>
            <strong>Quote checks (Voice of Customer):</strong> the server looks for each quote in the text of the page it came
            from.
          </p>
          <ul className="grid list-disc gap-1 pl-5">
            <li>
              <span className="font-semibold text-[#0e700e]">Quote found on the page</span>: those exact words are on that page.
              Safe to use as real customer language.
            </li>
            <li>
              <span className="font-semibold text-danger">Not found on the page</span>: the page was read but the words
              aren&apos;t in it. Treat it as a paraphrase.
            </li>
            <li>
              <span className="font-semibold text-[#8a4b00]">Not checked</span>: the page was only seen as a search result, not
              opened. Click the source to confirm before quoting it.
            </li>
            <li>
              <strong>Paraphrase</strong>: a summary of what customers said, not their exact words.
            </li>
          </ul>
          <p>
            <strong>Source links</strong> are blue when the research actually saw that address, and red with “(unverified)”
            when it didn&apos;t. Check red ones before relying on them.
          </p>
          <p>
            <strong>“How this was researched”</strong> (on each result) lists the searches it ran, how many pages it read,
            what it couldn&apos;t reach and the limits it reported. The <strong>Sources</strong> tab lists every page across
            all runs: read, search result only, or could not be read (with the reason).
          </p>
          <p>
            <strong>Sites that block automated readers</strong> (often Amazon, Reddit, Meta, TikTok) show as “could not be
            read”. That is normal. The research says so instead of filling the gap. If a source matters, open it yourself
            and paste what you find into the knowledge base or add an insight by hand.
          </p>
        </Section>

        <Section id="costs" title="What things cost">
          <p>Typical figures on Sonnet 5.5 for a project with a little material. The dialog always shows the real estimate.</p>
          <Table
            head={["Run", "Likely", "At most"]}
            rows={[
              ["Product research, Quick", "≈ $0.10", "≈ $0.48"],
              ["Voice of Customer, Standard", "≈ $0.16", "≈ $0.78"],
              ["Find my rivals, Quick", "≈ $0.09", "≈ $0.42"],
              ["Competitor research, Standard", "≈ $0.15", "≈ $0.76"],
              ["Audiences / Awareness / Market patterns", "≈ $0.03", "≈ $0.13"],
              ["Ad Lab", "$0.03–0.10", "≈ $0.20"],
              ["Any web run at Deep", "≈ $0.20", "≈ $1.20"],
              ["Angles (5)", "≈ $0.06", "≈ $0.20"],
              ["Hooks (10)", "≈ $0.03", "≈ $0.10"],
              ["A script (1 variation)", "≈ $0.04", "≈ $0.20"],
              ["A section rewrite", "≈ $0.01", "≈ $0.05"],
              ["Creative director review", "≈ $0.05", "≈ $0.12"],
              ["Production brief", "≈ $0.05", "≈ $0.15"],
            ]}
          />
          <ul className="grid list-disc gap-1 pl-5">
            <li>
              “At most” is high on web runs because after each search Claude rereads everything gathered so far, and each
              reread is billed. Real runs usually land near the likely figure.
            </li>
            <li>
              Your per-run limit is checked against “at most”. With $1 per run, Deep is refused; raise it to $1.50 to use Deep.
            </li>
            <li>Haiku costs about 1/20 of Sonnet; Opus 2×; Fable 4×.</li>
            <li>
              <Link href="/admin/creative-os/usage" className="text-accent hover:underline">API usage</Link> shows what you&apos;ve
              spent; <Link href="/admin/creative-os/history" className="text-accent hover:underline">Research history</Link>{" "}
              lists every run with its cost. Both are estimates from your price table, not Anthropic&apos;s invoice.
            </li>
          </ul>
        </Section>

        <Section id="errors" title="When something goes wrong">
          <Table
            head={["Message", "What to do"]}
            rows={[
              ["Set a monthly limit and a per-operation limit…", "Set both in Settings."],
              ["This operation could cost up to $X, over your per-operation limit", "Choose a lower depth or effort, a cheaper model, or raise the limit."],
              ["…which would pass the limit (monthly)", "Raise the monthly limit, or wait for next month."],
              ["Add the industry or a product first…", "Fill in the project's industry, or add a product."],
              ["Run Voice of Customer or product research first…", "Audiences and Awareness need research to work from. Run those first."],
              ["Research at least two competitors first", "Market patterns compares profiles; research two competitors."],
              ["The research needed more steps than one call allows", "Billed for what it used. Run again at a lower depth."],
              ["Claude finished without handing over its findings", "Billed for what it used. Run again; it is rare."],
              ["The answer was cut off at the output limit", "Billed. Run again with Low or Medium effort."],
              ["Claude API error 4xx/5xx", "Anthropic refused or failed; recorded at $0. Try again later."],
              ["An operation on this item is already running", "Wait for it to finish. One left hanging by a closed tab clears itself within 10 minutes."],
              ["Cancelled", "A request already sent may still be billed. Research history shows it at its worst case."],
            ]}
          />
          <p>
            If a run fails, its error stays in Research history. Send it to me, and the run&apos;s cost (if any) is shown there
            too.
          </p>
        </Section>

        <Section id="extension" title="Saving ads from the Meta Ad Library (Chrome extension)">
          <p>
            Claude can&apos;t open the Meta Ad Library, so the <strong>CreativeOS Capture</strong> extension saves ads from it
            while you browse: one button per ad, or every ad on screen at once. It reads only the page you&apos;re looking
            at, only when you press a button, and it costs nothing.
          </p>
          <p className="font-semibold">Install it (once, about two minutes)</p>
          <ol className="grid list-decimal gap-1.5 pl-5">
            <li>
              In Chrome, open <code className="rounded bg-surface px-1">chrome://extensions</code> (type it in the address bar).
            </li>
            <li>
              Switch on <strong>Developer mode</strong>, top right.
            </li>
            <li>
              Click <strong>Load unpacked</strong> and choose the folder{" "}
              <code className="rounded bg-surface px-1 break-all">C:\laragon\www\portfolio\extension\creative-os-capture</code>. Leave the
              folder where it is: Chrome runs the extension from there.
            </li>
            <li>
              Click the puzzle-piece icon in Chrome&apos;s toolbar and pin <strong>CreativeOS Capture</strong>, so its icon is
              always visible.
            </li>
          </ol>
          <p className="font-semibold">Connect it</p>
          <ol className="grid list-decimal gap-1.5 pl-5">
            <li>
              Here, open <Link href="/admin/creative-os/settings" className="text-accent hover:underline">Settings</Link> →{" "}
              <strong>Chrome extension</strong> → <strong>Make a connection code</strong> → <strong>Copy</strong>.
            </li>
            <li>
              Click the extension&apos;s icon, paste the code under <strong>Connection code</strong>, press <strong>Connect</strong>.
            </li>
            <li>
              Choose the project the ads go into. Leave Competitor on <strong>Match by advertiser name</strong> to link each ad to
              the tracked competitor with the same name, or pick one.
            </li>
          </ol>
          <p className="font-semibold">Use it</p>
          <ol className="grid list-decimal gap-1.5 pl-5">
            <li>
              Open a competitor&apos;s <strong>Meta Ad Library</strong> link (on the Competitors tab), or any Ad Library search.
            </li>
            <li>
              Each ad gets a blue <strong>Save to CreativeOS</strong> button under its Library ID. A small panel bottom right has{" "}
              <strong>Save all on screen</strong>; scroll first to load more ads.
            </li>
            <li>
              Saved ads appear in the project&apos;s <strong>Ad Lab</strong> with the text, headline, button, landing page, the
              picture (or a video&apos;s first frame), the start date and how many days it has run. Sort by{" "}
              <strong>Longest running</strong>: ads that run for months are usually the ones making money.
            </li>
            <li>
              Saving the same ad again updates it rather than adding a copy. Your own edits (title, transcript, notes) stay.
            </li>
            <li>
              For a video ad, paste what is said into its <strong>Transcript</strong> before pressing Analyze ad.
            </li>
          </ol>
          <p>
            <strong>If the buttons stop appearing or saves fail</strong>, Meta has probably changed the Ad Library page. Save
            the page (Ctrl+S, “Webpage, HTML only”) and send me the file; the fix is usually quick. After any update to the
            extension, click its reload arrow on <code className="rounded bg-surface px-1">chrome://extensions</code>.
          </p>
          <p>
            <strong>Disconnect</strong> in Settings stops the extension saving at once; a new code replaces the old one.
          </p>
        </Section>

        <Section id="transcripts" title="Video transcripts">
          <p>
            Claude can&apos;t hear audio, so video ads are transcribed by <strong>ElevenLabs Scribe</strong>, which handles
            Georgian and English. It costs about <strong>$0.20 per hour of audio</strong>, billed by the second: a 30-second ad
            is about $0.002, and ElevenLabs&apos; free plan includes 4.5 hours. The transcript lands in the ad&apos;s Transcript
            with real timestamps, ready for Analyze ad.
          </p>
          <p className="font-semibold">Set it up (once)</p>
          <ol className="grid list-decimal gap-1.5 pl-5">
            <li>Create a free account at elevenlabs.io.</li>
            <li>
              In ElevenLabs, open your profile → <strong>API Keys</strong> → <strong>Create API key</strong>. If it asks which
              permissions to give, <strong>Speech to Text</strong> is the only one needed. Copy the key.
            </li>
            <li>
              In Vercel → <strong>portfolio</strong> → <strong>Settings → Environment Variables</strong>, add a variable named
              exactly <code className="rounded bg-surface px-1">ELEVENLABS_API_KEY</code> (check every letter), paste the key as
              the value, tick <strong>Production</strong> and <strong>Preview</strong>, and save. Then redeploy (or ask me to).
            </li>
            <li>
              Here, <Link href="/admin/creative-os/settings" className="text-accent hover:underline">Settings</Link> →{" "}
              <strong>Video transcripts</strong> should say the key is found. Tick <strong>Transcribe video ads automatically</strong>{" "}
              if you want every saved video transcribed; otherwise each video ad has a <strong>Transcribe video</strong> button
              showing its cost.
            </li>
          </ol>
          <ul className="grid list-disc gap-1 pl-5">
            <li>
              The extension saves the video&apos;s address only when the page has loaded it. If an ad says no video address was
              saved, play the video for a second in the Ad Library and press Save again.
            </li>
            <li>
              Facebook&apos;s video links expire after some days, so transcribe soon after saving (automatic mode does it at once).
            </li>
            <li>
              Every transcript is in Research history with its cost, and counts against your monthly and per-operation limits.
              A transcript you pasted is never overwritten.
            </li>
            <li>Automatic transcripts can mishear names, prices and brand terms: check those before quoting.</li>
          </ul>
        </Section>

        <Section id="not-yet" title="What it doesn't do yet">
          <ul className="grid list-disc gap-1 pl-5">
            <li>See the video itself: the analysis reads the transcript and the saved picture, not the moving images.</li>
            <li>Adapt a competitor ad&apos;s structure to your product side by side, or plan tests and read performance data: later phases.</li>
            <li>Run anything without your say-so: paid runs wait for your Authorize, except transcripts if you switch automatic transcripts on.</li>
          </ul>
        </Section>
      </div>
    </>
  );
}
