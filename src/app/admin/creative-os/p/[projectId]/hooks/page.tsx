import { and, desc, eq, inArray, type SQL } from "drizzle-orm";
import Link from "next/link";

import { previewResearch } from "@/actions/creative-os-research";
import { deleteHook, saveHook, setHookStatus, toggleHookBookmark } from "@/actions/creative-os-writing";
import { DeleteForm } from "@/components/admin/delete-form";
import { Pill } from "@/components/admin/stats";
import { EmptyState, Input, inputClass, Textarea } from "@/components/admin/ui";
import { AuthorizeDialog, type RunChoice } from "@/components/creative-os/authorize-dialog";
import { CosField } from "@/components/creative-os/fields";
import { CosForm } from "@/components/creative-os/forms";
import { db } from "@/db";
import { cosAngles, cosHooks, type CosHook } from "@/db/creative-os";
import { HOOK_CATEGORIES, HOOK_CATEGORY_LABEL, HOOK_STATUSES, HOOK_STATUS_LABEL } from "@/lib/creative-os/creative-labels";
import { AWARENESS_LABEL, AWARENESS_STAGES } from "@/lib/creative-os/elements";
import { enabledModels } from "@/lib/creative-os/pricing";
import { getProjectOr404, getWritingChoices } from "@/lib/creative-os/queries";
import { KNOWLEDGE_CHOICE } from "@/lib/creative-os/research-labels";
import { angleChoice, LANGUAGE_CHOICE, segmentChoice } from "@/lib/creative-os/writing-choices";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hooks" };

type Category = (typeof HOOK_CATEGORIES)[number];

function HookFields({ hook, angles }: { hook?: CosHook; angles: { id: number; name: string }[] }) {
  return (
    <div className="grid gap-3">
      <CosField label="Hook" name="text">
        <Textarea name="text" rows={2} required defaultValue={hook?.text} />
      </CosField>
      <div className="grid gap-3 sm:grid-cols-3">
        <CosField label="Type" name="category">
          <select name="category" defaultValue={hook?.category ?? "problem"} className={inputClass}>
            {HOOK_CATEGORIES.map((key) => (
              <option key={key} value={key}>
                {HOOK_CATEGORY_LABEL[key]}
              </option>
            ))}
          </select>
        </CosField>
        <CosField label="Angle" name="angleId">
          <select name="angleId" defaultValue={hook?.angleId ?? ""} className={inputClass}>
            <option value="">None</option>
            {angles.map((angle) => (
              <option key={angle.id} value={angle.id}>
                {angle.name}
              </option>
            ))}
          </select>
        </CosField>
        <CosField label="Awareness stage" name="awarenessStage">
          <select name="awarenessStage" defaultValue={hook?.awarenessStage ?? "unclear"} className={inputClass}>
            {AWARENESS_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {AWARENESS_LABEL[stage]}
              </option>
            ))}
          </select>
        </CosField>
        <CosField label="Psychological trigger" name="trigger">
          <Input name="trigger" defaultValue={hook?.trigger ?? ""} />
        </CosField>
        <CosField label="Visual opening" name="visualOpening">
          <Input name="visualOpening" defaultValue={hook?.visualOpening ?? ""} />
        </CosField>
        <CosField label="Format" name="format">
          <Input name="format" defaultValue={hook?.format ?? ""} placeholder="UGC, founder, demo…" />
        </CosField>
        <CosField label="Status" name="status">
          <select name="status" defaultValue={hook?.status ?? "draft"} className={inputClass}>
            {HOOK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {HOOK_STATUS_LABEL[status]}
              </option>
            ))}
          </select>
        </CosField>
        <CosField label="Tags" name="tags" hint="Separate with commas.">
          <Input name="tags" defaultValue={(hook?.tags ?? []).join(", ")} />
        </CosField>
        <CosField label="Notes" name="notes">
          <Input name="notes" defaultValue={hook?.notes ?? ""} />
        </CosField>
      </div>
    </div>
  );
}

export default async function HooksPage({ params, searchParams }: PageProps<"/admin/creative-os/p/[projectId]/hooks">) {
  const project = await getProjectOr404((await params).projectId);
  const query = await searchParams;
  const base = `/admin/creative-os/p/${project.id}/hooks`;
  const angleFilter = Number(query.angle) || null;
  const category = HOOK_CATEGORIES.includes(query.category as Category) ? (query.category as Category) : null;
  const saved = query.saved === "1";
  const statusView = query.status === "all" ? "all" : query.status === "rejected" ? "rejected" : "active";

  const conditions: SQL[] = [eq(cosHooks.projectId, project.id)];
  if (angleFilter) conditions.push(eq(cosHooks.angleId, angleFilter));
  if (category) conditions.push(eq(cosHooks.category, category));
  if (saved) conditions.push(eq(cosHooks.bookmarked, true));
  if (statusView === "active") conditions.push(inArray(cosHooks.status, ["draft", "approved"]));
  if (statusView === "rejected") conditions.push(inArray(cosHooks.status, ["rejected", "archived"]));

  const [hooks, allAngles, choices, models] = await Promise.all([
    db.select().from(cosHooks).where(and(...conditions)).orderBy(desc(cosHooks.bookmarked), desc(cosHooks.createdAt)).limit(400),
    db.select({ id: cosAngles.id, name: cosAngles.name }).from(cosAngles).where(eq(cosAngles.projectId, project.id)),
    getWritingChoices(project.id),
    enabledModels(),
  ]);
  const angleName = new Map(allAngles.map((angle) => [angle.id, angle.name]));
  const href = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams();
    const current = {
      angle: angleFilter ? String(angleFilter) : null,
      category,
      saved: saved ? "1" : null,
      status: statusView === "active" ? null : statusView,
      ...changes,
    };
    for (const [key, value] of Object.entries(current)) if (value) next.set(key, value);
    return next.size ? `${base}?${next}` : base;
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-2xl text-sm text-muted">
          Opening lines for ads, by angle and type. Bookmark the strong ones, approve the ones to film, reject the rest. A hook
          used in a script opens it.
        </p>
        <AuthorizeDialog
          triggerLabel="Generate hooks"
          title="Hooks"
          description="Writes genuinely distinct opening lines for the angle you choose, spread across hook types, grounded in customers' own words, each with its trigger and a visual opening. No web access."
          models={models}
          preview={previewResearch.bind(null, "hook_generation", project.id)}
          endpoint="/admin/creative-os/api/research"
          body={{ module: "hook_generation", targetId: project.id }}
            manual={{ kind: "hook_generation", targetId: project.id }}
          choices={[
            angleChoice(choices.angles, angleFilter),
            segmentChoice(choices.segments),
            { name: "count", label: "How many hooks", defaultValue: "10", options: ["5", "10", "15"].map((value) => ({ value, label: value })) },
            LANGUAGE_CHOICE,
            KNOWLEDGE_CHOICE,
          ].filter((choice): choice is RunChoice => choice !== null)}
          durationHint="usually 20–60 seconds"
        />
      </div>

      <div className="grid gap-2">
        <nav aria-label="Status" className="flex flex-wrap gap-1.5">
          <Pill href={href({ status: null })} active={statusView === "active"}>
            Working set
          </Pill>
          <Pill href={href({ status: "rejected" })} active={statusView === "rejected"}>
            Rejected and archived
          </Pill>
          <Pill href={href({ status: "all" })} active={statusView === "all"}>
            All
          </Pill>
          <span className="mx-1 h-5 w-px self-center bg-line" aria-hidden />
          <Pill href={href({ saved: saved ? null : "1" })} active={saved}>
            ★ Bookmarked
          </Pill>
        </nav>
        {choices.angles.length ? (
          <nav aria-label="Angle" className="flex flex-wrap gap-1.5">
            <Pill href={href({ angle: null })} active={!angleFilter}>
              All angles
            </Pill>
            {choices.angles.map((angle) => (
              <Pill key={angle.id} href={href({ angle: String(angle.id) })} active={angleFilter === angle.id}>
                {angle.name}
              </Pill>
            ))}
          </nav>
        ) : null}
        <nav aria-label="Type" className="flex flex-wrap gap-1.5">
          <Pill href={href({ category: null })} active={!category}>
            All types
          </Pill>
          {HOOK_CATEGORIES.map((key) => (
            <Pill key={key} href={href({ category: key })} active={category === key}>
              {HOOK_CATEGORY_LABEL[key]}
            </Pill>
          ))}
        </nav>
      </div>

      {hooks.length === 0 ? (
        <EmptyState>No hooks here yet. Generate them for an angle, or add one below.</EmptyState>
      ) : (
        <ul className="grid gap-3">
          {hooks.map((hook) => (
            <li key={hook.id} className={cn("card grid gap-2 p-4", hook.status === "rejected" && "opacity-70")}>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-[4px] bg-surface px-1.5 py-px font-semibold text-muted">
                  {HOOK_CATEGORY_LABEL[hook.category as Category] ?? hook.category}
                </span>
                {hook.angleId && angleName.get(hook.angleId) ? (
                  <Link href={`/admin/creative-os/p/${project.id}/angles/${hook.angleId}`} className="text-accent hover:underline">
                    {angleName.get(hook.angleId)}
                  </Link>
                ) : null}
                <span className={hook.status === "approved" ? "font-semibold text-[#0e700e]" : "text-faint"}>{HOOK_STATUS_LABEL[hook.status] ?? hook.status}</span>
                <span className="ml-auto flex items-center gap-1">
                  <form action={toggleHookBookmark}>
                    <input type="hidden" name="id" value={hook.id} />
                    <input type="hidden" name="bookmarked" value={hook.bookmarked ? "false" : "true"} />
                    <button type="submit" aria-pressed={hook.bookmarked} className={cn("btn btn-subtle !min-h-7 !px-2 text-xs", hook.bookmarked && "font-semibold text-accent-hover")}>
                      {hook.bookmarked ? "★ Bookmarked" : "☆ Bookmark"}
                    </button>
                  </form>
                  {hook.status !== "approved" ? (
                    <form action={setHookStatus}>
                      <input type="hidden" name="id" value={hook.id} />
                      <input type="hidden" name="status" value="approved" />
                      <button type="submit" className="btn btn-subtle !min-h-7 !px-2 text-xs">
                        Approve
                      </button>
                    </form>
                  ) : null}
                  {hook.status !== "rejected" ? (
                    <form action={setHookStatus}>
                      <input type="hidden" name="id" value={hook.id} />
                      <input type="hidden" name="status" value="rejected" />
                      <button type="submit" className="btn btn-subtle !min-h-7 !px-2 text-xs">
                        Reject
                      </button>
                    </form>
                  ) : null}
                  <DeleteForm action={deleteHook} id={hook.id} compact confirmMessage="Delete this hook?" />
                </span>
              </div>
              <p className="text-[15px] font-medium leading-6">{hook.text}</p>
              <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                {hook.trigger ? <span>Trigger: {hook.trigger}</span> : null}
                {hook.visualOpening ? <span>Opens on: {hook.visualOpening}</span> : null}
                {hook.format ? <span>Format: {hook.format}</span> : null}
                {hook.tags.length ? <span>Tags: {hook.tags.join(", ")}</span> : null}
              </p>
              {hook.supportingResearch ? <p className="text-xs text-faint">Based on: {hook.supportingResearch}</p> : null}
              <div className="flex flex-wrap gap-3 text-sm">
                <Link href={`/admin/creative-os/p/${project.id}/scripts/new?hook=${hook.id}${hook.angleId ? `&angle=${hook.angleId}` : ""}`} className="text-accent hover:underline">
                  Write a script with it
                </Link>
                <details className="w-full">
                  <summary className="cursor-pointer select-none text-accent">Edit</summary>
                  <div className="mt-3">
                    <CosForm action={saveHook} submitLabel="Save hook">
                      <input type="hidden" name="projectId" value={project.id} />
                      <input type="hidden" name="id" value={hook.id} />
                      <HookFields hook={hook} angles={allAngles} />
                    </CosForm>
                  </div>
                </details>
              </div>
            </li>
          ))}
        </ul>
      )}

      <details className="card p-0">
        <summary className="cursor-pointer select-none p-5 font-semibold">Add a hook yourself</summary>
        <div className="border-t border-line p-5">
          <CosForm action={saveHook} submitLabel="Add hook" resetOnSuccess>
            <input type="hidden" name="projectId" value={project.id} />
            <HookFields angles={allAngles} />
          </CosForm>
        </div>
      </details>
    </div>
  );
}
