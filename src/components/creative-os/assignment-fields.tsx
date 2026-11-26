import { Input, inputClass, Textarea } from "@/components/admin/ui";
import type { CosAssignment } from "@/db/creative-os";

import { CosField, FieldGroup } from "./fields";

const STATUSES = [
  ["open", "Open"],
  ["submitted", "Submitted"],
  ["done", "Done"],
  ["archived", "Archived"],
] as const;

export const ASSIGNMENT_STATUS_LABEL = Object.fromEntries(STATUSES) as Record<string, string>;

export function AssignmentFields({
  assignment,
  projects,
}: {
  assignment?: CosAssignment;
  projects: { id: number; name: string }[];
}) {
  return (
    <div className="grid gap-5">
      <FieldGroup title="The assignment">
        <div className="grid gap-4 sm:grid-cols-2">
          <CosField label="Employer or client" name="client">
            <Input name="client" required defaultValue={assignment?.client} />
          </CosField>
          <CosField label="Title" name="title">
            <Input name="title" required defaultValue={assignment?.title} placeholder="Test task: UGC script for…" />
          </CosField>
          <CosField label="Deadline" name="deadline">
            <Input name="deadline" type="date" defaultValue={assignment?.deadline ?? ""} />
          </CosField>
          <CosField label="Status" name="status">
            <select name="status" defaultValue={assignment?.status ?? "open"} className={inputClass}>
              {STATUSES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </CosField>
          <CosField label="Project" name="projectId" hint="Optional: link it to a project to use that project's products and knowledge." className="sm:col-span-2">
            <select name="projectId" defaultValue={assignment?.projectId ?? ""} className={inputClass}>
              <option value="">None</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </CosField>
        </div>
      </FieldGroup>
      <FieldGroup title="Brief">
        <CosField label="Instructions" name="instructions">
          <Textarea name="instructions" rows={6} defaultValue={assignment?.instructions ?? ""} />
        </CosField>
        <CosField label="Product information" name="productInfo">
          <Textarea name="productInfo" rows={4} defaultValue={assignment?.productInfo ?? ""} />
        </CosField>
        <CosField label="Reference ads" name="referenceAds" hint="Links or transcripts of the ads they pointed you to.">
          <Textarea name="referenceAds" rows={4} defaultValue={assignment?.referenceAds ?? ""} />
        </CosField>
        <CosField label="Required deliverables" name="deliverables">
          <Textarea name="deliverables" rows={3} defaultValue={assignment?.deliverables ?? ""} />
        </CosField>
        <CosField label="Evaluation criteria" name="evaluationCriteria">
          <Textarea name="evaluationCriteria" rows={3} defaultValue={assignment?.evaluationCriteria ?? ""} />
        </CosField>
        <CosField label="Notes" name="notes">
          <Textarea name="notes" rows={3} defaultValue={assignment?.notes ?? ""} />
        </CosField>
      </FieldGroup>
    </div>
  );
}
