import { asc, desc, eq } from "drizzle-orm";
import Link from "next/link";

import { previewResearch, saveAwareness } from "@/actions/creative-os-research";
import { EmptyState, inputClass, Textarea } from "@/components/admin/ui";
import { AuthorizeDialog } from "@/components/creative-os/authorize-dialog";
import { CosField } from "@/components/creative-os/fields";
import { CosForm } from "@/components/creative-os/forms";
import { Limitations, RunMeta, TagList } from "@/components/creative-os/research-view";
import { db } from "@/db";
import { cosAiOperations, cosAudienceSegments, cosAwarenessAnalyses } from "@/db/creative-os";
import { AWARENESS_LABEL, AWARENESS_STAGES, SOPHISTICATION_LEVELS } from "@/lib/creative-os/elements";
import { enabledModels } from "@/lib/creative-os/pricing";
import { getProjectOr404 } from "@/lib/creative-os/queries";
import type { StoredStage } from "@/lib/creative-os/research/strategy";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Awareness and sophistication" };

const SOPHISTICATION_LABEL: Record<string, string> = {
  "1": "1 — First to market: a simple, direct claim works",
  "2": "2 — Bigger claims: enlarge and extend the claim",
  "3": "3 — Claims are tired: introduce a new mechanism",
  "4": "4 — Mechanisms compete: an improved, faster or easier mechanism",
  "5": "5 — Sceptical market: lead with identification and experience",
  unclear: "Unclear from the material",
};

const STAGE_FIELDS: { key: Exclude<keyof StoredStage, "stage" | "hookStyles">; label: string }[] = [
  { key: "customerKnowledge", label: "What they know" },
  { key: "existingBeliefs", label: "What they believe" },
  { key: "mainBarrier", label: "Main psychological barrier" },
  { key: "messaging", label: "Messaging that fits" },
  { key: "adStructure", label: "Ad structure" },
  { key: "proof", label: "Proof that persuades" },
  { key: "cta", label: "Call to action" },
];

export default async function AwarenessPage({ params, searchParams }: PageProps<"/admin/creative-os/p/[projectId]/awareness">) {
  const project = await getProjectOr404((await params).projectId);
  const query = await searchParams;
  const base = `/admin/creative-os/p/${project.id}/awareness`;

  const [analyses, segments, models] = await Promise.all([
    db
      .select({ analysis: cosAwarenessAnalyses, cost: cosAiOperations.costUsd, segment: cosAudienceSegments.personaName })
      .from(cosAwarenessAnalyses)
      .leftJoin(cosAiOperations, eq(cosAiOperations.id, cosAwarenessAnalyses.operationId))
      .leftJoin(cosAudienceSegments, eq(cosAudienceSegments.id, cosAwarenessAnalyses.segmentId))
      .where(eq(cosAwarenessAnalyses.projectId, project.id))
      .orderBy(desc(cosAwarenessAnalyses.createdAt)),
    db
      .select({ id: cosAudienceSegments.id, name: cosAudienceSegments.personaName })
      .from(cosAudienceSegments)
      .where(eq(cosAudienceSegments.projectId, project.id))
      .orderBy(asc(cosAudienceSegments.position)),
    enabledModels(),
  ]);
  const requested = Number(query.run);
  const current = analyses.find((row) => row.analysis.id === requested) ?? analyses[0] ?? null;
  const editing = query.edit === "1" && current;
  const stages = (current?.analysis.stages ?? []) as StoredStage[];
  const dominant = current?.analysis.dominantStage;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-2xl text-sm text-muted">
          Where the market is on Schwartz&apos;s five awareness stages, how sophisticated it is, and what each stage needs from
          an ad. Strategic judgement, not science: adjust anything that does not match what you know.
        </p>
        <AuthorizeDialog
          triggerLabel={current ? "Analyse again" : "Analyse awareness"}
          title="Awareness and sophistication"
          description="Judges the dominant awareness stage and the market's sophistication from the research saved for this project (customer insights, product research, segments and competitor messaging), and works out messaging, hooks, structure, proof and CTA for each stage. No web access."
          models={models}
          preview={previewResearch.bind(null, "awareness_analysis", project.id)}
          endpoint="/admin/creative-os/api/research"
          body={{ module: "awareness_analysis", targetId: project.id }}
          choices={[
            {
              name: "segment",
              label: "For",
              defaultValue: "all",
              options: [{ value: "all", label: "The whole market" }, ...segments.map((segment) => ({ value: String(segment.id), label: segment.name }))],
            },
          ]}
          durationHint="usually 30–90 seconds"
        />
      </div>

      {!current ? (
        <EmptyState>Not analysed yet. It works best after Voice of Customer and competitor research.</EmptyState>
      ) : editing ? (
        <CosForm action={saveAwareness} submitLabel="Save adjustments">
          <input type="hidden" name="id" value={current.analysis.id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <CosField label="Dominant awareness stage" name="dominantStage">
              <select name="dominantStage" defaultValue={current.analysis.dominantStage} className={inputClass}>
                {AWARENESS_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {AWARENESS_LABEL[stage]}
                  </option>
                ))}
              </select>
            </CosField>
            <CosField label="Market sophistication" name="sophisticationLevel">
              <select name="sophisticationLevel" defaultValue={current.analysis.sophisticationLevel} className={inputClass}>
                {SOPHISTICATION_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {SOPHISTICATION_LABEL[level]}
                  </option>
                ))}
              </select>
            </CosField>
            <CosField label="Why this stage" name="dominantReasoning">
              <Textarea name="dominantReasoning" rows={4} defaultValue={current.analysis.dominantReasoning} />
            </CosField>
            <CosField label="Why this level" name="sophisticationReasoning">
              <Textarea name="sophisticationReasoning" rows={4} defaultValue={current.analysis.sophisticationReasoning} />
            </CosField>
          </div>
          {stages.map((stage) => (
            <fieldset key={stage.stage} className="grid gap-3 rounded-[8px] border border-line p-4">
              <legend className="px-1.5 font-semibold">{AWARENESS_LABEL[stage.stage as keyof typeof AWARENESS_LABEL]}</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {STAGE_FIELDS.map((field) => (
                  <CosField key={field.key} label={field.label} name={`${stage.stage}.${field.key}`}>
                    <Textarea name={`${stage.stage}.${field.key}`} rows={2} defaultValue={stage[field.key]} />
                  </CosField>
                ))}
                <CosField label="Hook styles (one per line)" name={`${stage.stage}.hookStyles`}>
                  <Textarea name={`${stage.stage}.hookStyles`} rows={3} defaultValue={stage.hookStyles.join("\n")} />
                </CosField>
              </div>
            </fieldset>
          ))}
          <Link href={`${base}?run=${current.analysis.id}`} className="text-sm text-accent hover:underline">
            Cancel
          </Link>
        </CosForm>
      ) : (
        <>
          <RunMeta
            createdAt={current.analysis.createdAt}
            model={current.analysis.model}
            cost={current.cost}
            runs={analyses.map((row) => ({ id: row.analysis.id }))}
            currentId={current.analysis.id}
            hrefFor={(id) => `${base}?run=${id}`}
          >
            <span>{current.segment ? `For ${current.segment}` : "Whole market"}</span>
            {current.analysis.edited ? <span className="font-semibold text-[#8a4b00]">Adjusted by you</span> : null}
            <Link href={`${base}?run=${current.analysis.id}&edit=1`} className="text-accent hover:underline">
              Adjust
            </Link>
          </RunMeta>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="card grid content-start gap-2 p-5">
              <p className="text-xs font-semibold text-faint">Dominant awareness stage</p>
              <p className="text-lg font-semibold">{AWARENESS_LABEL[dominant as keyof typeof AWARENESS_LABEL] ?? dominant}</p>
              <p className="text-sm leading-6 text-muted">{current.analysis.dominantReasoning}</p>
            </section>
            <section className="card grid content-start gap-2 p-5">
              <p className="text-xs font-semibold text-faint">Market sophistication</p>
              <p className="text-lg font-semibold">{SOPHISTICATION_LABEL[current.analysis.sophisticationLevel] ?? current.analysis.sophisticationLevel}</p>
              <p className="text-sm leading-6 text-muted">{current.analysis.sophisticationReasoning}</p>
            </section>
          </div>

          <ol className="grid gap-3">
            {stages.map((stage, index) => (
              <li
                key={stage.stage}
                className={cn("card grid gap-3 p-5", stage.stage === dominant && "border-accent ring-1 ring-accent")}
              >
                <h3 className="flex flex-wrap items-baseline gap-2 font-semibold">
                  <span className="tnum text-faint">{index + 1}</span>
                  {AWARENESS_LABEL[stage.stage as keyof typeof AWARENESS_LABEL]}
                  {stage.stage === dominant ? (
                    <span className="rounded-[4px] bg-accent-soft px-1.5 py-px text-[11px] text-accent-hover">Where most of the market is</span>
                  ) : null}
                </h3>
                <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  {STAGE_FIELDS.map((field) => (
                    <div key={field.key}>
                      <dt className="text-xs font-semibold text-faint">{field.label}</dt>
                      <dd className="mt-0.5 leading-5">{stage[field.key] || "—"}</dd>
                    </div>
                  ))}
                  <div>
                    <dt className="text-xs font-semibold text-faint">Hook styles</dt>
                    <dd className="mt-0.5 leading-5">
                      <TagList items={stage.hookStyles} />
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ol>

          <Limitations items={current.analysis.limitations} />
        </>
      )}
    </div>
  );
}
