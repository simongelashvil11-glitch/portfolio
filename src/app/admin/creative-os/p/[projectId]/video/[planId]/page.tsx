import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteVideoPlan, setVideoPlanStatus } from "@/actions/creative-os-writing";
import { ConfirmForm } from "@/components/admin/confirm-form";
import { Panel } from "@/components/admin/stats";
import { button } from "@/components/admin/ui";
import { CopyButton } from "@/components/creative-os/copy-button";
import { ArrowDownload } from "@/components/fluent-icons";
import { db } from "@/db";
import { cosAiOperations, cosScripts, cosVideoPlans } from "@/db/creative-os";
import { when } from "@/lib/admin-time";
import { SCRIPT_STATUS_LABEL, VIDEO_TOOLS, type VideoTool } from "@/lib/creative-os/creative-labels";
import { usd } from "@/lib/creative-os/format";
import { getProjectOr404 } from "@/lib/creative-os/queries";
import type { StoredVideoPlan } from "@/lib/creative-os/research/creative";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "AI video plan" };

/** Everything to paste for one shot, in one block. */
function shotForClipboard(shot: StoredVideoPlan["shots"][number]) {
  return [shot.prompt, shot.negative_prompt ? `Negative prompt: ${shot.negative_prompt}` : null].filter(Boolean).join("\n\n");
}

export default async function VideoPlanPage({ params }: PageProps<"/admin/creative-os/p/[projectId]/video/[planId]">) {
  const { projectId, planId } = await params;
  const project = await getProjectOr404(projectId);
  const [row] = await db
    .select({ plan: cosVideoPlans, script: cosScripts.title, cost: cosAiOperations.costUsd })
    .from(cosVideoPlans)
    .leftJoin(cosScripts, eq(cosScripts.id, cosVideoPlans.scriptId))
    .leftJoin(cosAiOperations, eq(cosAiOperations.id, cosVideoPlans.operationId))
    .where(and(eq(cosVideoPlans.id, Number(planId) || 0), eq(cosVideoPlans.projectId, project.id)))
    .limit(1);
  if (!row) notFound();
  const { plan } = row;
  const data = plan.result as StoredVideoPlan;
  const tool = VIDEO_TOOLS[plan.tool as VideoTool];
  const total = data.shots.reduce((sum, shot) => sum + (Number(shot.duration_seconds) || 0), 0);
  const allPrompts = data.shots.map((shot, index) => `Shot ${index + 1} (${shot.duration_seconds}s): ${shot.shot}\n${shotForClipboard(shot)}`).join("\n\n---\n\n");

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href={`/admin/creative-os/p/${project.id}/video`} className="text-sm text-accent hover:underline">
            AI video
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
          <a href={`/admin/creative-os/api/export/video/${plan.id}?format=docx`} className="btn btn-primary">
            <ArrowDownload />
            Word document
          </a>
          <a href={`/admin/creative-os/api/export/video/${plan.id}?format=md`} className="btn btn-secondary">
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
            {plan.aspect} · {data.shots.length} shots · about {Math.round(total)} seconds
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
        {data.settings ? <p className="text-sm text-muted">Settings: {data.settings}</p> : null}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Style" action={<CopyButton text={data.style_bible} />}>
          <p className="whitespace-pre-wrap text-sm leading-6">{data.style_bible}</p>
        </Panel>
        <Panel title="Keeping the product accurate">
          <p className="whitespace-pre-wrap text-sm leading-6">{data.product_reference}</p>
        </Panel>
      </div>

      {data.characters.length ? (
        <Panel title="Characters (use the same description in every shot)">
          <ul className="grid gap-3">
            {data.characters.map((character, index) => (
              <li key={index} className="flex items-start justify-between gap-3 text-sm">
                <span>
                  <strong>{character.name}:</strong> {character.description}
                </span>
                <CopyButton text={character.description} />
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {data.avatar_script ? (
        <Panel title="Script for the AI presenter" action={<CopyButton text={data.avatar_script} />}>
          <p className="whitespace-pre-wrap text-[15px] leading-7">{data.avatar_script}</p>
        </Panel>
      ) : null}

      <section aria-labelledby="shots" className="grid gap-3">
        <h3 id="shots" className="text-base font-semibold leading-[22px]">
          Shots <span className="text-sm font-normal text-faint">· durations are targets; most tools make 4–8 second clips</span>
        </h3>
        <ol className="grid gap-3">
          {data.shots.map((shot, index) => (
            <li key={index} className="card grid gap-3 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold">
                  <span className="tnum text-faint">{index + 1}</span> {shot.shot}
                  <span className="ml-2 text-sm font-normal text-muted">~{shot.duration_seconds}s · {shot.purpose}</span>
                </span>
                <CopyButton text={shotForClipboard(shot)} label="Copy prompt" />
              </div>
              <p className="whitespace-pre-wrap rounded-[6px] bg-surface px-3 py-2 font-mono text-[13px] leading-6">{shot.prompt}</p>
              {shot.negative_prompt ? <p className="text-xs text-muted">Avoid: {shot.negative_prompt}</p> : null}
              <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ["Camera", shot.camera],
                  ["Audio", shot.audio],
                  ["Voiceover", shot.voiceover],
                  ["On-screen text (add in editing)", shot.on_screen_text],
                  ["Reference images", shot.reference_images],
                  ["Continuity", shot.continuity],
                ]
                  .filter(([, value]) => value && value.trim())
                  .map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs font-semibold text-faint">{label}</dt>
                      <dd className={cn("mt-0.5 leading-5", label === "Voiceover" && "font-medium")}>{value}</dd>
                    </div>
                  ))}
              </dl>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Voiceover">
          <p className="whitespace-pre-wrap text-sm leading-6">{data.voiceover_plan}</p>
          {data.music ? <p className="mt-3 text-sm text-muted">Music: {data.music}</p> : null}
        </Panel>
        <Panel title="Putting it together">
          <ol className="grid list-decimal gap-1 pl-5 text-sm">
            {data.assembly.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
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
          <form key={status} action={setVideoPlanStatus}>
            <input type="hidden" name="id" value={plan.id} />
            <input type="hidden" name="status" value={status} />
            <button type="submit" aria-pressed={plan.status === status} className={cn("btn", plan.status === status ? "btn-primary" : "btn-secondary")}>
              {SCRIPT_STATUS_LABEL[status]}
            </button>
          </form>
        ))}
        <span className="ml-auto">
          <ConfirmForm action={deleteVideoPlan} message={`Delete the plan "${plan.title}"?`}>
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
