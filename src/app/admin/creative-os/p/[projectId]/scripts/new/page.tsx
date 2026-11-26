import Link from "next/link";

import { createScript } from "@/actions/creative-os-writing";
import { CosForm } from "@/components/creative-os/forms";
import { ScriptBriefFields } from "@/components/creative-os/script-brief-fields";
import { getProjectOr404, getWritingChoices } from "@/lib/creative-os/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "New script" };

export default async function NewScriptPage({ params, searchParams }: PageProps<"/admin/creative-os/p/[projectId]/scripts/new">) {
  const project = await getProjectOr404((await params).projectId);
  const query = await searchParams;
  const choices = await getWritingChoices(project.id);
  const language = project.targetLanguages.find((item) => ["English", "Georgian", "Russian"].includes(item)) ?? "English";

  return (
    <div className="grid max-w-3xl gap-6">
      <div>
        <Link href={`/admin/creative-os/p/${project.id}/scripts`} className="text-sm text-accent hover:underline">
          Scripts and copy
        </Link>
        <h2 className="mt-1 text-xl font-semibold leading-7">New script or copy</h2>
        <p className="mt-0.5 text-sm text-muted">
          A short brief. Creating it is free and sends nothing anywhere; on the next page you can write it yourself or let
          Claude write it after you see the cost.
        </p>
      </div>
      <CosForm action={createScript} submitLabel="Create" pendingLabel="Creating…">
        <input type="hidden" name="projectId" value={project.id} />
        <ScriptBriefFields
          choices={choices}
          defaults={{ angleId: Number(query.angle) || null, hookId: Number(query.hook) || null, language }}
        />
      </CosForm>
    </div>
  );
}
