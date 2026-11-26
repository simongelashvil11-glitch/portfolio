import { asc, desc, eq } from "drizzle-orm";
import Link from "next/link";

import { addKnowledgeText, deleteKnowledgeItem, importKnowledgeUrl } from "@/actions/creative-os";
import { DeleteForm } from "@/components/admin/delete-form";
import { Card, EmptyState, Input, Textarea } from "@/components/admin/ui";
import { CosField, FieldGroup } from "@/components/creative-os/fields";
import { CosForm } from "@/components/creative-os/forms";
import { KindAndTitle, KnowledgeUpload } from "@/components/creative-os/uploads";
import { ChevronRight, Search } from "@/components/fluent-icons";
import { db } from "@/db";
import { cosKnowledgeItems, cosProducts } from "@/db/creative-os";
import { when } from "@/lib/admin-time";
import { count } from "@/lib/creative-os/format";
import { searchKnowledge } from "@/lib/creative-os/knowledge";
import { KNOWLEDGE_KIND_LABEL } from "@/lib/creative-os/labels";
import { getProjectOr404 } from "@/lib/creative-os/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Knowledge base" };

/** ts_headline marks matches with << >>; turned into <mark> here, never parsed as HTML. */
function Highlighted({ snippet }: { snippet: string }) {
  return (
    <>
      {snippet.split(/(<<.*?>>)/g).map((part, index) =>
        part.startsWith("<<") && part.endsWith(">>") ? (
          <mark key={index} className="rounded-[2px] bg-[#fff1b8] px-0.5 text-foreground">
            {part.slice(2, -2)}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  );
}

export default async function KnowledgePage({ params, searchParams }: PageProps<"/admin/creative-os/p/[projectId]/knowledge">) {
  const project = await getProjectOr404((await params).projectId);
  const query = String((await searchParams).q ?? "").slice(0, 200);
  const base = `/admin/creative-os/p/${project.id}/knowledge`;

  const [items, products, results] = await Promise.all([
    db.select().from(cosKnowledgeItems).where(eq(cosKnowledgeItems.projectId, project.id)).orderBy(desc(cosKnowledgeItems.createdAt)),
    db.select({ id: cosProducts.id, name: cosProducts.name }).from(cosProducts).where(eq(cosProducts.projectId, project.id)).orderBy(asc(cosProducts.name)),
    query ? searchKnowledge(project.id, query) : Promise.resolve([]),
  ]);
  const productName = new Map(products.map((product) => [product.id, product.name]));

  return (
    <div className="grid gap-6">
      <div className="grid max-w-3xl gap-2 text-sm text-muted">
        <p>
          Anything the client gave you: briefs, brand guidelines, product documents, landing pages, testimonials, existing
          scripts. Optional: research works without it, but it gets better with it. Only the text is kept, and adding things
          here is free.
        </p>
        <details className="rounded-[6px] bg-surface px-3 py-2">
          <summary className="cursor-pointer select-none font-semibold text-foreground">Which research reads which type</summary>
          <ul className="mt-2 grid list-disc gap-1 pl-5">
            <li>
              <strong>Product research:</strong> product documentation, product specifications, landing page copy, client brief,
              approved messaging, testimonials, and anything tied to that product.
            </li>
            <li>
              <strong>Voice of Customer and Audiences:</strong> customer research, testimonials, client brief.
            </li>
            <li>
              <strong>The writing tools (angles, hooks, scripts, reviews, briefs):</strong> brand guidelines, tone of voice,
              approved messaging, compliance, existing ad scripts, successful ad examples.
            </li>
            <li>
              <strong>Not read by anything:</strong> internal notes, other.
            </li>
          </ul>
          <p className="mt-2">
            The newest items go first, up to a size cap. Each item sent is listed by name before you authorize, and the
            dialog lets you leave the knowledge base out.
          </p>
        </details>
      </div>

      <form action={base} className="flex max-w-3xl gap-2">
        <label className="relative flex-1">
          <span className="sr-only">Search the knowledge base</span>
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <input type="search" name="q" defaultValue={query} placeholder="Search this project's knowledge" className="field pl-9" />
        </label>
        <button type="submit" className="btn btn-secondary">
          Search
        </button>
        {query ? (
          <Link href={base} className="self-center text-sm text-accent hover:underline">
            Clear
          </Link>
        ) : null}
      </form>

      {query ? (
        <section aria-label="Search results" className="max-w-3xl">
          <h2 className="mb-2 text-base font-semibold leading-[22px]">
            {results.length} {results.length === 1 ? "passage" : "passages"} matching “{query}”
          </h2>
          {results.length === 0 ? (
            <p className="text-sm text-muted">Nothing matched. Search looks for whole words.</p>
          ) : (
            <ul className="grid gap-2">
              {results.map((result) => (
                <li key={result.id} className="rounded-[6px] border border-line px-3 py-2.5 text-sm">
                  <p className="text-xs text-faint">
                    {result.title} · {KNOWLEDGE_KIND_LABEL[result.kind as keyof typeof KNOWLEDGE_KIND_LABEL] ?? result.kind}
                  </p>
                  <p className="mt-1 text-muted">
                    <Highlighted snippet={result.snippet} />
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section aria-label="Saved knowledge" className="max-w-3xl">
        <h2 className="mb-2 text-base font-semibold leading-[22px]">Saved ({items.length})</h2>
        {items.length === 0 ? (
          <EmptyState>Nothing saved yet. Paste text, import a page or upload a document below.</EmptyState>
        ) : (
          <ul className="grid gap-2">
            {items.map((item) => (
              <li key={item.id}>
                <Card className="p-0">
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                      <ChevronRight className="mt-0.5 size-4 shrink-0 text-faint transition-transform group-open:rotate-90" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{item.title}</span>
                        <span className="block text-xs text-faint">
                          {KNOWLEDGE_KIND_LABEL[item.kind as keyof typeof KNOWLEDGE_KIND_LABEL] ?? item.kind}
                          {item.productId ? ` · ${productName.get(item.productId) ?? "product"}` : ""} · {count(item.charCount)} characters ·{" "}
                          {item.sourceType === "url" ? "web page" : item.sourceType === "file" ? item.fileName : "pasted"} · {when(item.createdAt)}
                        </span>
                      </span>
                    </summary>
                    <div className="grid gap-3 border-t border-line px-4 py-3">
                      {item.sourceUrl ? (
                        <a href={item.sourceUrl} target="_blank" rel="noreferrer noopener" className="truncate text-xs text-accent hover:underline">
                          {item.sourceUrl}
                        </a>
                      ) : null}
                      <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-[4px] bg-surface-alt p-3 font-sans text-sm text-muted">
                        {item.content.slice(0, 20000)}
                        {item.content.length > 20000 ? "\n\n… (showing the first 20,000 characters)" : ""}
                      </pre>
                      <div className="flex items-center gap-2 text-sm text-muted">
                        Delete this item
                        <DeleteForm action={deleteKnowledgeItem} id={item.id} confirmMessage={`Delete "${item.title}"?`} />
                      </div>
                    </div>
                  </details>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid max-w-3xl gap-4">
        <FieldGroup title="Paste text">
          <CosForm action={addKnowledgeText} submitLabel="Add" resetOnSuccess>
            <input type="hidden" name="projectId" value={project.id} />
            <KindAndTitle products={products} />
            <CosField label="Text" name="content">
              <Textarea name="content" rows={6} required />
            </CosField>
          </CosForm>
        </FieldGroup>

        <FieldGroup title="Import a web page" description="Read by this site's server directly: no AI and no cost. Pages that need a login or a browser to load may come back empty.">
          <CosForm action={importKnowledgeUrl} submitLabel="Import page" pendingLabel="Reading the page…" resetOnSuccess>
            <input type="hidden" name="projectId" value={project.id} />
            <CosField label="Address" name="url">
              <Input name="url" type="url" required placeholder="https://" />
            </CosField>
            <KindAndTitle products={products} />
          </CosForm>
        </FieldGroup>

        <FieldGroup title="Upload a document">
          <KnowledgeUpload projectId={project.id} products={products} />
        </FieldGroup>
      </div>
    </div>
  );
}
