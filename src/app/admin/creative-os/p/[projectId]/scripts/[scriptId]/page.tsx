import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { previewResearch } from "@/actions/creative-os-research";
import { deleteScript, restoreScriptVersion, saveScriptBrief, saveScriptVersion, setScriptStatus } from "@/actions/creative-os-writing";
import { ConfirmForm } from "@/components/admin/confirm-form";
import { Panel } from "@/components/admin/stats";
import { button, Input } from "@/components/admin/ui";
import { AuthorizeDialog } from "@/components/creative-os/authorize-dialog";
import { CosForm } from "@/components/creative-os/forms";
import { ReviewView } from "@/components/creative-os/review-view";
import { ScriptBriefFields } from "@/components/creative-os/script-brief-fields";
import { ScriptEditor } from "@/components/creative-os/script-editor";
import { ArrowDownload, ChevronRight } from "@/components/fluent-icons";
import { db } from "@/db";
import { cosAngles, cosBriefs, cosHooks, cosScriptReviews, cosScripts, cosScriptVersions, type ScriptSection } from "@/db/creative-os";
import { when } from "@/lib/admin-time";
import {
  BRIEF_AUDIENCES,
  COPY_KINDS,
  FRAMEWORKS,
  SCRIPT_STATUS_LABEL,
  VIDEO_ASPECTS,
  VIDEO_TOOLS,
  type CopyKind,
  type Framework,
} from "@/lib/creative-os/creative-labels";
import { AWARENESS_LABEL } from "@/lib/creative-os/elements";
import { enabledModels } from "@/lib/creative-os/pricing";
import { getProjectOr404, getWritingChoices } from "@/lib/creative-os/queries";
import type { StoredReview } from "@/lib/creative-os/research/creative";
import { KNOWLEDGE_CHOICE } from "@/lib/creative-os/research-labels";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/admin/creative-os/p/[projectId]/scripts/[scriptId]">) {
  const [script] = await db.select({ title: cosScripts.title }).from(cosScripts).where(eq(cosScripts.id, Number((await params).scriptId) || 0)).limit(1);
  return { title: script?.title ?? "Script" };
}

const SOURCE_LABEL: Record<string, string> = { generated: "Written by Claude", rewrite: "Section rewrite", manual: "Saved by you", restored: "Restored" };

function Compare({ left, right, leftLabel, rightLabel }: { left: ScriptSection[]; right: ScriptSection[]; leftLabel: string; rightLabel: string }) {
  const rows = Math.max(left.length, right.length);
  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-faint">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
      {Array.from({ length: rows }, (_, index) => {
        const a = left[index];
        const b = right[index];
        const changed = (a?.text ?? "") !== (b?.text ?? "") || (a?.label ?? "") !== (b?.label ?? "");
        return (
          <div key={index} className={cn("grid grid-cols-2 gap-3 rounded-[6px] border p-3 text-sm", changed ? "border-[#f9d5a7] bg-[#fff9f2]" : "border-line")}>
            {[a, b].map((section, side) => (
              <div key={side} className="min-w-0">
                {section ? (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">{section.label}</p>
                    <p className="mt-1 whitespace-pre-wrap">{section.text || <span className="text-faint">(empty)</span>}</p>
                    {section.direction ? <p className="mt-1 text-xs text-muted">{section.direction}</p> : null}
                  </>
                ) : (
                  <p className="text-faint">(no section)</p>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default async function ScriptPage({ params, searchParams }: PageProps<"/admin/creative-os/p/[projectId]/scripts/[scriptId]">) {
  const { projectId, scriptId } = await params;
  const project = await getProjectOr404(projectId);
  const query = await searchParams;
  const [script] = await db
    .select()
    .from(cosScripts)
    .where(and(eq(cosScripts.id, Number(scriptId) || 0), eq(cosScripts.projectId, project.id)))
    .limit(1);
  if (!script) notFound();

  const [versions, reviews, briefs, choices, models, [angle], [hook]] = await Promise.all([
    db.select().from(cosScriptVersions).where(eq(cosScriptVersions.scriptId, script.id)).orderBy(desc(cosScriptVersions.number)),
    db.select().from(cosScriptReviews).where(eq(cosScriptReviews.scriptId, script.id)).orderBy(desc(cosScriptReviews.createdAt)),
    db.select({ id: cosBriefs.id, title: cosBriefs.title, audience: cosBriefs.audience, createdAt: cosBriefs.createdAt }).from(cosBriefs).where(eq(cosBriefs.scriptId, script.id)).orderBy(desc(cosBriefs.createdAt)),
    getWritingChoices(project.id),
    enabledModels(),
    script.angleId ? db.select({ id: cosAngles.id, name: cosAngles.name }).from(cosAngles).where(eq(cosAngles.id, script.angleId)).limit(1) : Promise.resolve([]),
    script.hookId ? db.select({ text: cosHooks.text }).from(cosHooks).where(eq(cosHooks.id, script.hookId)).limit(1) : Promise.resolve([]),
  ]);

  const kind = COPY_KINDS[script.kind as CopyKind];
  const video = Boolean(kind?.video);
  const hasText = script.working.some((section) => section.text.trim());
  const base = `/admin/creative-os/p/${project.id}/scripts/${script.id}`;
  const requestedReview = Number(query.review);
  const review = reviews.find((row) => row.id === requestedReview) ?? reviews[0] ?? null;
  const compareId = Number(query.compare) || null;
  const compared = compareId ? (versions.find((version) => version.id === compareId) ?? null) : null;
  const sectionChoices = script.working.map((section, index) => ({ value: String(index), label: `${index + 1}. ${section.label}` }));

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href={`/admin/creative-os/p/${project.id}/scripts`} className="text-sm text-accent hover:underline">
            Scripts and copy
          </Link>
          <h2 className="mt-1 text-xl font-semibold leading-7">{script.title}</h2>
          <p className="mt-0.5 text-sm text-muted">
            {[
              kind?.label ?? script.kind,
              script.platform,
              script.language,
              script.durationSeconds ? `${script.durationSeconds} s target` : null,
              FRAMEWORKS[script.framework as Framework] ? script.framework !== "freeform" ? FRAMEWORKS[script.framework as Framework].split(" (")[0] : null : null,
              SCRIPT_STATUS_LABEL[script.status] ?? script.status,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {angle ? (
              <>
                Angle:{" "}
                <Link href={`/admin/creative-os/p/${project.id}/angles/${angle.id}`} className="text-accent hover:underline">
                  {angle.name}
                </Link>
              </>
            ) : null}
            {hook ? <span className="ml-3">Hook: “{hook.text.slice(0, 80)}”</span> : null}
            {script.awarenessStage ? <span className="ml-3">{AWARENESS_LABEL[script.awarenessStage as keyof typeof AWARENESS_LABEL]}</span> : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AuthorizeDialog
            triggerLabel={hasText || versions.length ? "Write variations" : "Write it"}
            title={`Write: ${script.title}`}
            description="Writes this piece to your brief, from the project's research: product facts, segment, angle, hook, customers' words, brand voice, approved and prohibited claims. Each variation is saved as a version; your current text is kept."
            models={models}
            preview={previewResearch.bind(null, "script_writing", script.id)}
            endpoint="/admin/creative-os/api/research"
            body={{ module: "script_writing", targetId: script.id }}
            choices={[
              { name: "variations", label: "Variations", defaultValue: "1", options: ["1", "2", "3"].map((value) => ({ value, label: value })), hint: "Genuinely different executions, each saved as a version." },
              KNOWLEDGE_CHOICE,
            ]}
            durationHint="usually 30–90 seconds"
          />
          <AuthorizeDialog
            secondary
            triggerLabel="Rewrite a section"
            title="Rewrite one section"
            description="Rewrites only the section you choose, following your instruction, so it still flows with the rest. The result is saved as a new version."
            models={models}
            preview={previewResearch.bind(null, "section_rewrite", script.id)}
            endpoint="/admin/creative-os/api/research"
            body={{ module: "section_rewrite", targetId: script.id }}
            choices={[
              { name: "section", label: "Section", defaultValue: "0", options: sectionChoices },
              { name: "instruction", label: "What to change", defaultValue: "", options: [], text: { placeholder: "Make the hook name the problem in the customer's words; cut it to under 12 words.", maxLength: 600 } },
            ]}
            disabledReason={!hasText ? "Write something first." : null}
            durationHint="usually 10–30 seconds"
          />
          <AuthorizeDialog
            secondary
            triggerLabel="Creative director review"
            title="Creative director review"
            description="A demanding review of the current text against a 19-point rubric (hook, clarity, specificity, proof, objections, CTA, natural language, brand voice, compliance, generic AI patterns…), with exact phrases to fix and compliance flags. It does not rewrite anything."
            models={models}
            preview={previewResearch.bind(null, "script_review", script.id)}
            endpoint="/admin/creative-os/api/research"
            body={{ module: "script_review", targetId: script.id }}
            disabledReason={!hasText ? "Write something first." : null}
            durationHint="usually 40–90 seconds"
          />
          <AuthorizeDialog
            secondary
            triggerLabel="Make a brief"
            title="Production brief"
            description="Turns the current script into a production brief with a scene-by-scene storyboard: voiceover, visuals, on-screen text, shots, b-roll, editing, music, assets and compliance notes."
            models={models}
            preview={previewResearch.bind(null, "brief_generation", script.id)}
            endpoint="/admin/creative-os/api/research"
            body={{ module: "brief_generation", targetId: script.id }}
            choices={[
              {
                name: "audience",
                label: "Who it is for",
                defaultValue: "ugc_creator",
                options: Object.entries(BRIEF_AUDIENCES).map(([value, label]) => ({ value, label })),
              },
            ]}
            disabledReason={!hasText ? "Write the script first." : null}
            durationHint="usually 40–90 seconds"
          />
          {video ? (
            <AuthorizeDialog
              secondary
              triggerLabel="Make AI video prompts"
              title="AI video plan"
              description="Turns the script into what an AI video tool needs: the tool to use and its settings, a style and character sheet, a ready-to-paste prompt for every shot, the voiceover plan, how to put it together, and the compliance points for AI-made ads."
              models={models}
              preview={previewResearch.bind(null, "video_plan", script.id)}
              endpoint="/admin/creative-os/api/research"
              body={{ module: "video_plan", targetId: script.id }}
              choices={[
                {
                  name: "tool",
                  label: "Tool",
                  defaultValue: "recommend",
                  options: [
                    { value: "recommend", label: "Let Claude recommend" },
                    ...Object.entries(VIDEO_TOOLS).map(([value, tool]) => ({ value, label: tool.label })),
                  ],
                },
                {
                  name: "aspect",
                  label: "Aspect ratio",
                  defaultValue: "9:16",
                  options: VIDEO_ASPECTS.map((value) => ({ value, label: value })),
                  hint: "9:16 for Reels, Stories and TikTok; 4:5 or 1:1 for feed; 16:9 for YouTube.",
                },
              ]}
              disabledReason={!hasText ? "Write the script first." : null}
              durationHint="usually 40–90 seconds"
            />
          ) : null}
        </div>
      </div>

      <ScriptEditor key={script.updatedAt.toISOString()} scriptId={script.id} initial={script.working} video={video} />

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-muted">Status:</span>
        {(["draft", "approved", "archived"] as const).map((status) => (
          <form key={status} action={setScriptStatus}>
            <input type="hidden" name="id" value={script.id} />
            <input type="hidden" name="status" value={status} />
            <button type="submit" aria-pressed={script.status === status} className={cn("btn", script.status === status ? "btn-primary" : "btn-secondary")}>
              {SCRIPT_STATUS_LABEL[status]}
            </button>
          </form>
        ))}
        <span className="mx-1 h-5 w-px bg-line" aria-hidden />
        <span className="text-muted">Export:</span>
        {(["docx", "md", "txt"] as const).map((format) => (
          <a key={format} href={`/admin/creative-os/api/export/script/${script.id}?format=${format}`} className="inline-flex items-center gap-1 text-accent hover:underline">
            <ArrowDownload className="size-4" />
            {format === "docx" ? "Word" : format === "md" ? "Markdown" : "Text"}
          </a>
        ))}
      </div>

      <Panel title={`Versions (${versions.length})`}>
        <CosForm action={saveScriptVersion} submitLabel="Save current text as a version" pendingLabel="Saving…" resetOnSuccess className="mb-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="id" value={script.id} />
          <label className="grid min-w-[16rem] flex-1 gap-1">
            <span className="text-xs font-semibold text-muted">Name (optional)</span>
            <Input name="label" placeholder="Before client feedback" />
          </label>
        </CosForm>
        {versions.length === 0 ? (
          <p className="text-sm text-muted">No versions yet. Every AI draft and rewrite is kept here, and you can save your own.</p>
        ) : (
          <ul className="grid gap-2">
            {versions.map((version) => (
              <li key={version.id} className={cn("grid gap-1 rounded-[6px] border px-3 py-2 text-sm", compared?.id === version.id ? "border-accent" : "border-line")}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="tnum font-semibold">v{version.number}</span>
                  <span className="min-w-0 flex-1 truncate">{version.label ?? SOURCE_LABEL[version.source]}</span>
                  <span className="text-xs text-faint">
                    {SOURCE_LABEL[version.source] ?? version.source} · {when(version.createdAt)}
                  </span>
                  <Link href={`${base}?compare=${version.id}#compare`} className="text-accent hover:underline">
                    Compare
                  </Link>
                  <form action={restoreScriptVersion}>
                    <input type="hidden" name="versionId" value={version.id} />
                    <button type="submit" className="text-accent hover:underline">
                      Use this version
                    </button>
                  </form>
                </div>
                {version.note ? <p className="whitespace-pre-wrap text-xs text-muted">{version.note}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {compared ? (
        <section id="compare" className="grid scroll-mt-6 gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-base font-semibold leading-[22px]">Side by side</h3>
            <Link href={base} className="text-sm text-accent hover:underline">
              Close
            </Link>
          </div>
          <Compare left={compared.sections} right={script.working} leftLabel={`v${compared.number}: ${compared.label ?? ""}`} rightLabel="Current text" />
        </section>
      ) : null}

      {review ? (
        <Panel title="Creative director review">
          <p className="-mt-2 mb-4 text-xs text-faint">
            {when(review.createdAt)} · {review.model}
            {JSON.stringify(review.sections) !== JSON.stringify(script.working) ? " · the text has changed since this review" : ""}
            {reviews.length > 1 ? (
              <span className="ml-2">
                Earlier:{" "}
                {reviews.map((row, index) => (
                  <Link key={row.id} href={`${base}?review=${row.id}`} className={row.id === review.id ? "font-semibold text-foreground" : "text-accent hover:underline"}>
                    {reviews.length - index}{" "}
                  </Link>
                ))}
              </span>
            ) : null}
          </p>
          <ReviewView review={review.result as StoredReview} />
        </Panel>
      ) : null}

      {briefs.length ? (
        <Panel title={`Briefs from this script (${briefs.length})`}>
          <ul className="grid gap-1.5 text-sm">
            {briefs.map((brief) => (
              <li key={brief.id}>
                <Link href={`/admin/creative-os/p/${project.id}/briefs/${brief.id}`} className="text-accent hover:underline">
                  {brief.title}
                </Link>
                <span className="ml-2 text-xs text-faint">
                  for {BRIEF_AUDIENCES[brief.audience as keyof typeof BRIEF_AUDIENCES] ?? brief.audience} · {when(brief.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <details className="group rounded-[8px] border border-line">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 font-semibold [&::-webkit-details-marker]:hidden">
          <ChevronRight className="size-4 text-faint transition-transform group-open:rotate-90" />
          Edit the brief
        </summary>
        <div className="grid gap-4 border-t border-line p-5">
          <CosForm action={saveScriptBrief} submitLabel="Save brief">
            <input type="hidden" name="projectId" value={project.id} />
            <input type="hidden" name="id" value={script.id} />
            <ScriptBriefFields script={script} choices={choices} />
          </CosForm>
          <ConfirmForm action={deleteScript} message={`Delete "${script.title}" with all its versions and reviews? This cannot be undone.`}>
            <input type="hidden" name="id" value={script.id} />
            <input type="hidden" name="projectId" value={project.id} />
            <button type="submit" className={button.danger}>
              Delete this script
            </button>
          </ConfirmForm>
        </div>
      </details>
    </div>
  );
}
