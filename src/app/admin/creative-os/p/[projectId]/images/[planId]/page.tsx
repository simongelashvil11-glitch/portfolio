import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteImagePlan, setImagePlanStatus } from "@/actions/creative-os-writing";
import { ConfirmForm } from "@/components/admin/confirm-form";
import { Panel } from "@/components/admin/stats";
import { button } from "@/components/admin/ui";
import { CopyButton } from "@/components/creative-os/copy-button";
import { ArrowDownload } from "@/components/fluent-icons";
import { db } from "@/db";
import { cosAiOperations, cosImagePlans, cosScripts } from "@/db/creative-os";
import { when } from "@/lib/admin-time";
import { IMAGE_FORMATS, IMAGE_TOOLS, SCRIPT_STATUS_LABEL, type ImageFormat, type ImageTool } from "@/lib/creative-os/creative-labels";
import { usd } from "@/lib/creative-os/format";
import { getProjectOr404 } from "@/lib/creative-os/queries";
import type { StoredImagePlan } from "@/lib/creative-os/research/creative";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "AI image plan" };

function conceptForClipboard(concept: StoredImagePlan["concepts"][number]) {
  return [concept.prompt, concept.negative_prompt ? `Negative prompt: ${concept.negative_prompt}` : null].filter(Boolean).join("\n\n");
}

export default async function ImagePlanPage({ params }: PageProps<"/admin/creative-os/p/[projectId]/images/[planId]">) {
  const { projectId, planId } = await params;
  const project = await getProjectOr404(projectId);
  const [row] = await db
    .select({ plan: cosImagePlans, script: cosScripts.title, cost: cosAiOperations.costUsd })
    .from(cosImagePlans)
    .leftJoin(cosScripts, eq(cosScripts.id, cosImagePlans.scriptId))
    .leftJoin(cosAiOperations, eq(cosAiOperations.id, cosImagePlans.operationId))
    .where(and(eq(cosImagePlans.id, Number(planId) || 0), eq(cosImagePlans.projectId, project.id)))
    .limit(1);
  if (!row) notFound();
  const { plan } = row;
  const data = plan.result as StoredImagePlan;
  const tool = IMAGE_TOOLS[plan.tool as ImageTool];
  const format = IMAGE_FORMATS[plan.format as ImageFormat];
  const allPrompts = data.concepts.map((concept, index) => `Concept ${index + 1}: ${concept.name}\n${conceptForClipboard(concept)}`).join("\n\n---\n\n");

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href={`/admin/creative-os/p/${project.id}/images`} className="text-sm text-accent hover:underline">
            AI images
          </Link>
          <h2 className="mt-1 text-xl font-semibold leading-7">{plan.title}</h2>
          <p className="mt-0.5 text-sm text-muted">
            {row.script && plan.scriptId ? (
              <>
                From{" "}
                <Link href={`/admin/creative-os/p/${project.id}/scripts/${plan.scriptId}`} className="text-accent hover:underline">
                  {row.script}
                </Link>{" "}
                ·{" "}
              </>
            ) : null}
            {when(plan.createdAt)} · {plan.model} · cost {usd(row.cost)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CopyButton text={allPrompts} label="Copy all prompts" className="!min-h-8 !px-3 !text-sm" />
          <a href={`/admin/creative-os/api/export/images/${plan.id}?format=docx`} className="btn btn-primary">
            <ArrowDownload />
            Word document
          </a>
          <a href={`/admin/creative-os/api/export/images/${plan.id}?format=md`} className="btn btn-secondary">
            Markdown
          </a>
        </div>
      </div>

      <section className="card grid gap-2 border-accent p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-faint">Make it in</p>
        <p className="text-lg font-semibold">
          {tool ? (
            <a href={tool.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              {tool.label} ↗
            </a>
          ) : (
            plan.tool
          )}
          <span className="ml-3 text-sm font-normal text-muted">
            {format?.label ?? plan.format} · {format?.size} · {data.concepts.length} concepts
          </span>
        </p>
        <p className="max-w-3xl text-sm leading-6">{data.tool_reason}</p>
        {data.alternatives.length ? (
          <ul className="grid list-disc gap-0.5 pl-5 text-sm text-muted">
            {data.alternatives.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Style" action={<CopyButton text={data.style_bible} />}>
          <p className="whitespace-pre-wrap text-sm leading-6">{data.style_bible}</p>
        </Panel>
        <Panel title="Keeping the product accurate">
          <p className="whitespace-pre-wrap text-sm leading-6">{data.product_reference}</p>
        </Panel>
      </div>

      <section aria-labelledby="concepts" className="grid gap-3">
        <h3 id="concepts" className="text-base font-semibold leading-[22px]">
          Concepts
        </h3>
        <ol className="grid gap-3">
          {data.concepts.map((concept, index) => (
            <li key={index} className="card grid gap-3 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold">
                  <span className="tnum text-faint">{index + 1}</span> {concept.name}
                  <span className="ml-2 text-sm font-normal text-muted">{concept.format}</span>
                </span>
                <CopyButton text={conceptForClipboard(concept)} label="Copy prompt" />
              </div>
              <p className="text-sm">{concept.idea}</p>
              <p className="whitespace-pre-wrap rounded-[6px] bg-surface px-3 py-2 font-mono text-[13px] leading-6">{concept.prompt}</p>
              {concept.negative_prompt ? <p className="text-xs text-muted">Avoid: {concept.negative_prompt}</p> : null}
              <div className="grid gap-3 text-sm md:grid-cols-2">
                {concept.text_in_image ? (
                  <div className="rounded-[6px] border border-line p-3">
                    <p className="flex items-center justify-between gap-2 text-xs font-semibold text-faint">
                      Text the tool renders in the image <CopyButton text={concept.text_in_image} />
                    </p>
                    <p className="mt-1 whitespace-pre-wrap font-medium">{concept.text_in_image}</p>
                  </div>
                ) : null}
                {concept.text_overlay ? (
                  <div className="rounded-[6px] border border-line p-3">
                    <p className="flex items-center justify-between gap-2 text-xs font-semibold text-faint">
                      Text to add in Canva or Figma <CopyButton text={concept.text_overlay} />
                    </p>
                    <p className="mt-1 whitespace-pre-wrap font-medium">{concept.text_overlay}</p>
                  </div>
                ) : null}
              </div>
              <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ["Layout", concept.layout],
                  ["Reference images", concept.reference_images],
                  ["Finishing", concept.finishing],
                ]
                  .filter(([, value]) => value && value.trim())
                  .map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs font-semibold text-faint">{label}</dt>
                      <dd className="mt-0.5 leading-5">{value}</dd>
                    </div>
                  ))}
              </dl>
              {concept.variations.length ? (
                <div>
                  <p className="text-xs font-semibold text-faint">Variations to test</p>
                  <ul className="mt-1 grid list-disc gap-0.5 pl-5 text-sm">
                    {concept.variations.map((item, itemIndex) => (
                      <li key={itemIndex}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="On the website">
          <p className="whitespace-pre-wrap text-sm leading-6">{data.website_use}</p>
        </Panel>
        <Panel title="Compliance">
          <ul className="grid list-disc gap-1 pl-5 text-sm">
            {data.compliance.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </Panel>
        <Panel title="Generations and cost">
          <p className="whitespace-pre-wrap text-sm leading-6">{data.cost_and_time}</p>
        </Panel>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Status:</span>
        {(["draft", "approved", "archived"] as const).map((status) => (
          <form key={status} action={setImagePlanStatus}>
            <input type="hidden" name="id" value={plan.id} />
            <input type="hidden" name="status" value={status} />
            <button type="submit" aria-pressed={plan.status === status} className={cn("btn", plan.status === status ? "btn-primary" : "btn-secondary")}>
              {SCRIPT_STATUS_LABEL[status]}
            </button>
          </form>
        ))}
        <span className="ml-auto">
          <ConfirmForm action={deleteImagePlan} message={`Delete the plan "${plan.title}"?`}>
            <input type="hidden" name="id" value={plan.id} />
            <input type="hidden" name="projectId" value={project.id} />
            <button type="submit" className={button.danger}>
              Delete plan
            </button>
          </ConfirmForm>
        </span>
      </div>
    </div>
  );
}
