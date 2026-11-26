import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { deleteBrief, setBriefStatus } from "@/actions/creative-os-writing";
import { ConfirmForm } from "@/components/admin/confirm-form";
import { Panel } from "@/components/admin/stats";
import { button } from "@/components/admin/ui";
import { ArrowDownload } from "@/components/fluent-icons";
import { db } from "@/db";
import { cosAiOperations, cosBriefs, cosScripts } from "@/db/creative-os";
import { when } from "@/lib/admin-time";
import { BRIEF_AUDIENCES, SCRIPT_STATUS_LABEL } from "@/lib/creative-os/creative-labels";
import { usd } from "@/lib/creative-os/format";
import { getProjectOr404 } from "@/lib/creative-os/queries";
import type { StoredBrief } from "@/lib/creative-os/research/creative";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Brief" };

function Fact({ label, children }: { label: string; children: ReactNode }) {
  if (!children) return null;
  return (
    <div>
      <dt className="text-xs font-semibold text-faint">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap leading-6">{children}</dd>
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <Panel title={title}>
      <ul className="grid list-disc gap-1 pl-5 text-sm">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </Panel>
  );
}

export default async function BriefPage({ params }: PageProps<"/admin/creative-os/p/[projectId]/briefs/[briefId]">) {
  const { projectId, briefId } = await params;
  const project = await getProjectOr404(projectId);
  const [row] = await db
    .select({ brief: cosBriefs, script: cosScripts.title, cost: cosAiOperations.costUsd })
    .from(cosBriefs)
    .leftJoin(cosScripts, eq(cosScripts.id, cosBriefs.scriptId))
    .leftJoin(cosAiOperations, eq(cosAiOperations.id, cosBriefs.operationId))
    .where(and(eq(cosBriefs.id, Number(briefId) || 0), eq(cosBriefs.projectId, project.id)))
    .limit(1);
  if (!row) notFound();
  const { brief } = row;
  const data = brief.result as StoredBrief;
  const total = data.storyboard.reduce((sum, scene) => sum + (Number(scene.duration_seconds) || 0), 0);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href={`/admin/creative-os/p/${project.id}/briefs`} className="text-sm text-accent hover:underline">
            Briefs
          </Link>
          <h2 className="mt-1 text-xl font-semibold leading-7">{brief.title}</h2>
          <p className="mt-0.5 text-sm text-muted">
            For {BRIEF_AUDIENCES[brief.audience as keyof typeof BRIEF_AUDIENCES] ?? brief.audience}
            {row.script && brief.scriptId ? (
              <>
                {" "}
                · from{" "}
                <Link href={`/admin/creative-os/p/${project.id}/scripts/${brief.scriptId}`} className="text-accent hover:underline">
                  {row.script}
                </Link>
              </>
            ) : null}{" "}
            · {when(brief.createdAt)} · {brief.model} · cost {usd(row.cost)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a href={`/admin/creative-os/api/export/brief/${brief.id}?format=docx`} className="btn btn-primary">
            <ArrowDownload />
            Word document
          </a>
          <a href={`/admin/creative-os/api/export/brief/${brief.id}?format=md`} className="btn btn-secondary">
            Markdown
          </a>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Status:</span>
        {(["draft", "approved", "archived"] as const).map((status) => (
          <form key={status} action={setBriefStatus}>
            <input type="hidden" name="id" value={brief.id} />
            <input type="hidden" name="status" value={status} />
            <button type="submit" aria-pressed={brief.status === status} className={cn("btn", brief.status === status ? "btn-primary" : "btn-secondary")}>
              {SCRIPT_STATUS_LABEL[status]}
            </button>
          </form>
        ))}
      </div>

      <Panel title="The brief">
        <dl className="grid gap-4 text-sm md:grid-cols-2">
          <Fact label="Creative concept">{data.concept}</Fact>
          <Fact label="Campaign objective">{data.objective}</Fact>
          <Fact label="Target audience">{data.target_audience}</Fact>
          <Fact label="Awareness stage">{data.awareness_stage}</Fact>
          <Fact label="Marketing angle">{data.angle}</Fact>
          <Fact label="Core message">{data.core_message}</Fact>
          <Fact label="Hook">{data.hook}</Fact>
          <Fact label="Call to action">{data.cta}</Fact>
          <Fact label="Visual direction">{data.visual_direction}</Fact>
          <Fact label="Product placement">{data.product_placement}</Fact>
          <Fact label="Editing instructions">{data.editing_instructions}</Fact>
          <Fact label="Pacing">{data.pacing}</Fact>
          <Fact label="Music direction">{data.music_direction}</Fact>
        </dl>
      </Panel>

      <Panel title="Voiceover">
        <p className="whitespace-pre-wrap text-[15px] leading-7">{data.voiceover}</p>
      </Panel>

      {data.storyboard.length ? (
        <section aria-labelledby="storyboard" className="grid gap-2">
          <h3 id="storyboard" className="text-base font-semibold leading-[22px]">
            Storyboard <span className="text-sm font-normal text-faint">· about {Math.round(total)} seconds in all; timings are estimates</span>
          </h3>
          <div className="card overflow-x-auto p-0">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="text-xs text-faint">
                <tr className="border-b border-line">
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Scene</th>
                  <th className="px-3 py-2 font-medium">Time</th>
                  <th className="px-3 py-2 font-medium">Voiceover</th>
                  <th className="px-3 py-2 font-medium">Visual</th>
                  <th className="px-3 py-2 font-medium">On-screen text</th>
                  <th className="px-3 py-2 font-medium">Editing</th>
                  <th className="px-3 py-2 font-medium">Purpose</th>
                </tr>
              </thead>
              <tbody>
                {data.storyboard.map((scene, index) => (
                  <tr key={index} className="border-b border-line align-top last:border-0">
                    <td className="tnum px-3 py-2.5 text-faint">{index + 1}</td>
                    <td className="px-3 py-2.5 font-semibold">{scene.scene}</td>
                    <td className="tnum whitespace-nowrap px-3 py-2.5 text-muted">~{scene.duration_seconds}s</td>
                    <td className="px-3 py-2.5">{scene.voiceover}</td>
                    <td className="px-3 py-2.5">{scene.visual}</td>
                    <td className="px-3 py-2.5">{scene.on_screen_text}</td>
                    <td className="px-3 py-2.5 text-muted">{scene.editing_notes}</td>
                    <td className="px-3 py-2.5 text-muted">{scene.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <List title="Shot list" items={data.shot_list} />
        <List title="B-roll" items={data.broll} />
        <List title="On-screen text" items={data.on_screen_text} />
        <List title="Required assets" items={data.required_assets} />
        <List title="Compliance: do not say or show" items={data.compliance_considerations} />
        <List title="Alternative hooks to film" items={data.alternative_hooks} />
      </div>

      <ConfirmForm action={deleteBrief} message={`Delete the brief "${brief.title}"?`}>
        <input type="hidden" name="id" value={brief.id} />
        <input type="hidden" name="projectId" value={project.id} />
        <button type="submit" className={button.danger}>
          Delete brief
        </button>
      </ConfirmForm>
    </div>
  );
}
