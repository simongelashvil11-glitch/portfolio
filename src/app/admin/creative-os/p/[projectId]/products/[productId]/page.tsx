import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { previewResearch } from "@/actions/creative-os-research";
import { EmptyState } from "@/components/admin/ui";
import { AuthorizeDialog } from "@/components/creative-os/authorize-dialog";
import { EvidenceBadge, FindingSection, Limitations, RunMeta, RunNotes, SourceLinks } from "@/components/creative-os/research-view";
import { db } from "@/db";
import { cosAiOperations, cosProductResearch, cosProducts, cosResearchRuns } from "@/db/creative-os";
import { enabledModels } from "@/lib/creative-os/pricing";
import { getProjectOr404 } from "@/lib/creative-os/queries";
import type { StoredProductResult } from "@/lib/creative-os/research/product";
import { depthChoice, KNOWLEDGE_CHOICE, PRODUCT_SECTIONS } from "@/lib/creative-os/research-labels";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/admin/creative-os/p/[projectId]/products/[productId]">) {
  const [product] = await db
    .select({ name: cosProducts.name })
    .from(cosProducts)
    .where(eq(cosProducts.id, Number((await params).productId) || 0))
    .limit(1);
  return { title: product ? `${product.name} — product research` : "Product" };
}

export default async function ProductResearchPage({ params, searchParams }: PageProps<"/admin/creative-os/p/[projectId]/products/[productId]">) {
  const { projectId, productId } = await params;
  const project = await getProjectOr404(projectId);
  const [product] = await db
    .select()
    .from(cosProducts)
    .where(and(eq(cosProducts.id, Number(productId) || 0), eq(cosProducts.projectId, project.id)))
    .limit(1);
  if (!product) notFound();

  const [runs, models] = await Promise.all([
    db
      .select({ research: cosProductResearch, cost: cosAiOperations.costUsd })
      .from(cosProductResearch)
      .leftJoin(cosAiOperations, eq(cosAiOperations.id, cosProductResearch.operationId))
      .where(eq(cosProductResearch.productId, product.id))
      .orderBy(desc(cosProductResearch.createdAt)),
    enabledModels(),
  ]);
  const requested = Number((await searchParams).run);
  const current = runs.find((row) => row.research.id === requested) ?? runs[0] ?? null;
  const result = current ? (current.research.result as StoredProductResult) : null;
  const [notes] = current?.research.operationId
    ? await db.select().from(cosResearchRuns).where(eq(cosResearchRuns.operationId, current.research.operationId)).limit(1)
    : [];
  const base = `/admin/creative-os/p/${project.id}/products/${product.id}`;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href={`/admin/creative-os/p/${project.id}/products`} className="text-sm text-accent hover:underline">
            Products
          </Link>
          <h2 className="mt-1 text-xl font-semibold leading-7">{product.name}</h2>
          <p className="mt-0.5 text-sm text-muted">
            {[product.price, product.url].filter(Boolean).join(" · ") || "Add a product URL so the research can read the product page."}
          </p>
        </div>
        <AuthorizeDialog
          triggerLabel={current ? "Research again" : "Research product"}
          title="Product research"
          description="Features, benefits, mechanism, proof, positioning, objections, offers and pricing, plus a feature-to-benefit matrix. Verified facts are kept apart from marketing ideas, and every sourced finding links to the page it came from."
          models={models}
          preview={previewResearch.bind(null, "product_research", product.id)}
          endpoint="/admin/creative-os/api/research"
          body={{ module: "product_research", targetId: product.id }}
          choices={[depthChoice(true), KNOWLEDGE_CHOICE]}
          durationHint="usually 1–3 minutes with web research"
        />
      </div>

      {!current || !result ? (
        <EmptyState>Not researched yet. Press Research product to choose the depth and model and see the cost first.</EmptyState>
      ) : (
        <>
          <RunMeta
            createdAt={current.research.createdAt}
            model={current.research.model}
            cost={current.cost}
            runs={runs.map((row) => ({ id: row.research.id }))}
            currentId={current.research.id}
            hrefFor={(id) => `${base}?run=${id}`}
          >
            <span>{result.web ? "With web research" : "From your material only"}</span>
          </RunMeta>

          {result.summary ? <p className="max-w-3xl text-[15px] leading-6">{result.summary}</p> : null}

          <section aria-labelledby="matrix" className="grid gap-3">
            <h3 id="matrix" className="text-base font-semibold leading-[22px]">
              Feature-to-benefit matrix
            </h3>
            {result.matrix.length === 0 ? (
              <p className="text-sm text-faint">No features identified.</p>
            ) : (
              <div className="card overflow-x-auto p-0">
                <table className="w-full min-w-[60rem] text-left text-sm">
                  <thead className="text-xs text-faint">
                    <tr className="border-b border-line">
                      <th className="px-4 py-2 font-medium">Feature</th>
                      <th className="px-3 py-2 font-medium">Functional benefit</th>
                      <th className="px-3 py-2 font-medium">Emotional benefit</th>
                      <th className="px-3 py-2 font-medium">Problem addressed</th>
                      <th className="px-3 py-2 font-medium">Advertising message</th>
                      <th className="min-w-[11rem] px-4 py-2 font-medium">Evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.matrix.map((row, index) => (
                      <tr key={index} className="border-b border-line align-top last:border-0">
                        <td className="px-4 py-3 font-semibold">{row.feature}</td>
                        <td className="px-3 py-3">{row.functionalBenefit}</td>
                        <td className="px-3 py-3">{row.emotionalBenefit}</td>
                        <td className="px-3 py-3">{row.problem}</td>
                        <td className="px-3 py-3 italic">{row.adMessage}</td>
                        <td className="grid gap-1 px-4 py-3">
                          <EvidenceBadge type={row.evidenceType} />
                          <span className="text-xs text-muted">{row.evidence}</span>
                          <SourceLinks sources={row.sources} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            {PRODUCT_SECTIONS.map(([key, label]) => (
              <FindingSection key={key} title={label} findings={result.sections[key]} />
            ))}
          </div>

          <Limitations items={result.limitations} />
          <RunNotes run={notes} />
        </>
      )}
    </div>
  );
}
