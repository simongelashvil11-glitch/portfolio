import { and, asc, count, desc, eq, sql, type SQL } from "drizzle-orm";
import Link from "next/link";

import { addInsight, deleteInsight, previewResearch, toggleInsightBookmark } from "@/actions/creative-os-research";
import { DeleteForm } from "@/components/admin/delete-form";
import { Pill } from "@/components/admin/stats";
import { Checkbox, EmptyState, Input, inputClass, Textarea } from "@/components/admin/ui";
import { AuthorizeDialog } from "@/components/creative-os/authorize-dialog";
import { CosField, FieldGroup } from "@/components/creative-os/fields";
import { CosForm } from "@/components/creative-os/forms";
import { RunNotes, SourceLinks } from "@/components/creative-os/research-view";
import { Search } from "@/components/fluent-icons";
import { db } from "@/db";
import { cosCompetitors, cosCustomerInsights, cosProducts, cosResearchRuns } from "@/db/creative-os";
import { when } from "@/lib/admin-time";
import { enabledModels } from "@/lib/creative-os/pricing";
import { getProjectOr404 } from "@/lib/creative-os/queries";
import {
  CONFIDENCE,
  depthChoice,
  EVIDENCE_STRENGTH,
  KNOWLEDGE_CHOICE,
  QUOTE_CHECK_LABEL,
  VOC_CATEGORIES,
  VOC_LABEL,
  type VocCategory,
} from "@/lib/creative-os/research-labels";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Voice of Customer" };

export default async function CustomersPage({ params, searchParams }: PageProps<"/admin/creative-os/p/[projectId]/customers">) {
  const project = await getProjectOr404((await params).projectId);
  const query = await searchParams;
  const q = String(query.q ?? "").slice(0, 200).trim();
  const category = VOC_CATEGORIES.includes(query.category as VocCategory) ? (query.category as VocCategory) : null;
  const saved = query.saved === "1";
  const verified = query.verified === "1";
  const base = `/admin/creative-os/p/${project.id}/customers`;

  const conditions: SQL[] = [eq(cosCustomerInsights.projectId, project.id)];
  if (category) conditions.push(eq(cosCustomerInsights.category, category));
  if (saved) conditions.push(eq(cosCustomerInsights.bookmarked, true));
  if (verified) conditions.push(eq(cosCustomerInsights.quoteCheck, "found"));
  if (q) {
    conditions.push(
      sql`to_tsvector('simple', coalesce(${cosCustomerInsights.statement}, '') || ' ' || coalesce(${cosCustomerInsights.interpretation}, '')) @@ websearch_to_tsquery('simple', ${q})`,
    );
  }

  const [insights, byCategory, products, competitors, [lastRun], models] = await Promise.all([
    db
      .select()
      .from(cosCustomerInsights)
      .where(and(...conditions))
      .orderBy(desc(cosCustomerInsights.bookmarked), desc(cosCustomerInsights.createdAt))
      .limit(300),
    db
      .select({ category: cosCustomerInsights.category, value: count() })
      .from(cosCustomerInsights)
      .where(eq(cosCustomerInsights.projectId, project.id))
      .groupBy(cosCustomerInsights.category),
    db.select({ id: cosProducts.id, name: cosProducts.name }).from(cosProducts).where(eq(cosProducts.projectId, project.id)).orderBy(asc(cosProducts.name)),
    db
      .select({ id: cosCompetitors.id, name: cosCompetitors.name })
      .from(cosCompetitors)
      .where(and(eq(cosCompetitors.projectId, project.id), eq(cosCompetitors.status, "tracked")))
      .orderBy(asc(cosCompetitors.name)),
    db
      .select()
      .from(cosResearchRuns)
      .where(and(eq(cosResearchRuns.projectId, project.id), eq(cosResearchRuns.kind, "voc_research")))
      .orderBy(desc(cosResearchRuns.createdAt))
      .limit(1),
    enabledModels(),
  ]);
  const total = byCategory.reduce((sum, row) => sum + row.value, 0);
  const counts = new Map(byCategory.map((row) => [row.category, row.value]));
  const href = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams();
    const current = { q: q || null, category, saved: saved ? "1" : null, verified: verified ? "1" : null, ...changes };
    for (const [key, value] of Object.entries(current)) if (value) next.set(key, value);
    const qs = next.toString();
    return qs ? `${base}?${qs}` : base;
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-2xl text-sm text-muted">
          What real customers say, in their own words, from public reviews and discussions. Quotes are checked against the
          page they came from; anything that could not be checked is marked. Bookmark the lines worth building ads on.
        </p>
        <AuthorizeDialog
          triggerLabel="Research customers"
          title="Voice of Customer research"
          description="Searches public reviews, forums and discussions for pain points, desires, objections, failed solutions, beliefs and the exact language customers use. Each finding is added to this project's bank with its source."
          models={models}
          preview={previewResearch.bind(null, "voc_research", project.id)}
          endpoint="/admin/creative-os/api/research"
          body={{ module: "voc_research", targetId: project.id }}
          choices={[
            {
              name: "focus",
              label: "Focus",
              defaultValue: "all",
              options: [
                { value: "all", label: "The whole category" },
                ...products.map((product) => ({ value: `product:${product.id}`, label: `Product: ${product.name}` })),
                ...competitors.map((competitor) => ({ value: `competitor:${competitor.id}`, label: `Competitor: ${competitor.name}` })),
              ],
            },
            depthChoice(false),
            KNOWLEDGE_CHOICE,
          ]}
          durationHint="usually 1–3 minutes"
        />
      </div>

      <RunNotes run={lastRun} />

      {total > 0 ? (
        <nav aria-label="Categories" className="flex flex-wrap gap-1.5">
          <Pill href={href({ category: null })} active={!category}>
            All <span className="tnum text-faint">{total}</span>
          </Pill>
          {VOC_CATEGORIES.filter((key) => counts.has(key)).map((key) => (
            <Pill key={key} href={href({ category: key })} active={category === key}>
              {VOC_LABEL[key]} <span className="tnum text-faint">{counts.get(key)}</span>
            </Pill>
          ))}
        </nav>
      ) : null}

      {total > 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          <form action={base} className="flex min-w-[18rem] flex-1 gap-2">
            {category ? <input type="hidden" name="category" value={category} /> : null}
            {saved ? <input type="hidden" name="saved" value="1" /> : null}
            {verified ? <input type="hidden" name="verified" value="1" /> : null}
            <label className="relative flex-1">
              <span className="sr-only">Search what customers said</span>
              <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
              <input type="search" name="q" defaultValue={q} placeholder="Search statements and interpretations" className="field pl-9" />
            </label>
            <button type="submit" className="btn btn-secondary">
              Search
            </button>
          </form>
          <Pill href={href({ saved: saved ? null : "1" })} active={saved}>
            Bookmarked
          </Pill>
          <Pill href={href({ verified: verified ? null : "1" })} active={verified}>
            Verified quotes
          </Pill>
          {q || category || saved || verified ? (
            <Link href={base} className="text-sm text-accent hover:underline">
              Clear
            </Link>
          ) : null}
        </div>
      ) : null}

      {total === 0 ? (
        <EmptyState>No customer insights yet. Press Research customers, or add what you already know below.</EmptyState>
      ) : insights.length === 0 ? (
        <EmptyState>Nothing matches these filters.</EmptyState>
      ) : (
        <ul className="grid gap-3">
          {insights.map((insight) => {
            const check = QUOTE_CHECK_LABEL[insight.quoteCheck] ?? QUOTE_CHECK_LABEL.no_page;
            return (
              <li key={insight.id} className="card grid gap-2 p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-[4px] bg-surface px-1.5 py-px font-semibold text-muted">
                    {VOC_LABEL[insight.category as VocCategory] ?? insight.category}
                  </span>
                  {insight.subject ? <span className="text-faint">about {insight.subject}</span> : null}
                  <span className={cn("font-semibold", check.className)} title={check.hint}>
                    {check.label}
                  </span>
                  <span className="ml-auto flex items-center gap-1">
                    <form action={toggleInsightBookmark}>
                      <input type="hidden" name="id" value={insight.id} />
                      <input type="hidden" name="bookmarked" value={insight.bookmarked ? "false" : "true"} />
                      <button
                        type="submit"
                        aria-pressed={insight.bookmarked}
                        className={cn("btn btn-subtle !min-h-7 !px-2 text-xs", insight.bookmarked && "font-semibold text-accent-hover")}
                      >
                        {insight.bookmarked ? "★ Bookmarked" : "☆ Bookmark"}
                      </button>
                    </form>
                    <DeleteForm action={deleteInsight} id={insight.id} compact confirmMessage="Delete this insight?" />
                  </span>
                </div>
                <p className={cn("text-[15px] leading-6", insight.isQuote && "font-medium")}>
                  {insight.isQuote ? `“${insight.statement}”` : insight.statement}
                </p>
                {insight.interpretation ? <p className="text-sm text-muted">{insight.interpretation}</p> : null}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-faint">
                  {insight.sourceUrl ? <SourceLinks sources={[{ url: insight.sourceUrl, seen: insight.sourceSeen || insight.quoteCheck === "manual" }]} /> : null}
                  <span>
                    {insight.confidence} confidence · {insight.evidenceStrength} evidence
                  </span>
                  {insight.frequencyNote ? <span>{insight.frequencyNote}</span> : null}
                  <span>{when(insight.createdAt)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <details className="card p-0">
        <summary className="cursor-pointer select-none p-5 font-semibold">Add an insight yourself</summary>
        <div className="border-t border-line p-5">
          <CosForm action={addInsight} submitLabel="Add insight" resetOnSuccess>
            <input type="hidden" name="projectId" value={project.id} />
            <FieldGroup title="What the customer said">
              <div className="grid gap-4 sm:grid-cols-2">
                <CosField label="Category" name="category">
                  <select name="category" defaultValue="pain_point" className={inputClass}>
                    {VOC_CATEGORIES.map((key) => (
                      <option key={key} value={key}>
                        {VOC_LABEL[key]}
                      </option>
                    ))}
                  </select>
                </CosField>
                <CosField label="About" name="subject" hint="The product, a competitor or the category.">
                  <Input name="subject" />
                </CosField>
              </div>
              <CosField label="Statement" name="statement">
                <Textarea name="statement" rows={3} required />
              </CosField>
              <Checkbox name="isQuote" label="These are the customer's exact words" />
              <CosField label="What it means for the ads" name="interpretation">
                <Textarea name="interpretation" rows={2} />
              </CosField>
              <div className="grid gap-4 sm:grid-cols-3">
                <CosField label="Source link" name="sourceUrl">
                  <Input name="sourceUrl" type="url" placeholder="https://" />
                </CosField>
                <CosField label="Confidence" name="confidence">
                  <select name="confidence" defaultValue="medium" className={inputClass}>
                    {CONFIDENCE.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </CosField>
                <CosField label="Evidence strength" name="evidenceStrength">
                  <select name="evidenceStrength" defaultValue="moderate" className={inputClass}>
                    {EVIDENCE_STRENGTH.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </CosField>
              </div>
            </FieldGroup>
          </CosForm>
        </div>
      </details>
    </div>
  );
}
