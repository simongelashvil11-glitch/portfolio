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
  ["reading", "Reading the results: labels and checks"],
  ["costs", "What things cost"],
  ["errors", "When something goes wrong"],
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
        </Section>

        <Section id="project-fields" title="Filling in a project (and what to do when you don't know)">
          <p>
            Only the name is required. On the form, each field has a tag: <strong>Used by research</strong> (sent to Claude
            with every run, so it shapes results), <strong>For later tools</strong> (saved now, used by the copywriting tools
            in a later phase) or <strong>Private</strong> (never sent). An empty field is never a problem: research simply
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
                "The first country sets where searches run from and the Ad Library country on competitor links.",
                "For your US employer: “United States”.",
              ],
              ["Target languages", "Context. Results come back in English.", "“English”, or leave empty."],
              ["Advertising platforms", "Context for the research.", "“Meta”, or leave empty."],
              ["Target audience", "What the client says about their buyers.", "Leave empty. Voice of Customer and Audiences find it from real customers."],
              ["Marketing objectives", "What the ads are for; context for the research.", "Leave empty, or one line such as “first orders from cold traffic”."],
              ["Brand voice", "Not sent to research. For the copywriting tools later.", "Leave empty until the client shares guidelines."],
              ["Client instructions", "Not sent to research. For briefs and copy later.", "Leave empty."],
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
              Audiences. Brand guidelines, tone of voice, compliance and ad scripts are kept for the copywriting tools later.
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

        <Section id="not-yet" title="What it doesn't do yet">
          <ul className="grid list-disc gap-1 pl-5">
            <li>Watch videos or pull ads from ad libraries: paste transcripts, and open the Ad Library links yourself.</li>
            <li>Write hooks, scripts, angles or briefs: that is the next phase, and it will use your bookmarks, segments and brand voice.</li>
            <li>Run anything automatically: every paid run waits for your Authorize.</li>
          </ul>
        </Section>
      </div>
    </>
  );
}
