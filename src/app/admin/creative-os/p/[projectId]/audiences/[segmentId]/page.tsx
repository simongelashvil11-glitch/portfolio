import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { saveSegment } from "@/actions/creative-os-research";
import { Input, inputClass, Textarea } from "@/components/admin/ui";
import { CosField, FieldGroup } from "@/components/creative-os/fields";
import { CosForm } from "@/components/creative-os/forms";
import { db } from "@/db";
import { cosAudienceSegments, type CosAudienceSegment } from "@/db/creative-os";
import { AWARENESS_LABEL, AWARENESS_STAGES } from "@/lib/creative-os/elements";
import { getProjectOr404 } from "@/lib/creative-os/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audience segment" };

const LISTS: { name: keyof CosAudienceSegment; label: string }[] = [
  { name: "secondaryProblems", label: "Secondary problems" },
  { name: "emotionalMotivations", label: "Emotional motivations" },
  { name: "objections", label: "Purchase objections" },
  { name: "beliefs", label: "Existing beliefs" },
  { name: "previousSolutions", label: "Previous solutions tried" },
  { name: "buyingTriggers", label: "Buying triggers" },
  { name: "relevantBenefits", label: "Relevant product benefits" },
  { name: "recommendedMessaging", label: "Recommended messaging" },
  { name: "recommendedFormats", label: "Recommended formats" },
];

export default async function SegmentPage({ params }: PageProps<"/admin/creative-os/p/[projectId]/audiences/[segmentId]">) {
  const { projectId, segmentId } = await params;
  const project = await getProjectOr404(projectId);
  const isNew = segmentId === "new";
  const [segment] = isNew
    ? []
    : await db
        .select()
        .from(cosAudienceSegments)
        .where(and(eq(cosAudienceSegments.id, Number(segmentId) || 0), eq(cosAudienceSegments.projectId, project.id)))
        .limit(1);
  if (!isNew && !segment) notFound();

  return (
    <div className="grid max-w-3xl gap-6">
      <div>
        <Link href={`/admin/creative-os/p/${project.id}/audiences`} className="text-sm text-accent hover:underline">
          Audiences
        </Link>
        <h2 className="mt-1 text-xl font-semibold leading-7">{segment?.personaName ?? "New segment"}</h2>
        {segment && !segment.edited ? (
          <p className="mt-0.5 text-sm text-muted">Generated from research. Saving marks it as edited, so generating again keeps it.</p>
        ) : null}
      </div>

      <CosForm action={saveSegment} submitLabel={isNew ? "Add segment" : "Save segment"}>
        <input type="hidden" name="projectId" value={project.id} />
        {segment ? <input type="hidden" name="id" value={segment.id} /> : null}
        <FieldGroup title="Who they are">
          <div className="grid gap-4 sm:grid-cols-2">
            <CosField label="Persona name" name="personaName">
              <Input name="personaName" required defaultValue={segment?.personaName} placeholder="The burnt-out new parent" />
            </CosField>
            <CosField label="Awareness stage" name="awarenessStage">
              <select name="awarenessStage" defaultValue={segment?.awarenessStage ?? "unclear"} className={inputClass}>
                {AWARENESS_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {AWARENESS_LABEL[stage]}
                  </option>
                ))}
              </select>
            </CosField>
          </div>
          <CosField label="Situation" name="situation">
            <Textarea name="situation" rows={3} defaultValue={segment?.situation} />
          </CosField>
          <CosField label="Primary problem" name="primaryProblem">
            <Textarea name="primaryProblem" rows={2} defaultValue={segment?.primaryProblem} />
          </CosField>
          <CosField label="Desired transformation" name="desiredTransformation">
            <Textarea name="desiredTransformation" rows={2} defaultValue={segment?.desiredTransformation} />
          </CosField>
        </FieldGroup>

        <FieldGroup title="What drives them" description="One item per line.">
          <div className="grid gap-4 sm:grid-cols-2">
            {LISTS.map((list) => (
              <CosField key={list.name} label={list.label} name={list.name}>
                <Textarea name={list.name} rows={4} defaultValue={((segment?.[list.name] as string[] | undefined) ?? []).join("\n")} />
              </CosField>
            ))}
          </div>
        </FieldGroup>

        <FieldGroup title="Evidence">
          <CosField label="How well the research supports it" name="evidenceNote">
            <Textarea name="evidenceNote" rows={2} defaultValue={segment?.evidenceNote ?? ""} />
          </CosField>
        </FieldGroup>
      </CosForm>
    </div>
  );
}
