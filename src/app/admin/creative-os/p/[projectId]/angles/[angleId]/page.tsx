import { and, desc, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { previewResearch } from "@/actions/creative-os-research";
import { deleteAngle, saveAngle, setAngleStatus } from "@/actions/creative-os-writing";
import { ConfirmForm } from "@/components/admin/confirm-form";
import { Panel } from "@/components/admin/stats";
import { button } from "@/components/admin/ui";
import { AngleFields } from "@/components/creative-os/angle-fields";
import { AuthorizeDialog, type RunChoice } from "@/components/creative-os/authorize-dialog";
import { CosForm } from "@/components/creative-os/forms";
import { db } from "@/db";
import { cosAngles, cosCustomerInsights, cosHooks } from "@/db/creative-os";
import { ANGLE_STATUS_LABEL, HOOK_CATEGORY_LABEL, type HOOK_CATEGORIES } from "@/lib/creative-os/creative-labels";
import { enabledModels } from "@/lib/creative-os/pricing";
import { getProjectOr404, getWritingChoices } from "@/lib/creative-os/queries";
import { KNOWLEDGE_CHOICE, VOC_LABEL, type VocCategory } from "@/lib/creative-os/research-labels";
import { angleChoice, LANGUAGE_CHOICE, segmentChoice } from "@/lib/creative-os/writing-choices";

export const dynamic = "force-dynamic";
export const metadata = { title: "Angle" };

export default async function AnglePage({ params }: PageProps<"/admin/creative-os/p/[projectId]/angles/[angleId]">) {
  const { projectId, angleId } = await params;
  const project = await getProjectOr404(projectId);
  const base = `/admin/creative-os/p/${project.id}`;
  const isNew = angleId === "new";
  const [angle] = isNew
    ? []
    : await db
        .select()
        .from(cosAngles)
        .where(and(eq(cosAngles.id, Number(angleId) || 0), eq(cosAngles.projectId, project.id)))
        .limit(1);
  if (!isNew && !angle) notFound();

  const [hooks, evidence, choices, models] = angle
    ? await Promise.all([
        db.select().from(cosHooks).where(eq(cosHooks.angleId, angle.id)).orderBy(desc(cosHooks.bookmarked), desc(cosHooks.createdAt)),
        angle.evidenceInsightIds.length
          ? db.select().from(cosCustomerInsights).where(inArray(cosCustomerInsights.id, angle.evidenceInsightIds))
          : Promise.resolve([]),
        getWritingChoices(project.id),
        enabledModels(),
      ])
    : [[], [], null, []];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href={`${base}/angles`} className="text-sm text-accent hover:underline">
            Angles
          </Link>
          <h2 className="mt-1 text-xl font-semibold leading-7">{angle?.name ?? "New angle"}</h2>
          {angle ? (
            <p className="mt-0.5 text-sm text-muted">
              {ANGLE_STATUS_LABEL[angle.status] ?? angle.status}
              {angle.edited ? " · edited by you" : angle.operationId ? " · generated from research" : ""}
            </p>
          ) : null}
        </div>
        {angle && choices ? (
          <div className="flex flex-wrap gap-2">
            {angle.status !== "approved" ? (
              <form action={setAngleStatus}>
                <input type="hidden" name="id" value={angle.id} />
                <input type="hidden" name="status" value="approved" />
                <button type="submit" className="btn btn-secondary">
                  Approve
                </button>
              </form>
            ) : null}
            <Link href={`${base}/scripts/new?angle=${angle.id}`} className="btn btn-secondary">
              Write a script with it
            </Link>
            <AuthorizeDialog
              triggerLabel="Generate hooks"
              title={`Hooks for “${angle.name}”`}
              description="Writes genuinely distinct opening lines for this angle, spread across hook types, grounded in customers' own words, each with its trigger and a visual opening. No web access."
              models={models}
              preview={previewResearch.bind(null, "hook_generation", project.id)}
              endpoint="/admin/creative-os/api/research"
              body={{ module: "hook_generation", targetId: project.id }}
            manual={{ kind: "hook_generation", targetId: project.id }}
              choices={[
                angleChoice(choices.angles.some((item) => item.id === angle.id) ? choices.angles : [...choices.angles, angle], angle.id),
                segmentChoice(choices.segments),
                { name: "count", label: "How many hooks", defaultValue: "10", options: ["5", "10", "15"].map((value) => ({ value, label: value })) },
                LANGUAGE_CHOICE,
                KNOWLEDGE_CHOICE,
              ].filter((choice): choice is RunChoice => choice !== null)}
              durationHint="usually 20–60 seconds"
            />
          </div>
        ) : null}
      </div>

      {angle ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title={`Hooks for this angle (${hooks.length})`}>
            {hooks.length === 0 ? (
              <p className="text-sm text-muted">None yet. Press Generate hooks, or add one in the Hooks tab.</p>
            ) : (
              <ul className="grid gap-2">
                {hooks.slice(0, 12).map((hook) => (
                  <li key={hook.id} className="text-sm">
                    <span className="font-medium">{hook.bookmarked ? "★ " : ""}{hook.text}</span>
                    <span className="block text-xs text-faint">
                      {HOOK_CATEGORY_LABEL[hook.category as (typeof HOOK_CATEGORIES)[number]] ?? hook.category} · {hook.status}
                    </span>
                  </li>
                ))}
                {hooks.length > 12 ? (
                  <li>
                    <Link href={`${base}/hooks?angle=${angle.id}`} className="text-sm text-accent hover:underline">
                      All {hooks.length} hooks
                    </Link>
                  </li>
                ) : null}
              </ul>
            )}
          </Panel>
          <Panel title={`Customer evidence (${evidence.length})`}>
            {evidence.length === 0 ? (
              <p className="text-sm text-muted">No customer insights are cited for this angle.</p>
            ) : (
              <ul className="grid gap-2">
                {evidence.map((insight) => (
                  <li key={insight.id} className="text-sm">
                    <span>{insight.isQuote ? `“${insight.statement}”` : insight.statement}</span>
                    <span className="block text-xs text-faint">
                      {VOC_LABEL[insight.category as VocCategory] ?? insight.category}
                      {insight.quoteCheck === "found" ? " · quote found on the page" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      ) : null}

      <div className="max-w-3xl">
        <CosForm action={saveAngle} submitLabel={isNew ? "Add angle" : "Save angle"}>
          <input type="hidden" name="projectId" value={project.id} />
          {angle ? <input type="hidden" name="id" value={angle.id} /> : null}
          <AngleFields angle={angle} />
        </CosForm>
        {angle ? (
          <div className="mt-6">
            <ConfirmForm action={deleteAngle} message={`Delete the angle "${angle.name}"? Its hooks are kept.`}>
              <input type="hidden" name="id" value={angle.id} />
              <input type="hidden" name="projectId" value={project.id} />
              <button type="submit" className={button.danger}>
                Delete angle
              </button>
            </ConfirmForm>
          </div>
        ) : null}
      </div>
    </div>
  );
}
